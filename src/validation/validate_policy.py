"""Phase 3: Policy Validation Engine - deterministic rule check + Claude reasoning.

Loads data/transactions.json (Phase 2 output) and data/policy_rulebook.json,
runs a deterministic check of every transaction against the numeric/keyword
rules that can be verified without judgment calls, then escalates
threshold breaches that have potentially-justifying context to Claude for a
compliant/flagged decision with a plain-English reason.

This module does not write an output file yet - that is a follow-up step.
"""

import json
import logging
import os
import re
import sys
from pathlib import Path

import anthropic

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TRANSACTIONS_PATH = PROJECT_ROOT / "data" / "transactions.json"
RULEBOOK_PATH = PROJECT_ROOT / "data" / "policy_rulebook.json"
RAW_RECEIPTS_PATH = PROJECT_ROOT / "data" / "raw_receipts.json"
VALIDATED_OUTPUT_PATH = PROJECT_ROOT / "data" / "validated_transactions.json"

ALCOHOL_KEYWORDS = [
    "wine", "beer", "whiskey", "champagne", "cocktail",
    "liquor", "vodka", "rum", "gin", "tequila", "brandy",
]
ALCOHOL_PATTERN = re.compile(
    r"\b(" + "|".join(ALCOHOL_KEYWORDS) + r")\b", re.IGNORECASE
)

HIGH_COST_CITY_KEYWORDS = {
    "new york": "NYC", "manhattan": "NYC", "nyc": "NYC",
    "london": "London",
    "tokyo": "Tokyo",
    "dubai": "Dubai",
}

CATEGORY_RULE_ID = {
    "meals": "R-01",
    "lodging": "R-03",
    "airfare": "R-04",
    "ground_transport": "R-05",
    "mileage": "R-06",
    "office_supplies": "R-08",
}

NIGHTS_PATTERN = re.compile(r"(\d+)\s*nights?", re.IGNORECASE)
MILEAGE_RATE_PATTERN = re.compile(r"\$?\s*([\d.]+)\s*/\s*mile", re.IGNORECASE)
MILES_PATTERN = re.compile(r"([\d.]+)\s*miles\b", re.IGNORECASE)

MODEL = "claude-sonnet-5"

# Rules that are non-negotiable per the rulebook notes (e.g. R-02: "not
# reimbursable under any circumstance") are never sent to Claude - a hard
# failure on one of these is flagged immediately, no reasoning pass needed.
NON_NEGOTIABLE_RULE_IDS = {"R-02"}

# Substrings in the raw receipt text that suggest there may be a legitimate
# business justification for an otherwise-breached threshold (a detour, an
# airport transfer, a client dinner, etc.) or that the extraction itself was
# uncertain enough that the "breach" may be an artifact rather than real.
JUSTIFICATION_KEYWORDS = [
    "detour", "traffic", "diversion", "transfer", "airport",
    "client", "entertainment", "business dinner", "party of",
    "board meeting", "conference", "summit",
]
LOW_CONFIDENCE_THRESHOLD = 0.5

REASONING_SYSTEM_PROMPT = """You are a compliance reasoning assistant for an expense \
reimbursement system. You will be given a transaction that broke a numeric policy \
rule, the rule's definition, and the raw receipt context surrounding it.

Decide whether the breach should still be treated as compliant given the context \
(e.g. a legitimate business justification noted on the receipt, or a data-quality \
ambiguity that undermines the rule check itself) or whether it should be flagged for \
human review.

Return ONLY a JSON object with exactly these two fields:
- decision: the string "compliant" or the string "flagged"
- reason: one plain-English sentence explaining the decision

Return only the JSON object - no prose, no markdown code fences."""


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_rule_index(rulebook: dict) -> dict:
    return {rule["rule_id"]: rule for rule in rulebook["rules"]}


def build_submitted_at_index(raw_receipts: dict) -> dict:
    return {r["receipt_id"]: r["submitted_at"] for r in raw_receipts["receipts"]}


def build_raw_text_index(raw_receipts: dict) -> dict:
    return {r["receipt_id"]: r["raw_text"] for r in raw_receipts["receipts"]}


def check_alcohol(txn: dict, rules: dict) -> dict:
    rule = rules["R-02"]
    for item in txn["line_items"]:
        match = ALCOHOL_PATTERN.search(item["description"])
        if match:
            return {
                "rule_id": "R-02",
                "passed": False,
                "detail": (
                    f"line item '{item['description']}' matches alcohol keyword "
                    f"'{match.group(1)}' - {rule['notes']}"
                ),
            }
    return {
        "rule_id": "R-02",
        "passed": True,
        "detail": "no alcohol keywords found in any line item description",
    }


