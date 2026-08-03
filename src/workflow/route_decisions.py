"""Phase 5: Workflow Decision Simulation - routing layer.

Joins Phase 3's validated transactions (decision, reason, amount_usd, ...)
with Phase 4's risk-scored transactions (risk_score, risk_explanation,
is_duplicate, duplicate_of, is_outlier, outlier_ratio) by receipt_id, then
applies data/approval_matrix.json's routing rules in the order they're listed
(first-match-wins) to assign each transaction one of: rejected, auto_approved,
pending_manager_approval, pending_finance_approval.

Each transaction is then matched to its employee's reporting manager (via
data/employee_roster.csv and data/raw_receipts.json, the same join pattern
used in react_controller.py and workflow_agent.py) to attach an approver.

Finally, Claude drafts a one-sentence approval summary for every transaction
- tone depends on routed_status: a factual confirmation for auto_approved,
a rejection notice for rejected, and an actionable briefing for the two
pending_* statuses. All 11 records are written to data/final_decisions.json.
"""

import csv
import json
import logging
import os
from pathlib import Path
from typing import Callable

import anthropic

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VALIDATED_TRANSACTIONS_PATH = PROJECT_ROOT / "data" / "validated_transactions.json"
RISK_SCORED_TRANSACTIONS_PATH = PROJECT_ROOT / "data" / "risk_scored_transactions.json"
APPROVAL_MATRIX_PATH = PROJECT_ROOT / "data" / "approval_matrix.json"
EMPLOYEE_ROSTER_PATH = PROJECT_ROOT / "data" / "employee_roster.csv"
RAW_RECEIPTS_PATH = PROJECT_ROOT / "data" / "raw_receipts.json"
FINAL_DECISIONS_PATH = PROJECT_ROOT / "data" / "final_decisions.json"

MODEL = "claude-sonnet-5"

# Statuses where a human approval action is actually needed. rejected and
# auto_approved are terminal - no one needs to act - but we still attach the
# reporting manager to both for record-keeping.
STATUSES_REQUIRING_ACTION = {"pending_manager_approval", "pending_finance_approval"}


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def join_transactions(validated: list[dict], risk_scored: list[dict]) -> list[dict]:
    """Join Phase 3 and Phase 4 output by receipt_id, and derive
    policy_compliant from Phase 3's decision field.
    """
    risk_by_id = {t["receipt_id"]: t for t in risk_scored}
    joined = []
    for txn in validated:
        rid = txn["receipt_id"]
        risk_record = risk_by_id.get(rid)
        if risk_record is None:
            raise ValueError(f"no risk-scored record found for receipt_id {rid!r}")
        joined.append(
            {
                **txn,
                "risk_score": risk_record["risk_score"],
                "risk_explanation": risk_record["explanation"],
                "policy_compliant": txn["decision"] == "compliant",
                "is_duplicate": risk_record["is_duplicate"],
                "duplicate_of": risk_record["duplicate_of"],
                "is_outlier": risk_record["is_outlier"],
                "outlier_ratio": risk_record["outlier_ratio"],
            }
        )
    return joined


def _is_alcohol_violation(txn: dict) -> bool:
    """The rulebook's condition is category == 'alcohol', but no transaction in
    this dataset carries a top-level category of 'alcohol' - Phase 2/3's
    schema only tracks category at the whole-receipt level (e.g. 'meals'),
    with alcohol detected as a line-item keyword match instead (Phase 3's
    R-02 check). Phase 3's reason text is the only place that fact survives
    into this dataset.

    A bare "alcohol" substring search is NOT safe here: Claude-authored
    reasoning for unrelated flags can mention the word in a negation (e.g.
    RCPT-006's reason literally opens with "Although no alcohol was
    involved..."), which a naive substring check would misfire on. Instead we
    match Phase 3's exact deterministic wording for a true hard-rule R-02
    violation - "Non-negotiable rule violated: ... alcohol keyword ..." -
    which validate_policy.py only ever emits when the line-item keyword scan
    itself fired, never as part of Claude's free-text reasoning.
    """
    reason = txn.get("reason", "").lower()
    return "non-negotiable rule violated" in reason and "alcohol keyword" in reason


