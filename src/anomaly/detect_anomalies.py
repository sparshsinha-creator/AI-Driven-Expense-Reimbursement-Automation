"""Phase 4: Anomaly & Duplicate Flagging - duplicate detection, statistical
outlier check, and a Claude risk-scoring pass.

Loads data/validated_transactions.json (Phase 3 output).

Duplicate detection flags transactions that look like the same expense
submitted more than once: same vendor (case-insensitive), same date, and
amount_usd within a small tolerance of each other.

Outlier detection groups transactions by category, computes each category's
average amount_usd across all its members, and flags anything more than 2x
that average.

Every transaction flagged as a duplicate or an outlier (or both) is sent to
Claude with the specifics of why it was flagged, for a one-sentence
explanation and a low/medium/high risk_score. Clean transactions - no flags
at all - get risk_score "low" automatically, no Claude call needed, same
no-wasted-calls philosophy as Architecture Extension A.
"""

import json
import logging
import os
from pathlib import Path

import anthropic

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VALIDATED_TRANSACTIONS_PATH = PROJECT_ROOT / "data" / "validated_transactions.json"
OUTPUT_PATH = PROJECT_ROOT / "data" / "risk_scored_transactions.json"

MODEL = "claude-sonnet-5"

AMOUNT_TOLERANCE = 0.01
# Guards against float representation error (e.g. abs(100.00 - 100.01) evaluating
# to 0.010000000000005116, just over AMOUNT_TOLERANCE) causing a false negative
# right at the tolerance boundary.
_EPSILON = 1e-9


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_vendor(vendor: str) -> str:
    return vendor.strip().lower()


def build_duplicate_groups(transactions: list[dict]) -> dict[str, list[str]]:
    """Return receipt_id -> list of OTHER receipt_ids it duplicates (empty if none).

    Transactions are first bucketed by (normalized vendor, date) - both must
    match exactly. Within a bucket, transactions are then clustered by
    amount_usd using union-find, so amounts within AMOUNT_TOLERANCE of each
    other end up in the same duplicate set even if a third amount in the
    bucket is far enough away to be its own case (transitive tolerance,
    not just one global rounding step).
    """
    buckets: dict[tuple, list[int]] = {}
    for idx, txn in enumerate(transactions):
        key = (normalize_vendor(txn["vendor"]), txn["date"])
        buckets.setdefault(key, []).append(idx)

    parent = list(range(len(transactions)))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int) -> None:
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    for indices in buckets.values():
        if len(indices) < 2:
            continue
        for i in range(len(indices)):
            for j in range(i + 1, len(indices)):
                a, b = indices[i], indices[j]
                if abs(transactions[a]["amount_usd"] - transactions[b]["amount_usd"]) <= AMOUNT_TOLERANCE + _EPSILON:
                    union(a, b)

    components: dict[int, list[int]] = {}
    for idx in range(len(transactions)):
        components.setdefault(find(idx), []).append(idx)

    duplicate_of_by_id: dict[str, list[str]] = {}
    for indices in components.values():
        ids = [transactions[idx]["receipt_id"] for idx in indices]
        for rid in ids:
            duplicate_of_by_id[rid] = [other for other in ids if other != rid]

    return duplicate_of_by_id


def annotate_duplicates(transactions: list[dict]) -> list[dict]:
    duplicate_of_by_id = build_duplicate_groups(transactions)
    enriched = []
    for txn in transactions:
        duplicate_of = duplicate_of_by_id.get(txn["receipt_id"], [])
        enriched.append(
            {
                **txn,
                "is_duplicate": len(duplicate_of) > 0,
                "duplicate_of": duplicate_of,
            }
        )
    return enriched