def detect_high_cost_city(vendor: str) -> str | None:
    vendor_lower = vendor.lower()
    for keyword, city in HIGH_COST_CITY_KEYWORDS.items():
        if keyword in vendor_lower:
            return city
    return None


def extract_nights(txn: dict) -> tuple[int, bool]:
    for item in txn["line_items"]:
        match = NIGHTS_PATTERN.search(item["description"])
        if match:
            return int(match.group(1)), True
    return 1, False


def check_lodging_limit(txn: dict, rules: dict) -> dict:
    rule = rules["R-03"]
    nights, nights_found = extract_nights(txn)
    per_night = txn["amount_usd"] / nights
    city = detect_high_cost_city(txn["vendor"])
    cap = 400.0 if city else float(rule["limit"])

    nights_note = (
        f"{nights} night(s) parsed from line items"
        if nights_found
        else f"no night count found in line items - defaulted to {nights} night"
    )
    city_note = f"high-cost city ({city}) cap ${cap:.2f}/night" if city else f"standard city cap ${cap:.2f}/night"

    passed = per_night <= cap
    detail = (
        f"${txn['amount_usd']:.2f} / {nights} night(s) = ${per_night:.2f}/night "
        f"vs {city_note} ({nights_note})"
    )
    return {"rule_id": "R-03", "passed": passed, "detail": detail}


def check_ground_transport_limit(txn: dict, rules: dict) -> dict:
    rule = rules["R-05"]
    limit = float(rule["limit"])
    amount = txn["amount_usd"]
    if amount <= limit:
        return {
            "rule_id": "R-05",
            "passed": True,
            "detail": f"${amount:.2f} <= ${limit:.2f}/ride threshold",
        }
    return {
        "rule_id": "R-05",
        "passed": False,
        "detail": (
            f"${amount:.2f} exceeds ${limit:.2f}/ride threshold - requires a business "
            "justification note per R-05, but the extraction schema does not capture "
            "one, so it is treated as missing/violated"
        ),
    }


def check_mileage_rate(txn: dict, rules: dict) -> dict:
    rule = rules["R-06"]
    limit = float(rule["limit"])

    stated_rate = None
    for item in txn["line_items"]:
        match = MILEAGE_RATE_PATTERN.search(item["description"])
        if match:
            stated_rate = float(match.group(1))
            break

    if stated_rate is None:
        miles = None
        for item in txn["line_items"]:
            match = MILES_PATTERN.search(item["description"])
            if match:
                miles = float(match.group(1))
                break
        if miles and miles > 0:
            stated_rate = txn["amount_usd"] / miles
        else:
            return {
                "rule_id": "R-06",
                "passed": None,
                "detail": "could not determine mileage rate from line item text - skipped",
            }

    passed = stated_rate <= limit + 1e-6
    detail = f"rate ${stated_rate:.3f}/mile vs ${limit:.2f}/mile limit"
    return {"rule_id": "R-06", "passed": passed, "detail": detail}


def check_simple_cap(txn: dict, rules: dict, rule_id: str) -> dict:
    rule = rules[rule_id]
    limit = float(rule["limit"])
    amount = txn["amount_usd"]
    passed = amount <= limit
    detail = f"${amount:.2f} vs ${limit:.2f}/{rule['period']} cap"
    return {"rule_id": rule_id, "passed": passed, "detail": detail}


def check_category_limit(txn: dict, rules: dict) -> dict:
    category = txn["category"]
    rule_id = CATEGORY_RULE_ID.get(category)

    if rule_id == "R-01":
        return check_simple_cap(txn, rules, "R-01")
    if rule_id == "R-03":
        return check_lodging_limit(txn, rules)
    if rule_id == "R-05":
        return check_ground_transport_limit(txn, rules)
    if rule_id == "R-06":
        return check_mileage_rate(txn, rules)
    if rule_id == "R-08":
        return check_simple_cap(txn, rules, "R-08")
    if rule_id == "R-04":
        return {
            "rule_id": "R-04",
            "passed": None,
            "detail": (
                "R-04 has no numeric limit (class-of-service rule) and depends on "
                "flight duration, which is not captured in the extracted record - skipped"
            ),
        }
    return {
        "rule_id": None,
        "passed": None,
        "detail": f"no category-specific rule mapped for category '{category}'",
    }


def check_receipt_required(txn: dict, rules: dict) -> dict:
    rule = rules["R-09"]
    threshold = float(rule["requires_receipt_above"])
    amount = txn["amount_usd"]

    if amount < threshold:
        return {
            "rule_id": "R-09",
            "passed": True,
            "detail": f"${amount:.2f} below ${threshold:.2f} itemized-receipt threshold",
        }

    has_line_items = len(txn["line_items"]) > 0
    detail = (
        f"${amount:.2f} >= ${threshold:.2f} threshold - "
        f"{len(txn['line_items'])} line item(s) present"
    )
    return {"rule_id": "R-09", "passed": has_line_items, "detail": detail}