# One evaluator per known condition string in approval_matrix.json. Kept as
# explicit predicates rather than a generic expression parser since there are
# only 5 known rules and their exact wording is fixed - a parser would be
# more machinery than the problem needs. The JSON file still drives rule
# ORDER and metadata (route_to, approver_level, notes); this dict only
# supplies the evaluation logic per condition string.
CONDITION_PREDICATES: dict[str, Callable[[dict], bool]] = {
    "policy_compliant == true AND risk_score == 'low' AND amount <= 50": lambda t: (
        t["policy_compliant"] and t["risk_score"] == "low" and t["amount_usd"] <= 50
    ),
    "policy_compliant == true AND risk_score IN ('low','medium') AND amount > 50 AND amount <= 500": lambda t: (
        t["policy_compliant"]
        and t["risk_score"] in ("low", "medium")
        and 50 < t["amount_usd"] <= 500
    ),
    "amount > 500": lambda t: t["amount_usd"] > 500,
    "category == 'alcohol'": _is_alcohol_violation,
    "policy_compliant == false OR risk_score == 'high'": lambda t: (
        not t["policy_compliant"] or t["risk_score"] == "high"
    ),
}


def route_transaction(txn: dict, routing_rules: list[dict]) -> dict:
    for rule in routing_rules:
        condition = rule["condition"]
        predicate = CONDITION_PREDICATES.get(condition)
        if predicate is None:
            raise ValueError(f"no evaluator implemented for condition: {condition!r}")
        if predicate(txn):
            return {
                "routed_status": rule["route_to"],
                "matched_condition": condition,
                "approver_level": rule.get("approver_level"),
            }
    raise ValueError(f"no routing rule matched transaction {txn['receipt_id']!r}")


def route_all(transactions: list[dict], routing_rules: list[dict]) -> list[dict]:
    routed = []
    for txn in transactions:
        routing = route_transaction(txn, routing_rules)
        routed.append({**txn, **routing})
    return routed


# Real finance approver (Omar Haddad, Finance Director), resolved from
# employee_roster.csv like any other approver rather than reusing the
# submitter's direct reporting manager.
FINANCE_APPROVER_ID = "E011"

# Placeholder used only if FINANCE_APPROVER_ID isn't found in the roster
# (e.g. the roster is edited without updating this constant), so finance
# escalations still resolve to something rather than crashing.
FINANCE_TEAM_FALLBACK = {
    "approver_id": "FINANCE-TEAM",
    "approver_name": "Finance Team",
    "approver_email": "finance@meridiancorp.com",
    "approver_resolution_note": None,
}


