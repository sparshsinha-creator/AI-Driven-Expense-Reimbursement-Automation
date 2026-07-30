"""Architecture Extension B: the Payment Agent.

The only agent allowed to "execute" a disbursement. It never trusts a payload's
self-declared approver_identity field - it only trusts signatures that verify
against the corresponding agent's public key. Anything else is rejected,
logged, and never executed.

Dual control: any authorization above DUAL_CONTROL_THRESHOLD must carry BOTH
a valid workflow_agent signature AND a valid finance_approver signature. If
either is missing or fails to verify, the whole authorization is rejected -
a single valid signature is not enough for a high-value payment.

This is a MOCK executor: no real payment gateway is called. Every simulated
disbursement is printed with a "[MOCK]" prefix and appended to
data/disbursement_log.json.
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

from agents.identity import ensure_agent_identities, sign_payload, verify_signature

AUTHORIZATIONS_PATH = PROJECT_ROOT / "data" / "payment_authorizations.json"
DISBURSEMENT_LOG_PATH = PROJECT_ROOT / "data" / "disbursement_log.json"

WORKFLOW_AGENT = "workflow_agent"
PAYMENT_AGENT = "payment_agent"
FINANCE_APPROVER = "finance_approver"

DUAL_CONTROL_THRESHOLD = 500.0

# Deliberately fake transaction id for the attack simulation - never a real receipt_id.
FORGED_TRANSACTION_ID = "RCPT-999-FORGED"


def load_json_or_default(path: Path, default):
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _verify_one_signature(signatures: dict, agent_name: str, public_key_path, payload: dict) -> tuple[bool, str]:
    sig_b64 = signatures.get(agent_name)
    if sig_b64 is None:
        return False, f"missing required {agent_name} signature"

    try:
        signature = base64.b64decode(sig_b64)
    except Exception as exc:  # noqa: BLE001 - any decode failure is a rejection, not a crash
        return False, f"could not decode {agent_name} signature: {exc}"

    if verify_signature(public_key_path, payload, signature):
        return True, f"{agent_name} signature verified"
    return False, f"{agent_name} signature does NOT verify against {agent_name}'s public key"


def verify_authorization(
    auth: dict, workflow_public_path, finance_public_path
) -> tuple[bool, str]:
    payload = auth["payload"]
    signatures = auth.get("signatures", {})

    ok, reason = _verify_one_signature(signatures, WORKFLOW_AGENT, workflow_public_path, payload)
    if not ok:
        return False, f"{reason} - rejecting as a forged or tampered authorization"

    if payload["amount_usd"] > DUAL_CONTROL_THRESHOLD:
        ok, reason = _verify_one_signature(signatures, FINANCE_APPROVER, finance_public_path, payload)
        if not ok:
            return False, (
                f"${payload['amount_usd']:.2f} exceeds ${DUAL_CONTROL_THRESHOLD:.2f} dual-control "
                f"threshold and {reason} - a single signature is not enough for a high-value payment"
            )
        return True, "dual control satisfied: workflow_agent and finance_approver signatures both verified"

    return True, "signature verified against workflow_agent's public key"


def execute_disbursement(auth: dict) -> dict:
    """Execute (mock) a verified authorization, recording the full
    authorization chain - every signer identity and their signature, plus the
    original transaction id - so the log entry is a self-contained audit
    record, not just a payment confirmation.
    """
    payload = auth["payload"]
    signatures = auth.get("signatures", {})

    print(
        f"[MOCK] Disbursing ${payload['amount_usd']:.2f} to {payload['payee']} "
        f"for transaction {payload['transaction_id']}"
    )
    return {
        "transaction_id": payload["transaction_id"],
        "amount_usd": payload["amount_usd"],
        "payee": payload["payee"],
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "status": "executed",
        "signers": list(signatures.keys()),
        "signatures": signatures,
    }


def build_forged_authorization(payment_private_path) -> dict:
    """Attack simulation: same payload shape as a legitimate authorization,
    self-declaring approver_identity="workflow_agent", but actually signed
    with payment_agent's own private key - i.e. a spoofed/compromised request
    pretending to be workflow-approved.
    """
    forged_payload = {
        "transaction_id": FORGED_TRANSACTION_ID,
        "amount_usd": 999999.99,
        "payee": "E001",
        "approver_identity": WORKFLOW_AGENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    forged_signature = sign_payload(payment_private_path, forged_payload)
    return {
        "payload": forged_payload,
        "signatures": {WORKFLOW_AGENT: base64.b64encode(forged_signature).decode("ascii")},
    }


def main() -> None:
    real_authorizations = load_json_or_default(AUTHORIZATIONS_PATH, [])
    dual_signed_count = sum(
        1 for a in real_authorizations if len(a.get("signatures", {})) > 1
    )

    identities = ensure_agent_identities()
    workflow_public_path = identities[WORKFLOW_AGENT][1]
    finance_public_path = identities[FINANCE_APPROVER][1]
    payment_private_path = identities[PAYMENT_AGENT][0]

    forged_authorization = build_forged_authorization(payment_private_path)
    # Run the forgery through the exact same processing loop as real
    # authorizations - the proof is that verification rejects it on its own
    # merits, not because it was special-cased.
    authorizations_to_process = real_authorizations + [forged_authorization]

    existing_log = load_json_or_default(DISBURSEMENT_LOG_PATH, [])
    already_disbursed_ids = {r["transaction_id"] for r in existing_log}

    new_records: list[dict] = []
    executed_ids: list[str] = []
    rejected_ids: list[str] = []
    skipped_ids: list[str] = []

    for auth in authorizations_to_process:
        payload = auth["payload"]
        transaction_id = payload["transaction_id"]
        is_attack_sim = transaction_id == FORGED_TRANSACTION_ID
        tag = " [ATTACK SIMULATION]" if is_attack_sim else ""

        if transaction_id in already_disbursed_ids:
            skipped_ids.append(transaction_id)
            print(f"SKIP{tag} {transaction_id}: already disbursed previously - not re-executing.")
            continue

        valid, reason = verify_authorization(auth, workflow_public_path, finance_public_path)
        if not valid:
            rejected_ids.append(transaction_id)
            print(f"REJECTED{tag} {transaction_id}: {reason}")
            continue

        record = execute_disbursement(auth)
        new_records.append(record)
        executed_ids.append(transaction_id)

    final_log = existing_log + new_records
    DISBURSEMENT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DISBURSEMENT_LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(final_log, f, indent=2)

    print()
    print("=== Final Report ===")
    print(f"Authorizations issued (input):     {len(real_authorizations)}")
    print(f"  - dual-signed (>${DUAL_CONTROL_THRESHOLD:.0f}): {dual_signed_count}")
    print(f"  - single-signed:                 {len(real_authorizations) - dual_signed_count}")
    print(
        f"Executed {len(executed_ids)} disbursement(s), rejected {len(rejected_ids)}, "
        f"skipped {len(skipped_ids)} already-disbursed."
    )
    print(f"Disbursement log now has {len(final_log)} entrie(s) total: {DISBURSEMENT_LOG_PATH}")

    assert FORGED_TRANSACTION_ID in rejected_ids, "attack simulation should have been rejected!"
    assert FORGED_TRANSACTION_ID not in executed_ids, "attack simulation must never be executed!"
    print(
        f"\nAttack simulation CONFIRMED REJECTED: a forged authorization for "
        f"'{FORGED_TRANSACTION_ID}' claimed approver_identity='{WORKFLOW_AGENT}' but was "
        f"actually signed with {PAYMENT_AGENT}'s own private key. Signature verification "
        f"against {WORKFLOW_AGENT}'s public key correctly failed, proving the self-declared "
        f"approver field is never trusted on its own - only a real signature is."
    )


if __name__ == "__main__":
    main()
