"""Architecture Extension B: the Workflow Agent.

Reads Phase 3's validated transactions and, for every "compliant" one, issues
a signed payment-authorization payload - proof that the workflow agent (and
only the workflow agent, per its private key) approved this specific payment.
"payment_agent" (or whichever downstream agent consumes these) would verify
each signature with workflow_agent's public key before acting on it.

Flagged transactions never reach payment - no authorization is issued for
them, full stop.

Dual control: any authorization above DUAL_CONTROL_THRESHOLD must carry a
second, independent signature from "finance_approver" in addition to
workflow_agent's. Both signatures are stored under the "signatures" dict,
keyed by agent name, so payment_agent can tell exactly who signed off.
"""

import base64
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from agents.identity import ensure_agent_identities, sign_payload

VALIDATED_TRANSACTIONS_PATH = PROJECT_ROOT / "data" / "validated_transactions.json"
RAW_RECEIPTS_PATH = PROJECT_ROOT / "data" / "raw_receipts.json"
OUTPUT_PATH = PROJECT_ROOT / "data" / "payment_authorizations.json"

APPROVER_IDENTITY = "workflow_agent"
FINANCE_APPROVER = "finance_approver"
DUAL_CONTROL_THRESHOLD = 500.0


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_employee_id_index(raw_receipts: dict) -> dict:
    return {r["receipt_id"]: r["employee_id"] for r in raw_receipts["receipts"]}


def build_authorization_payload(txn: dict, employee_id_by_receipt: dict) -> dict:
    return {
        "transaction_id": txn["receipt_id"],
        "amount_usd": txn["amount_usd"],
        "payee": employee_id_by_receipt.get(txn["receipt_id"]),
        "approver_identity": APPROVER_IDENTITY,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def issue_authorizations(
    transactions: list[dict],
    employee_id_by_receipt: dict,
    workflow_private_path,
    finance_private_path,
) -> list[dict]:
    authorizations = []
    for txn in transactions:
        if txn["decision"] != "compliant":
            continue

        payload = build_authorization_payload(txn, employee_id_by_receipt)

        signatures = {
            APPROVER_IDENTITY: base64.b64encode(
                sign_payload(workflow_private_path, payload)
            ).decode("ascii"),
        }
        if payload["amount_usd"] > DUAL_CONTROL_THRESHOLD:
            signatures[FINANCE_APPROVER] = base64.b64encode(
                sign_payload(finance_private_path, payload)
            ).decode("ascii")

        authorizations.append({"payload": payload, "signatures": signatures})
    return authorizations


def write_authorizations(authorizations: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(authorizations, f, indent=2)


def print_summary(authorizations: list[dict], total_transactions: int) -> None:
    print(
        f"Issued {len(authorizations)} payment authorization(s) out of "
        f"{total_transactions} total transaction(s)."
    )
    for auth in authorizations:
        p = auth["payload"]
        control = (
            f"dual-control: {' + '.join(auth['signatures'].keys())}"
            if p["amount_usd"] > DUAL_CONTROL_THRESHOLD
            else f"single-control: {APPROVER_IDENTITY}"
        )
        print(f"  {p['transaction_id']} | payee={p['payee']} | ${p['amount_usd']:.2f} | {control}")


def main() -> None:
    transactions = load_json(VALIDATED_TRANSACTIONS_PATH)
    raw_receipts = load_json(RAW_RECEIPTS_PATH)
    employee_id_by_receipt = build_employee_id_index(raw_receipts)

    identities = ensure_agent_identities()
    workflow_private_path = identities[APPROVER_IDENTITY][0]
    finance_private_path = identities[FINANCE_APPROVER][0]

    authorizations = issue_authorizations(
        transactions, employee_id_by_receipt, workflow_private_path, finance_private_path
    )
    write_authorizations(authorizations)

    print_summary(authorizations, len(transactions))
    print(f"\nWrote {len(authorizations)} signed authorization(s) to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