def load_roster(path: Path) -> dict[str, dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return {row["employee_id"]: row for row in csv.DictReader(f)}


def build_employee_id_by_receipt(raw_receipts: dict) -> dict[str, str]:
    return {r["receipt_id"]: r["employee_id"] for r in raw_receipts["receipts"]}


def resolve_approver(employee_id: str, roster: dict[str, dict]) -> dict:
    """Look up employee_id's manager in the roster and return their approver
    details, or approver_id: None with a clear note if that can't be resolved
    - an unknown employee_id, a missing manager_id (e.g. a top-level exec),
    or a manager_id that itself isn't in the roster.
    """
    employee = roster.get(employee_id)
    if employee is None:
        return {
            "approver_id": None,
            "approver_name": None,
            "approver_email": None,
            "approver_resolution_note": f"employee_id {employee_id!r} not found in employee_roster.csv",
        }

    manager_id = employee.get("manager_id") or None
    if manager_id is None:
        return {
            "approver_id": None,
            "approver_name": None,
            "approver_email": None,
            "approver_resolution_note": (
                f"{employee['name']} ({employee_id}, {employee.get('role', 'unknown role')}) has no "
                "manager_id in the roster - likely the top of the reporting chain."
            ),
        }

    manager = roster.get(manager_id)
    if manager is None:
        return {
            "approver_id": None,
            "approver_name": None,
            "approver_email": None,
            "approver_resolution_note": (
                f"{employee['name']}'s ({employee_id}) manager_id {manager_id!r} does not match "
                "any employee_id in employee_roster.csv."
            ),
        }

    return {
        "approver_id": manager_id,
        "approver_name": manager["name"],
        "approver_email": manager["email"],
        "approver_resolution_note": None,
    }


def resolve_finance_approver(roster: dict[str, dict]) -> dict:
    """Look up FINANCE_APPROVER_ID in the roster and return their approver
    details, falling back to FINANCE_TEAM_FALLBACK only if that employee_id
    isn't present in employee_roster.csv.
    """
    approver = roster.get(FINANCE_APPROVER_ID)
    if approver is None:
        return dict(FINANCE_TEAM_FALLBACK)

    return {
        "approver_id": FINANCE_APPROVER_ID,
        "approver_name": approver["name"],
        "approver_email": approver["email"],
        "approver_resolution_note": None,
    }


def attach_approvers(
    routed: list[dict], employee_id_by_receipt: dict[str, str], roster: dict[str, dict]
) -> list[dict]:
    result = []
    for txn in routed:
        employee_id = employee_id_by_receipt.get(txn["receipt_id"])
        if employee_id is None:
            raise ValueError(f"no employee_id found in raw_receipts.json for {txn['receipt_id']!r}")

        # The submitter - looked up the same way as the approver (roster join
        # by employee_id) but this is the employee who filed the expense, not
        # who approves it. Kept distinct from approver_name even though they
        # can coincide (e.g. a manager's own claim goes to their own manager,
        # who may also be someone else's approver on a different claim).
        employee = roster.get(employee_id)
        employee_name = employee["name"] if employee is not None else None

        # Finance escalations go to the resolved Finance Director, not the
        # submitter's direct manager - approver_level == "direct_manager"
        # (pending_manager_approval) and "none" (rejected/auto_approved,
        # record-keeping only) both still resolve the actual reporting
        # manager as before.
        if txn["approver_level"] == "finance":
            approver = resolve_finance_approver(roster)
        else:
            approver = resolve_approver(employee_id, roster)

        result.append(
            {
                **txn,
                "employee_id": employee_id,
                "employee_name": employee_name,
                **approver,
                "approval_action_required": txn["routed_status"] in STATUSES_REQUIRING_ACTION,
            }
        )
    return result


def print_approver_table(routed: list[dict]) -> None:
    columns = [
        "receipt_id",
        "routed_status",
        "employee_id",
        "employee_name",
        "approver_id",
        "approver_name",
        "approver_email",
        "action_required",
    ]
    str_rows = []
    for t in routed:
        str_rows.append(
            {
                "receipt_id": t["receipt_id"],
                "routed_status": t["routed_status"],
                "employee_id": t["employee_id"] or "NONE",
                "employee_name": t["employee_name"] or "NONE",
                "approver_id": t["approver_id"] or "NONE",
                "approver_name": t["approver_name"] or "NONE",
                "approver_email": t["approver_email"] or "NONE",
                "action_required": str(t["approval_action_required"]),
            }
        )
    widths = {c: max(len(c), *(len(row[c]) for row in str_rows)) for c in columns}

    print("  ".join(c.ljust(widths[c]) for c in columns))
    print("  ".join("-" * widths[c] for c in columns))
    for row in str_rows:
        print("  ".join(row[c].ljust(widths[c]) for c in columns))

    unresolved = [t for t in routed if t["approver_id"] is None]
    if unresolved:
        print("\nUnresolved approvers (explicit null-with-reason):")
        for t in unresolved:
            print(f"  {t['receipt_id']} ({t['employee_id']}): {t['approver_resolution_note']}")

    no_action_with_approver = [
        t for t in routed if not t["approval_action_required"] and t["approver_id"] is not None
    ]
    if no_action_with_approver:
        print(
            "\nRecord-keeping only (rejected/auto_approved - approver attached but no action needed):"
        )
        for t in no_action_with_approver:
            print(
                f"  {t['receipt_id']} ({t['routed_status']}): reporting manager is "
                f"{t['approver_name']} ({t['approver_id']}) - informational only."
            )


SUMMARY_SYSTEM_PROMPT = """You are drafting a one-sentence approval summary for an \
expense reimbursement workflow. You will be given a transaction's vendor, amount, \
category, Phase 3 policy reasoning, Phase 4 risk explanation (if any), its routed \
workflow status, the SUBMITTING EMPLOYEE (who incurred/filed this expense), and the \
result of resolving its APPROVER (a different person who reviews it - either a named \
approver, or a note explaining why no approver could be resolved).

The submitting employee and the approver are almost always two different people - do \
not conflate them. The expense belongs to the submitting employee; the approver is only \
mentioned because they are the one who needs to act (or, for auto_approved/rejected, the \
person kept on record). Never describe the approver as the one who made the purchase or \
incurred the charge.

The finance approver is Omar Haddad, Finance Director - a real named individual, not a \
department. Phrase the sentence exactly as you would for any other named approver (e.g. \
"requires Omar Haddad's review" or "Omar Haddad needs to decide on..."), never as a \
generic "Finance Team" placeholder.

Write EXACTLY ONE sentence a busy approver could read in two seconds and immediately \
understand what's being asked of them, if anything.

Tone depends on routed_status:
- "auto_approved": write it as a factual, already-decided confirmation (e.g. \
"Auto-approved: ..."). Do not ask for a decision - none is needed.
- "rejected": write it as a factual rejection notice explaining why, not a question.
- "pending_manager_approval" or "pending_finance_approval": write it as a concise \
briefing that tells the approver what they need to decide and why, referencing the \
specific policy/risk context.

Critical: if the approver resolution result says no approver could be resolved (approver \
is "None" / null), do NOT write a generic "please review and approve" sentence that \
implies a normal approver exists. Instead, explicitly name the employee, state that no \
approver/manager could be resolved for them, give the specific reason from the \
resolution note, and note that this needs an alternate approval path - even for a \
transaction that would otherwise read as routine.

Return ONLY the single sentence - no prose before or after it, no markdown, no \
surrounding quotation marks."""


def _format_approver_context(txn: dict) -> str:
    if txn["approver_id"] is not None:
        return f"Resolved approver: {txn['approver_name']} ({txn['approver_id']})"
    return f"Approver resolution: FAILED - no approver could be resolved. Reason: {txn['approver_resolution_note']}"


def build_summary_prompt(txn: dict) -> str:
    submitter = txn["employee_name"] or txn["employee_id"]
    return (
        f"Transaction {txn['receipt_id']}: {txn['vendor']}, {txn['category']}, "
        f"${txn['amount_usd']:.2f}.\n"
        f"Submitting employee (incurred this expense): {submitter} ({txn['employee_id']})\n"
        f"Phase 3 policy reasoning ({txn['decision']}): {txn['reason']}\n"
        f"Phase 4 risk assessment ({txn['risk_score']} risk): {txn['risk_explanation']}\n"
        f"Routed status: {txn['routed_status']}\n"
        f"{_format_approver_context(txn)}\n\n"
        "Write the one-sentence approval summary now."
    )


def call_claude_summary(client: anthropic.Anthropic, txn: dict, logger: logging.Logger) -> str:
    user_message = build_summary_prompt(txn)

    for attempt in (1, 2):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=256,
                system=SUMMARY_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            text = next(b.text for b in response.content if b.type == "text").strip()
            if not text:
                raise ValueError("empty response text")
            return text
        except Exception as exc:  # noqa: BLE001 - any failure retries the same way
            logger.warning(
                "Summary generation attempt %d/2 failed for %s: %s", attempt, txn["receipt_id"], exc
            )

    logger.warning(
        "Giving up on summary generation for %s after 2 attempts; using fallback text",
        txn["receipt_id"],
    )
    return f"Summary unavailable (Claude call failed twice) - please review {txn['receipt_id']} manually."


def annotate_summaries(
    transactions: list[dict], client: anthropic.Anthropic | None, logger: logging.Logger
) -> list[dict]:
    summarized = []
    for txn in transactions:
        if client is None:
            summary = (
                f"Summary unavailable (ANTHROPIC_API_KEY not set) - "
                f"please review {txn['receipt_id']} manually."
            )
        else:
            summary = call_claude_summary(client, txn, logger)
        summarized.append({**txn, "summary": summary})
    return summarized


def write_final_decisions(records: list[dict]) -> None:
    FINAL_DECISIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(FINAL_DECISIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


def print_final_summary_table(records: list[dict]) -> None:
    columns = ["receipt_id", "routed_status", "employee_name", "approver_name", "summary"]
    str_rows = []
    for r in records:
        summary = r["summary"]
        truncated = summary if len(summary) <= 60 else summary[:57] + "..."
        str_rows.append(
            {
                "receipt_id": r["receipt_id"],
                "routed_status": r["routed_status"],
                "employee_name": r["employee_name"] or "NONE",
                "approver_name": r["approver_name"] or "NONE",
                "summary": truncated,
            }
        )
    widths = {c: max(len(c), *(len(row[c]) for row in str_rows)) for c in columns}

    print("  ".join(c.ljust(widths[c]) for c in columns))
    print("  ".join("-" * widths[c] for c in columns))
    for row in str_rows:
        print("  ".join(row[c].ljust(widths[c]) for c in columns))


def print_summary_table(routed: list[dict]) -> None:
    columns = ["receipt_id", "decision", "risk_score", "amount_usd", "routed_status"]
    str_rows = []
    for t in routed:
        str_rows.append(
            {
                "receipt_id": t["receipt_id"],
                "decision": t["decision"],
                "risk_score": t["risk_score"],
                "amount_usd": f"{t['amount_usd']:.2f}",
                "routed_status": t["routed_status"],
            }
        )
    widths = {c: max(len(c), *(len(row[c]) for row in str_rows)) for c in columns}

    print("  ".join(c.ljust(widths[c]) for c in columns))
    print("  ".join("-" * widths[c] for c in columns))
    for row in str_rows:
        print("  ".join(row[c].ljust(widths[c]) for c in columns))


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    logger = logging.getLogger("route_decisions")

    validated = load_json(VALIDATED_TRANSACTIONS_PATH)
    risk_scored = load_json(RISK_SCORED_TRANSACTIONS_PATH)
    approval_matrix = load_json(APPROVAL_MATRIX_PATH)
    raw_receipts = load_json(RAW_RECEIPTS_PATH)
    roster = load_roster(EMPLOYEE_ROSTER_PATH)

    transactions = join_transactions(validated, risk_scored)
    routed = route_all(transactions, approval_matrix["routing_rules"])

    print_summary_table(routed)

    by_id = {t["receipt_id"]: t for t in routed}

    print()
    print("=== Spot-checks ===")

    rcpt_001 = by_id["RCPT-001"]
    assert rcpt_001["routed_status"] == "rejected", (
        f"RCPT-001 should route to 'rejected' (alcohol hard rule), got {rcpt_001['routed_status']!r}"
    )
    print(
        f"RCPT-001: decision={rcpt_001['decision']}, risk_score={rcpt_001['risk_score']}, "
        f"amount_usd=${rcpt_001['amount_usd']:.2f} -> routed_status={rcpt_001['routed_status']} "
        f"(matched: \"{rcpt_001['matched_condition']}\") - CORRECT: alcohol hard rule bypasses "
        "amount/risk entirely and goes straight to rejection."
    )

    for rid in ("RCPT-002", "RCPT-003", "RCPT-006", "RCPT-008", "RCPT-010"):
        t = by_id[rid]
        print(
            f"{rid}: decision={t['decision']}, risk_score={t['risk_score']}, "
            f"amount_usd=${t['amount_usd']:.2f} -> routed_status={t['routed_status']} "
            f"(matched: \"{t['matched_condition']}\")"
        )

    print(
        "\nRCPT-002 ($34.20, compliant, low risk) is the only transaction at or under the "
        "$50 auto-approval ceiling, so it's the sole auto_approved case.\n"
        "RCPT-003 ($440.00, compliant, low risk) is compliant and under $500, so it lands in "
        "pending_manager_approval rather than auto_approved (over the $50 ceiling) or "
        "pending_finance_approval (under the $500 ceiling).\n"
        "RCPT-006, RCPT-008, and RCPT-010 are all 'flagged' by Phase 3 (policy_compliant=False), "
        "which alone satisfies the last rule's OR-condition - so every flagged transaction other "
        "than the alcohol case routes to pending_finance_approval regardless of amount or "
        "risk_score (notice RCPT-010 is only $22.70 and risk_score='low', yet still escalates, "
        "because being flagged at all is enough)."
    )

    print("\n" + "=" * 60 + "\n")

    employee_id_by_receipt = build_employee_id_by_receipt(raw_receipts)
    with_approvers = attach_approvers(routed, employee_id_by_receipt, roster)

    print_approver_table(with_approvers)

    for t in with_approvers:
        assert t["approver_id"] is not None or t["approver_resolution_note"], (
            f"{t['receipt_id']} has no approver_id and no explanatory note - "
            "an unresolved approver must always carry a reason"
        )
    print(
        f"\nConfirmed: all {len(with_approvers)} transactions have either a resolved "
        "approver or an explicit null-with-reason."
    )

    print("\n" + "=" * 60 + "\n")

    client = None
    if os.environ.get("ANTHROPIC_API_KEY"):
        client = anthropic.Anthropic()
    else:
        logger.warning(
            "ANTHROPIC_API_KEY is not set - every transaction will get a fallback "
            "summary instead of a real Claude-drafted one."
        )

    final_decisions = annotate_summaries(with_approvers, client, logger)
    write_final_decisions(final_decisions)

    print(f"Wrote {len(final_decisions)} record(s) to {FINAL_DECISIONS_PATH}\n")
    print_final_summary_table(final_decisions)


if __name__ == "__main__":
    main()
