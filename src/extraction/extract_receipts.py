"""Phase 2: Receipt Capture & Claude Extraction.

Reads data/raw_receipts.json, asks Claude to turn each raw receipt into a
structured record, and writes the results to data/transactions.json.
"""

import json
import logging
import os
import sys
from pathlib import Path

import anthropic

MODEL = "claude-sonnet-5"

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_RECEIPTS_PATH = PROJECT_ROOT / "data" / "raw_receipts.json"
OUTPUT_PATH = PROJECT_ROOT / "data" / "transactions.json"

ALLOWED_CATEGORIES = {
    "meals",
    "alcohol",
    "lodging",
    "airfare",
    "ground_transport",
    "mileage",
    "office_supplies",
}

REQUIRED_FIELDS = {
    "receipt_id",
    "vendor",
    "date",
    "amount",
    "currency",
    "amount_usd",
    "category",
    "line_items",
    "confidence_score",
}

SYSTEM_PROMPT = """You are a receipt-extraction engine for an expense reimbursement system.

You will be given the raw OCR/scanned text of a single receipt. Extract the details
and return ONLY a single JSON object — no prose, no markdown code fences, no
explanation before or after it. The JSON object must have exactly these fields:

- receipt_id: string, echoed back from the input
- vendor: string, the merchant/business name
- date: string, ISO 8601 date (YYYY-MM-DD) the transaction occurred
- amount: number, the total amount in the original currency
- currency: string, ISO 4217 currency code (e.g. USD, INR, KRW, EUR, GBP, AED, JPY)
- amount_usd: number, the amount converted to USD. If the receipt text contains an
  approximate USD conversion (e.g. "(~$33.90 USD)"), use that value. Otherwise
  estimate using a reasonable approximate exchange rate for the currency and date.
- category: string, exactly one of: meals, alcohol, lodging, airfare,
  ground_transport, mileage, office_supplies
- line_items: array of objects, each with "description" (string) and "amount"
  (number in the original currency). Use your best reading of the itemized lines;
  if none are itemized, provide one line item summarizing the whole charge.
- confidence_score: number between 0.0 and 1.0 reflecting how confident you are in
  this extraction. Lower this substantially for blurry, ambiguous, low-quality, or
  hard-to-read scans — be honest about uncertainty rather than defaulting to a high
  score.

Return only the JSON object."""


def load_raw_receipts() -> list[dict]:
    with open(RAW_RECEIPTS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["receipts"]


def build_user_message(receipt: dict) -> str:
    return (
        f"receipt_id: {receipt['receipt_id']}\n"
        f"submitted_at: {receipt['submitted_at']}\n"
        f"channel: {receipt['channel']}\n"
        f"raw_text:\n{receipt['raw_text']}"
    )


def validate_record(record: dict) -> None:
    """Raise ValueError if record doesn't match the expected shape."""
    if not isinstance(record, dict):
        raise ValueError("response is not a JSON object")

    missing = REQUIRED_FIELDS - record.keys()
    if missing:
        raise ValueError(f"missing fields: {sorted(missing)}")

    if record["category"] not in ALLOWED_CATEGORIES:
        raise ValueError(f"invalid category: {record['category']!r}")

    if not isinstance(record["amount"], (int, float)):
        raise ValueError("amount is not numeric")

    if not isinstance(record["amount_usd"], (int, float)):
        raise ValueError("amount_usd is not numeric")

    confidence = record["confidence_score"]
    if not isinstance(confidence, (int, float)) or not (0.0 <= confidence <= 1.0):
        raise ValueError(f"confidence_score out of range: {confidence!r}")

    if not isinstance(record["line_items"], list):
        raise ValueError("line_items is not a list")
    for item in record["line_items"]:
        if not isinstance(item, dict) or "description" not in item or "amount" not in item:
            raise ValueError(f"malformed line_item: {item!r}")


def extract_json_object(text: str) -> dict:
    """Parse a JSON object out of Claude's text response, tolerating stray fencing."""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[len("json"):].strip()
    return json.loads(text)


def call_claude(client: anthropic.Anthropic, receipt: dict) -> dict:
    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_message(receipt)}],
    )
    text = next(block.text for block in response.content if block.type == "text")
    record = extract_json_object(text)
    validate_record(record)
    return record


def fallback_record(receipt: dict) -> dict:
    return {
        "receipt_id": receipt["receipt_id"],
        "vendor": None,
        "date": None,
        "amount": None,
        "currency": None,
        "amount_usd": None,
        "category": None,
        "line_items": [],
        "confidence_score": 0.0,
    }


def extract_receipt(client: anthropic.Anthropic, receipt: dict, logger: logging.Logger) -> dict:
    receipt_id = receipt["receipt_id"]
    for attempt in (1, 2):
        try:
            return call_claude(client, receipt)
        except Exception as exc:  # noqa: BLE001 - deliberately broad: parse/validate/API errors all retry the same way
            logger.warning(
                "Attempt %d/2 failed for %s: %s", attempt, receipt_id, exc
            )
    logger.warning(
        "Giving up on %s after 2 attempts; marking confidence_score 0.0", receipt_id
    )
    return fallback_record(receipt)


def print_summary(records: list[dict]) -> None:
    columns = ["receipt_id", "vendor", "amount_usd", "category", "confidence_score"]
    widths = {col: len(col) for col in columns}
    rows = []
    for r in records:
        row = {
            "receipt_id": str(r.get("receipt_id")),
            "vendor": str(r.get("vendor")),
            "amount_usd": f"{r['amount_usd']:.2f}" if isinstance(r.get("amount_usd"), (int, float)) else "N/A",
            "category": str(r.get("category")),
            "confidence_score": f"{r['confidence_score']:.2f}",
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
    logger = logging.getLogger("extract_receipts")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        logger.error("ANTHROPIC_API_KEY is not set")
        sys.exit(1)

    client = anthropic.Anthropic()
    receipts = load_raw_receipts()

    records = []
    for receipt in receipts:
        logger.info("Extracting %s...", receipt["receipt_id"])
        record = extract_receipt(client, receipt, logger)
        records.append(record)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
    logger.info("Wrote %d records to %s", len(records), OUTPUT_PATH)

    print()
    print_summary(records)


if __name__ == "__main__":
    main()