def print_duplicate_report(enriched: list[dict]) -> None:
    duplicates = [t for t in enriched if t["is_duplicate"]]
    not_duplicates = [t for t in enriched if not t["is_duplicate"]]

    print(f"{len(duplicates)} of {len(enriched)} transaction(s) flagged as duplicates:\n")
    for t in duplicates:
        print(
            f"  {t['receipt_id']} | {t['vendor']} | {t['date']} | "
            f"${t['amount_usd']:.2f} | duplicate_of={t['duplicate_of']}"
        )

    print(f"\nNot flagged ({len(not_duplicates)}): {', '.join(t['receipt_id'] for t in not_duplicates)}")


OUTLIER_MULTIPLIER = 2.0


def deduplicate_for_stats(transactions: list[dict], duplicate_of_by_id: dict[str, list[str]]) -> list[dict]:
    """One representative transaction per duplicate cluster - a cluster like
    {RCPT-006, RCPT-011} contributes a single amount_usd to category
    statistics, not one per copy. Non-duplicated transactions pass through
    unchanged, each in a cluster of one.
    """
    seen_clusters: set[frozenset] = set()
    representatives = []
    for txn in transactions:
        rid = txn["receipt_id"]
        cluster = frozenset([rid, *duplicate_of_by_id.get(rid, [])])
        if cluster in seen_clusters:
            continue
        seen_clusters.add(cluster)
        representatives.append(txn)
    return representatives


def compute_category_averages(transactions: list[dict]) -> dict[str, float]:
    totals: dict[str, float] = {}
    counts: dict[str, int] = {}
    for txn in transactions:
        category = txn["category"]
        totals[category] = totals.get(category, 0.0) + txn["amount_usd"]
        counts[category] = counts.get(category, 0) + 1
    return {category: totals[category] / counts[category] for category in totals}


def annotate_outliers(transactions: list[dict]) -> tuple[list[dict], dict[str, float], list[dict]]:
    duplicate_of_by_id = build_duplicate_groups(transactions)
    representative_transactions = deduplicate_for_stats(transactions, duplicate_of_by_id)
    category_averages = compute_category_averages(representative_transactions)

    enriched = []
    for txn in transactions:
        average = category_averages[txn["category"]]
        ratio = txn["amount_usd"] / average if average > 0 else 0.0
        enriched.append(
            {
                **txn,
                "is_outlier": txn["amount_usd"] > OUTLIER_MULTIPLIER * average + _EPSILON,
                "outlier_ratio": round(ratio, 3),
            }
        )
    return enriched, category_averages, representative_transactions


def print_outlier_report(
    enriched: list[dict], category_averages: dict[str, float], representative_transactions: list[dict]
) -> None:
    print("Category averages (amount_usd, duplicate clusters counted once):")
    for category, average in sorted(category_averages.items()):
        members = [t for t in representative_transactions if t["category"] == category]
        print(f"  {category}: avg=${average:.2f} (n={len(members)}, 2x threshold=${2 * average:.2f})")

    outliers = [t for t in enriched if t["is_outlier"]]
    print(f"\n{len(outliers)} of {len(enriched)} transaction(s) flagged as outliers:\n")
    for t in outliers:
        print(
            f"  {t['receipt_id']} | {t['category']} | ${t['amount_usd']:.2f} | "
            f"outlier_ratio={t['outlier_ratio']}"
        )

    not_outliers = [t for t in enriched if not t["is_outlier"]]
    print(f"\nNot flagged ({len(not_outliers)}):")
    for t in not_outliers:
        print(
            f"  {t['receipt_id']} | {t['category']} | ${t['amount_usd']:.2f} | "
            f"outlier_ratio={t['outlier_ratio']}"
        )


RISK_SCORE_SYSTEM_PROMPT = """You are a fraud/anomaly risk-assessment assistant for an \
expense reimbursement system. You will be given a transaction that automated duplicate \
and/or outlier detection flagged, along with the specific reason(s) it was flagged.

Assess the transaction and return ONLY a JSON object with exactly these two fields:
- explanation: one plain-English sentence explaining the risk assessment
- risk_score: one of "low", "medium", "high"

Return only the JSON object - no prose, no markdown code fences."""