def check_submission_window(txn: dict, rules: dict, submitted_at_by_id: dict) -> dict:
    rule = rules["R-10"]
    window_days = int(rule["limit"])

    submitted_at_raw = submitted_at_by_id.get(txn["receipt_id"])
    if submitted_at_raw is None:
        return {
            "rule_id": "R-10",
            "passed": None,
            "detail": "no submitted_at found in raw_receipts.json for this receipt_id - skipped",
        }

    from datetime import date, datetime

    submitted_date = datetime.fromisoformat(submitted_at_raw).date()
    txn_date = date.fromisoformat(txn["date"])
    days_elapsed = (submitted_date - txn_date).days

    passed = 0 <= days_elapsed <= window_days
    detail = (
        f"submitted {days_elapsed} day(s) after transaction date "
        f"(limit {window_days} days)"
    )
    return {"rule_id": "R-10", "passed": passed, "detail": detail}


def evaluate_transaction(txn: dict, rules: dict, submitted_at_by_id: dict) -> dict:
    checks = [
        check_alcohol(txn, rules),
        check_category_limit(txn, rules),
        check_receipt_required(txn, rules),
        check_submission_window(txn, rules, submitted_at_by_id),
    ]
    return {
        "receipt_id": txn["receipt_id"],
        "vendor": txn["vendor"],
        "category": txn["category"],
        "amount_usd": txn["amount_usd"],
        "checks": checks,
    }


def has_justifying_context(txn: dict, raw_text: str) -> bool:
    """Whether a rule breach has enough surrounding context to be worth Claude's
    judgment, rather than an automatic flag. Two independent signals:
    - the raw receipt text contains a keyword suggesting a business
      justification (a detour, a client dinner, an airport transfer, ...)
    - the extraction confidence is low enough that the "breach" might be an
      artifact of an uncertain read rather than a real violation
    """
    text_lower = raw_text.lower()
    if any(keyword in text_lower for keyword in JUSTIFICATION_KEYWORDS):
        return True
    if txn["confidence_score"] < LOW_CONFIDENCE_THRESHOLD:
        return True
    return False


def call_claude_reasoning(
    client: anthropic.Anthropic,
    txn: dict,
    failed_checks: list[dict],
    rules: dict,
    raw_text: str,
    logger: logging.Logger,
) -> dict:
    rule_context_lines = []
    for check in failed_checks:
        rule = rules.get(check["rule_id"], {})
        rule_context_lines.append(
            f"- {check['rule_id']} ({rule.get('description', 'n/a')}): "
            f"{check['detail']}. Rule notes: {rule.get('notes', 'n/a')}"
        )
    rule_context = "\n".join(rule_context_lines)

    user_message = (
        f"Transaction {txn['receipt_id']} ({txn['vendor']}, {txn['category']}, "
        f"${txn['amount_usd']:.2f}, extraction confidence {txn['confidence_score']:.2f}) "
        f"failed the following rule check(s):\n{rule_context}\n\n"
        f"Raw receipt text:\n{raw_text}\n\n"
        "Is this compliant or should it be flagged?"
    )

    for attempt in (1, 2):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=512,
                system=REASONING_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            text = next(b.text for b in response.content if b.type == "text").strip()
            if text.startswith("```"):
                text = text.strip("`")
                if text.startswith("json"):
                    text = text[len("json"):].strip()
            result = json.loads(text)
            decision = result["decision"]
            reason = result["reason"]
            if decision not in ("compliant", "flagged"):
                raise ValueError(f"unexpected decision value: {decision!r}")
            return {"decision": decision, "reason": reason, "source": "claude"}
        except Exception as exc:  # noqa: BLE001 - parse/validate/API errors all retry the same way
            logger.warning(
                "Claude reasoning attempt %d/2 failed for %s: %s",
                attempt, txn["receipt_id"], exc,
            )

    logger.warning(
        "Giving up on Claude reasoning for %s after 2 attempts; defaulting to flagged",
        txn["receipt_id"],
    )
    return {
        "decision": "flagged",
        "reason": "Claude reasoning failed after 2 attempts; flagged for human review as a safe default.",
        "source": "claude_fallback",
    }


