"""Architecture Extension B: cryptographic identities for the multi-agent system.

Each agent in the multi-agent architecture (workflow_agent, payment_agent, ...)
gets its own RSA keypair, so one agent can sign a payload and another can
verify it actually came from that agent - the basis for agent-to-agent
authentication. Keypairs are generated once and persisted under
data/agent_keys/, not regenerated on every run, so an identity stays stable
across process restarts.

Private keys are unencrypted PEM on disk and are gitignored - fine for this
prototype, but production would want them password-protected or held in a
proper key vault rather than as plain files.
"""

import base64
import json
import os
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

PROJECT_ROOT = Path(__file__).resolve().parents[2]
AGENT_KEYS_DIR = PROJECT_ROOT / "data" / "agent_keys"

AGENT_NAMES = ["workflow_agent", "payment_agent", "finance_approver"]

_SIGNATURE_PADDING = padding.PSS(
    mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH
)
_SIGNATURE_HASH = hashes.SHA256()


def _private_key_path(agent_name: str) -> Path:
    return AGENT_KEYS_DIR / f"{agent_name}_private.pem"


def _public_key_path(agent_name: str) -> Path:
    return AGENT_KEYS_DIR / f"{agent_name}_public.pem"


def generate_agent_keypair(agent_name: str, force: bool = False) -> tuple[Path, Path]:
    """Generate and persist an RSA keypair for one agent identity.

    If both key files already exist and force=False, does nothing and just
    returns their paths - identities are stable across runs, not regenerated
    each time.
    """
    private_path = _private_key_path(agent_name)
    public_path = _public_key_path(agent_name)

    if private_path.exists() and public_path.exists() and not force:
        return private_path, public_path

    AGENT_KEYS_DIR.mkdir(parents=True, exist_ok=True)

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()

    private_path.write_bytes(
        private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    public_path.write_bytes(
        public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )

    try:
        os.chmod(private_path, 0o600)  # best-effort; no-op on Windows
    except OSError:
        pass

    return private_path, public_path


def ensure_agent_identities() -> dict[str, tuple[Path, Path]]:
    """Generate (once) the keypairs for every known agent identity."""
    return {name: generate_agent_keypair(name) for name in AGENT_NAMES}


def _canonical_json_bytes(payload: dict) -> bytes:
    """Deterministic serialization so the same dict always signs/verifies to
    the same bytes, regardless of key insertion order.
    """
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sign_payload(private_key_path, payload_dict: dict) -> bytes:
    """Sign a dict's canonical JSON form with the private key at
    private_key_path. Returns the raw signature bytes.
    """
    with open(private_key_path, "rb") as f:
        private_key = serialization.load_pem_private_key(f.read(), password=None)

    message = _canonical_json_bytes(payload_dict)
    return private_key.sign(message, _SIGNATURE_PADDING, _SIGNATURE_HASH)


def verify_signature(public_key_path, payload_dict: dict, signature: bytes) -> bool:
    """Verify that `signature` is a valid signature of payload_dict's
    canonical JSON form, made by the private key matching public_key_path.
    """
    with open(public_key_path, "rb") as f:
        public_key = serialization.load_pem_public_key(f.read())

    message = _canonical_json_bytes(payload_dict)
    try:
        public_key.verify(signature, message, _SIGNATURE_PADDING, _SIGNATURE_HASH)
        return True
    except InvalidSignature:
        return False


def main() -> None:
    identities = ensure_agent_identities()
    for name, (private_path, public_path) in identities.items():
        print(f"{name}:")
        print(f"  private key: {private_path}")
        print(f"  public key:  {public_path}")

    sample_payload = {
        "action": "approve_reimbursement",
        "receipt_id": "RCPT-001",
        "amount_usd": 33.90,
        "requested_by": "workflow_agent",
    }
    print(f"\nSample payload:\n{json.dumps(sample_payload, indent=2)}")

    workflow_private, workflow_public = identities["workflow_agent"]
    _, payment_public = identities["payment_agent"]

    signature = sign_payload(workflow_private, sample_payload)
    print(f"\nSigned with workflow_agent's private key.")
    print(f"Signature (base64, truncated): {base64.b64encode(signature).decode()[:60]}...")

    same_agent_result = verify_signature(workflow_public, sample_payload, signature)
    cross_agent_result = verify_signature(payment_public, sample_payload, signature)

    print(f"\nVerify with workflow_agent's public key (expect True):  {same_agent_result}")
    print(f"Verify with payment_agent's public key  (expect False): {cross_agent_result}")

    assert same_agent_result is True, "workflow_agent's own signature should verify"
    assert cross_agent_result is False, "payment_agent's key must not verify workflow_agent's signature"
    print("\nSelf-test passed: the two agent identities are genuinely distinct.")


if __name__ == "__main__":
    main()