def build_flag_context(txn: dict, category_averages: dict) -> str:
    lines = []
    if txn["is_duplicate"]:
        lines.append(
            f"Flagged as a DUPLICATE: appears to be the same transaction as "
            f"{', '.join(txn['duplicate_of'])} (same vendor, date, and amount, "
            f"within a ${AMOUNT_TOLERANCE:.2f} tolerance)."
        )
    if txn["is_outlier"]:
        average = category_averages.get(txn["category"], 0.0)
        lines.append(
            f"Flagged as an OUTLIER: ${txn['amount_usd']:.2f} is {txn['outlier_ratio']}x its "
            f"'{txn['category']}' category average of ${average:.2f} "
            f"(flag threshold is {OUTLIER_MULTIPLIER}x average)."
        )
    return "\n".join(lines)


def parse_risk_assessment(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[len("json"):].strip()
    result = json.loads(text)
    risk_score = result["risk_score"]
    explanation = result["explanation"]
    if risk_score not in ("low", "medium", "high"):
        raise ValueError(f"unexpected risk_score: {risk_score!r}")
    return {"risk_score": risk_score, "explanation": explanation}


def call_claude_risk_assessment(
    client: anthropic.Anthropic, txn: dict, category_averages: dict, logger: logging.Logger
) -> dict:
    user_message = (
        f"Transaction {txn['receipt_id']} ({txn['vendor']}, {txn['category']}, "
        f"${txn['amount_usd']:.2f}, dated {txn['date']}).\n"
        f"Phase 3 policy decision: {txn['decision']} ({txn['reason']})\n\n"
        f"Flag reason(s):\n{build_flag_context(txn, category_averages)}\n\n"
        "Assess the risk and respond with the JSON object described."
    )

    for attempt in (1, 2):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=512,
                system=RISK_SCORE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            text = next(b.text for b in response.content if b.type == "text")
            return parse_risk_assessment(text)
        except Exception as exc:  # noqa: BLE001 - parse/validate/API errors all retry the same way
            logger.warning(
                "Risk assessment attempt %d/2 failed for %s: %s", attempt, txn["receipt_id"], exc
            )

    logger.warning(
        "Giving up on risk assessment for %s after 2 attempts; defaulting to medium", txn["receipt_id"]
    )
    return {
        "risk_score": "medium",
        "explanation": (
            "Claude risk assessment failed after 2 attempts; defaulting to medium risk "
            "for human review rather than silently clearing a flagged transaction."
        ),
    }


def merge_enrichments(
    transactions: list[dict], dup_enriched: list[dict], outlier_enriched: list[dict]
) -> list[dict]:
    dup_by_id = {t["receipt_id"]: t for t in dup_enriched}
    outlier_by_id = {t["receipt_id"]: t for t in outlier_enriched}
    merged = []
    for txn in transactions:
        rid = txn["receipt_id"]
        merged.append(
            {
                **txn,
                "is_duplicate": dup_by_id[rid]["is_duplicate"],
                "duplicate_of": dup_by_id[rid]["duplicate_of"],
                "is_outlier": outlier_by_id[rid]["is_outlier"],
                "outlier_ratio": outlier_by_id[rid]["outlier_ratio"],
            }
        )
    return merged


def annotate_risk_scores(
    merged: list[dict],
    category_averages: dict,
    client: anthropic.Anthropic | None,
    logger: logging.Logger,
) -> list[dict]:
    scored = []
    for txn in merged:
        if not txn["is_duplicate"] and not txn["is_outlier"]:
            scored.append(
                {
                    **txn,
                    "risk_score": "low",
                    "explanation": "No duplicate or outlier signals detected.",
                }
            )
            continue

        if client is None:
            assessment = {
                "risk_score": "medium",
                "explanation": (
                    "ANTHROPIC_API_KEY is not set; defaulting to medium risk for human "
                    "review rather than silently clearing a flagged transaction."
                ),
            }
        else:
            assessment = call_claude_risk_assessment(client, txn, category_averages, logger)

        scored.append({**txn, **assessment})
    return scored


def write_risk_scored_transactions(records: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


def print_risk_summary(records: list[dict]) -> None:
    columns = ["receipt_id", "is_duplicate", "is_outlier", "risk_score", "explanation"]
    str_rows = []
    for r in records:
        explanation = r["explanation"]
        truncated = explanation if len(explanation) <= 60 else explanation[:57] + "..."
        str_rows.append(
            {
                "receipt_id": r["receipt_id"],
                "is_duplicate": str(r["is_duplicate"]),
                "is_outlier": str(r["is_outlier"]),
                "risk_score": r["risk_score"],
                "explanation": truncated,
            }
        )
    widths = {c: max(len(c), *(len(row[c]) for row in str_rows)) for c in columns}

    print("  ".join(c.ljust(widths[c]) for c in columns))
    print("  ".join("-" * widths[c] for c in columns))
    for row in str_rows:
        print("  ".join(row[c].ljust(widths[c]) for c in columns))


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    logger = logging.getLogger("detect_anomalies")

    transactions = load_json(VALIDATED_TRANSACTIONS_PATH)

    dup_enriched = annotate_duplicates(transactions)
    print_duplicate_report(dup_enriched)

    by_id = {t["receipt_id"]: t for t in dup_enriched}
    assert by_id["RCPT-006"]["is_duplicate"] is True, "RCPT-006 should be flagged as a duplicate"
    assert by_id["RCPT-011"]["is_duplicate"] is True, "RCPT-011 should be flagged as a duplicate"
    assert by_id["RCPT-006"]["duplicate_of"] == ["RCPT-011"], "RCPT-006 should point only to RCPT-011"
    assert by_id["RCPT-011"]["duplicate_of"] == ["RCPT-006"], "RCPT-011 should point only to RCPT-006"

    unexpected = [
        rid for rid, t in by_id.items()
        if t["is_duplicate"] and rid not in ("RCPT-006", "RCPT-011")
    ]
    assert not unexpected, f"unexpected transaction(s) flagged as duplicates: {unexpected}"

    print(
        "\nConfirmed: RCPT-006 and RCPT-011 are correctly grouped as duplicates "
        "of each other, and no other transaction was incorrectly flagged."
    )

    print("\n" + "=" * 60 + "\n")

    outlier_enriched, category_averages, representative_transactions = annotate_outliers(transactions)
    print_outlier_report(outlier_enriched, category_averages, representative_transactions)

    outlier_by_id = {t["receipt_id"]: t for t in outlier_enriched}
    print()
    for rid in ("RCPT-012", "RCPT-006", "RCPT-011"):
        t = outlier_by_id[rid]
        avg = category_averages[t["category"]]
        print(
            f"{rid}: amount=${t['amount_usd']:.2f}, category '{t['category']}' avg=${avg:.2f}, "
            f"2x avg=${2 * avg:.2f}, ratio={t['outlier_ratio']}, is_outlier={t['is_outlier']}"
        )

    print("\n" + "=" * 60 + "\n")

    merged = merge_enrichments(transactions, dup_enriched, outlier_enriched)

    client = None
    if os.environ.get("ANTHROPIC_API_KEY"):
        client = anthropic.Anthropic()
    else:
        logger.warning(
            "ANTHROPIC_API_KEY is not set - flagged transactions will default to "
            "medium risk_score instead of getting a real Claude assessment."
        )

    scored = annotate_risk_scores(merged, category_averages, client, logger)
    write_risk_scored_transactions(scored)

    flagged_count = sum(1 for t in scored if t["is_duplicate"] or t["is_outlier"])
    print(
        f"Risk-scored all {len(scored)} transaction(s): {flagged_count} flagged "
        f"(sent to Claude), {len(scored) - flagged_count} clean (auto risk_score=low)."
    )
    print(f"Wrote {len(scored)} record(s) to {OUTPUT_PATH}\n")

    print_risk_summary(scored)


if __name__ == "__main__":
    main()