def decide_transaction(
    txn: dict,
    finding: dict,
    rules: dict,
    raw_text_by_id: dict,
    client: anthropic.Anthropic | None,
    logger: logging.Logger,
) -> dict:
    failed_checks = [c for c in finding["checks"] if c["passed"] is False]

    if not failed_checks:
        return {
            "decision": "compliant",
            "reason": "Within policy limits.",
            "source": "clean",
        }

    hard_failures = [c for c in failed_checks if c["rule_id"] in NON_NEGOTIABLE_RULE_IDS]
    if hard_failures:
        reasons = "; ".join(c["detail"] for c in hard_failures)
        return {
            "decision": "flagged",
            "reason": f"Non-negotiable rule violated: {reasons}",
            "source": "hard_rule",
        }

    raw_text = raw_text_by_id.get(txn["receipt_id"], "")
    if has_justifying_context(txn, raw_text):
        if client is None:
            return {
                "decision": "flagged",
                "reason": (
                    "Threshold breach has potentially-justifying context but "
                    "ANTHROPIC_API_KEY is not set, so no Claude call could be made; "
                    "flagged for human review as a safe default."
                ),
                "source": "claude_unavailable",
            }
        return call_claude_reasoning(client, txn, failed_checks, rules, raw_text, logger)

    reasons = "; ".join(c["detail"] for c in failed_checks)
    return {
        "decision": "flagged",
        "reason": f"Threshold breached with no mitigating context: {reasons}",
        "source": "hard_rule",
    }


def print_findings(findings: list[dict]) -> None:
    for f in findings:
        print(
            f"{f['receipt_id']} | {f['vendor']} | {f['category']} | "
            f"${f['amount_usd']:.2f}"
        )
        for check in f["checks"]:
            if check["passed"] is True:
                status = "PASS"
            elif check["passed"] is False:
                status = "FAIL"
            else:
                status = "SKIP"
            rule_label = check["rule_id"] or "n/a"
            print(f"  {rule_label} [{status}] - {check['detail']}")
        print()


def print_decisions(decisions: list[dict]) -> None:
    for d in decisions:
        print(
            f"{d['receipt_id']} | {d['decision'].upper()} "
            f"({d['source']}) - {d['reason']}"
        )


def build_validated_record(txn: dict, decision: dict) -> dict:
    return {**txn, "decision": decision["decision"], "reason": decision["reason"]}


def write_validated_transactions(records: list[dict]) -> None:
    VALIDATED_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(VALIDATED_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


def print_summary_table(records: list[dict]) -> None:
    columns = ["receipt_id", "category", "amount_usd", "decision", "reason"]
    widths = {col: len(col) for col in columns}
    rows = []
    for r in records:
        reason = r["reason"]
        truncated_reason = reason if len(reason) <= 60 else reason[:57] + "..."
        row = {
            "receipt_id": str(r["receipt_id"]),
            "category": str(r["category"]),
            "amount_usd": f"{r['amount_usd']:.2f}",
            "decision": r["decision"],
            "reason": truncated_reason,
        }
        rows.append(row)
        for col in columns:
            widths[col] = max(widths[col], len(row[col]))

    header = "  ".join(col.ljust(widths[col]) for col in columns)
    print(header)
    print("  ".join("-" * widths[col] for col in columns))
    for row in rows:
        print("  ".join(row[col].ljust(widths[col]) for col in columns))


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    logger = logging.getLogger("validate_policy")

    transactions = load_json(TRANSACTIONS_PATH)
    rulebook = load_json(RULEBOOK_PATH)
    raw_receipts = load_json(RAW_RECEIPTS_PATH)

    rules = build_rule_index(rulebook)
    submitted_at_by_id = build_submitted_at_index(raw_receipts)
    raw_text_by_id = build_raw_text_index(raw_receipts)

    findings = [
        evaluate_transaction(txn, rules, submitted_at_by_id) for txn in transactions
    ]

    print_findings(findings)

    client = None
    if os.environ.get("ANTHROPIC_API_KEY"):
        client = anthropic.Anthropic()
    else:
        logger.warning(
            "ANTHROPIC_API_KEY is not set - any ambiguous cases requiring Claude "
            "reasoning will be flagged for human review as a safe default instead."
        )

    txn_by_id = {t["receipt_id"]: t for t in transactions}
    decisions = []
    for finding in findings:
        txn = txn_by_id[finding["receipt_id"]]
        decision = decide_transaction(txn, finding, rules, raw_text_by_id, client, logger)
        decisions.append({"receipt_id": finding["receipt_id"], **decision})

    print("=== Decisions ===")
    print_decisions(decisions)

    decisions_by_id = {d["receipt_id"]: d for d in decisions}
    validated_records = [
        build_validated_record(txn, decisions_by_id[txn["receipt_id"]])
        for txn in transactions
    ]

    write_validated_transactions(validated_records)
    logger.info(
        "Wrote %d validated records to %s", len(validated_records), VALIDATED_OUTPUT_PATH
    )

    print()
    print("=== Summary ===")
    print_summary_table(validated_records)


if __name__ == "__main__":
    main()
