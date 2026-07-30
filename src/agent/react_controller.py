"""Architecture Extension A: ReAct-style reasoning loop for a single transaction.

A lightweight controller that drives one receipt through Reason -> Act -> Observe
steps on top of the existing Phase 2 (extraction) and Phase 3 (validation)
pipeline, recording every step to a per-transaction scratchpad file.

Each capability (extraction, low-confidence review, policy validation) is
registered as a "skill": a name, a one-line description, and a run function.
The skill catalog itself is cheap to build - the run functions import their
underlying modules (extract_receipts.py / validate_policy.py), and the heavy
prompt/instruction strings those modules define, lazily on first invocation,
not when this module loads or when the catalog is built. The Reason step
inspects the transaction's current state each iteration and picks whichever
skill state calls for next, rather than following a fixed sequence.
"""

import csv
import json
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

import anthropic

RAW_RECEIPTS_PATH = PROJECT_ROOT / "data" / "raw_receipts.json"
RULEBOOK_PATH = PROJECT_ROOT / "data" / "policy_rulebook.json"
EMPLOYEE_ROSTER_PATH = PROJECT_ROOT / "data" / "employee_roster.csv"
SCRATCHPAD_DIR = PROJECT_ROOT / "data" / "scratchpads"

MAX_STEPS = 5

# Mirrors validate_policy.py's LOW_CONFIDENCE_THRESHOLD: below this, an
# extraction is uncertain enough to warrant extra scrutiny before it's
# trusted to policy validation.
LOW_CONFIDENCE_THRESHOLD = 0.5


class Scratchpad:
    """A per-transaction reasoning trace: a running list of
    {step, thought, action, observation} entries, persisted to
    data/scratchpads/<receipt_id>.json.
    """

    def __init__(self, receipt_id: str):
        self.receipt_id = receipt_id
        self.entries: list[dict] = []
        self.path = SCRATCHPAD_DIR / f"{receipt_id}.json"

    def add_entry(self, thought: str, action: str, observation) -> dict:
        entry = {
            "step": len(self.entries) + 1,
            "thought": thought,
            "action": action,
            "observation": observation,
        }
        self.entries.append(entry)
        return entry

    def to_dict(self) -> dict:
        return {"receipt_id": self.receipt_id, "entries": self.entries}

    def save(self) -> None:
        SCRATCHPAD_DIR.mkdir(parents=True, exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, default=str)

    def print_trace(self) -> None:
        for entry in self.entries:
            observation = entry["observation"]
            if isinstance(observation, dict):
                observation_str = json.dumps(observation, indent=2)
            else:
                observation_str = str(observation)

            print(f"Step {entry['step']}")
            print(f"  Thought:     {entry['thought']}")
            print(f"  Action:      {entry['action']}")
            print(f"  Observation: {observation_str}")
            print()


@dataclass
class Skill:
    """A capability the controller can invoke. `run` is a plain function
    reference - defining it costs nothing; its body (and any lazy imports of
    the heavier extraction/validation modules) only executes when the
    controller actually calls it.
    """

    name: str
    description: str
    run: Callable[["ReActController", str, dict], dict]


def get_employee_manager(employee_id: str) -> dict:
    """Mock external tool call: simulates an HRIS/MCP lookup for an employee's
    manager by reading data/employee_roster.csv. Stands in for a real MCP tool
    call against an HR system in production.
    """
    with open(EMPLOYEE_ROSTER_PATH, newline="", encoding="utf-8") as f:
        roster_by_id = {row["employee_id"]: row for row in csv.DictReader(f)}

    employee = roster_by_id.get(employee_id)
    if employee is None:
        return {
            "employee_id": employee_id,
            "found": False,
            "error": "employee_id not found in roster",
        }

    manager_id = employee.get("manager_id") or None
    manager = roster_by_id.get(manager_id) if manager_id else None

    return {
        "employee_id": employee_id,
        "employee_name": employee["name"],
        "manager_id": manager_id,
        "manager_name": manager["name"] if manager else None,
        "found": True,
    }


def _run_extract_skill(controller: "ReActController", receipt_id: str, state: dict) -> dict:
    # Lazy import: extraction.extract_receipts defines a large system prompt
    # and imports the anthropic SDK's request machinery - only pay for that
    # the first time this skill actually runs.
    from extraction.extract_receipts import extract_receipt

    if controller.client is None:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set; cannot call Claude to extract this receipt"
        )

    raw_receipt = controller.raw_receipts_by_id.get(receipt_id)
    if raw_receipt is None:
        raise ValueError(f"no raw receipt found for receipt_id {receipt_id!r}")

    record = extract_receipt(controller.client, raw_receipt, controller.logger)
    state["transaction"] = record
    return {
        "vendor": record.get("vendor"),
        "amount_usd": record.get("amount_usd"),
        "category": record.get("category"),
        "confidence_score": record.get("confidence_score"),
    }


def _run_review_low_confidence_skill(
    controller: "ReActController", receipt_id: str, state: dict
) -> dict:
    # Pure state logic - no lazy import needed, nothing heavy to load.
    txn = state["transaction"]
    confidence = txn["confidence_score"]
    note = (
        f"Extraction confidence {confidence:.2f} is below the "
        f"{LOW_CONFIDENCE_THRESHOLD:.2f} threshold - flagging for extra scrutiny "
        "before policy validation runs."
    )
    state["low_confidence_reviewed"] = True
    return {
        "confidence_score": confidence,
        "threshold": LOW_CONFIDENCE_THRESHOLD,
        "note": note,
    }


def _run_validate_skill(controller: "ReActController", receipt_id: str, state: dict) -> dict:
    # Lazy import: validation.validate_policy defines the Claude reasoning
    # system prompt and its own anthropic usage - deferred to first call.
    from validation.validate_policy import decide_transaction, evaluate_transaction

    txn = state["transaction"]
    finding = evaluate_transaction(txn, controller.rules, controller.submitted_at_by_id)
    decision = decide_transaction(
        txn, finding, controller.rules, controller.raw_text_by_id, controller.client, controller.logger
    )
    state["decision"] = decision
    return {"decision": decision["decision"], "reason": decision["reason"]}


def _run_lookup_manager_skill(controller: "ReActController", receipt_id: str, state: dict) -> dict:
    employee_id = controller.employee_id_by_receipt.get(receipt_id)
    if employee_id is None:
        raise ValueError(f"no employee_id found in raw_receipts.json for receipt_id {receipt_id!r}")

    called_at = datetime.now(timezone.utc).isoformat()
    result = get_employee_manager(employee_id)
    state["manager_info"] = result

    return {
        "tool": "get_employee_manager (mock HRIS/MCP lookup)",
        "called_at": called_at,
        "employee_id": employee_id,
        "reason": "Decision is 'flagged' - a manager/approver must be identified for review routing.",
        "result": result,
    }


SKILLS: dict[str, Skill] = {
    "extract": Skill(
        name="extract",
        description=(
            "Extract structured transaction fields (vendor, amount, category, "
            "confidence) from raw receipt text via Claude."
        ),
        run=_run_extract_skill,
    ),
    "review_low_confidence": Skill(
        name="review_low_confidence",
        description=(
            "Flag a transaction whose extraction confidence fell below threshold "
            "for extra scrutiny before it is trusted to policy validation."
        ),
        run=_run_review_low_confidence_skill,
    ),
    "validate": Skill(
        name="validate",
        description=(
            "Check a structured transaction against deterministic policy rules, "
            "escalating ambiguous threshold breaches to Claude reasoning."
        ),
        run=_run_validate_skill,
    ),
    "lookup_manager": Skill(
        name="lookup_manager",
        description=(
            "Look up the employee's manager/approver via a mock HRIS/MCP tool "
            "call, for routing a flagged transaction to review."
        ),
        run=_run_lookup_manager_skill,
    ),
}


class ReActController:
    """Drives a single receipt through Reason -> Act -> Observe steps, picking
    the next skill to invoke from the transaction's current state at each
    iteration instead of following a fixed sequence.
    """

    def __init__(self):
        self.logger = logging.getLogger("react_controller")

        with open(RAW_RECEIPTS_PATH, "r", encoding="utf-8") as f:
            raw_receipts_doc = json.load(f)
        with open(RULEBOOK_PATH, "r", encoding="utf-8") as f:
            rulebook_doc = json.load(f)

        self.raw_receipts_by_id = {
            r["receipt_id"]: r for r in raw_receipts_doc["receipts"]
        }
        self.submitted_at_by_id = {
            r["receipt_id"]: r["submitted_at"] for r in raw_receipts_doc["receipts"]
        }
        self.raw_text_by_id = {
            r["receipt_id"]: r["raw_text"] for r in raw_receipts_doc["receipts"]
        }
        self.employee_id_by_receipt = {
            r["receipt_id"]: r["employee_id"] for r in raw_receipts_doc["receipts"]
        }
        self.rules = {r["rule_id"]: r for r in rulebook_doc["rules"]}

        self.client = anthropic.Anthropic() if os.environ.get("ANTHROPIC_API_KEY") else None
        if self.client is None:
            self.logger.warning(
                "ANTHROPIC_API_KEY is not set - the extract skill will fail and "
                "the loop will stop early."
            )

    def process(self, receipt_id: str) -> Scratchpad:
        pad = Scratchpad(receipt_id)
        state = {"transaction": None, "decision": None}

        for _ in range(MAX_STEPS):
            thought, action = self._reason(state)

            if action == "stop":
                pad.add_entry(thought, action, "Decision reached; no further action needed.")
                break

            try:
                observation = self._act(action, receipt_id, state)
            except Exception as exc:  # noqa: BLE001 - any tool failure ends the loop, recorded as-is
                pad.add_entry(thought, action, f"ERROR: {exc}")
                break

            pad.add_entry(thought, action, observation)

        pad.save()
        return pad

    def _reason(self, state: dict) -> tuple[str, str]:
        """Inspect the transaction's current state and decide which skill (if
        any) to invoke next - not a hardcoded sequence.
        """
        if state["transaction"] is None:
            skill = SKILLS["extract"]
            return (
                f"Not yet extracted - invoking '{skill.name}' skill ({skill.description})",
                "extract",
            )

        confidence = state["transaction"].get("confidence_score", 1.0)
        if confidence < LOW_CONFIDENCE_THRESHOLD and not state.get("low_confidence_reviewed"):
            skill = SKILLS["review_low_confidence"]
            return (
                f"Extracted, but confidence {confidence:.2f} is below the "
                f"{LOW_CONFIDENCE_THRESHOLD:.2f} threshold - invoking '{skill.name}' "
                f"skill ({skill.description})",
                "review_low_confidence",
            )

        if state["decision"] is None:
            skill = SKILLS["validate"]
            return (
                f"Extracted and confidence checked, not yet validated against "
                f"policy - invoking '{skill.name}' skill ({skill.description})",
                "validate",
            )

        if state["decision"]["decision"] == "flagged" and state.get("manager_info") is None:
            skill = SKILLS["lookup_manager"]
            return (
                f"Decision is 'flagged' - a manager/approver is needed to route "
                f"this for review - invoking '{skill.name}' skill ({skill.description})",
                "lookup_manager",
            )

        return (
            "Decision reached and, if flagged, a manager/approver has already "
            "been identified; nothing more to do.",
            "stop",
        )

    def _act(self, action: str, receipt_id: str, state: dict) -> dict:
        skill = SKILLS.get(action)
        if skill is None:
            raise ValueError(f"unknown skill: {action!r}")
        return skill.run(self, receipt_id, state)


def run_all(controller: ReActController) -> list[Scratchpad]:
    return [
        controller.process(receipt_id)
        for receipt_id in sorted(controller.raw_receipts_by_id.keys())
    ]


def print_tool_call_summary(pads: list[Scratchpad]) -> None:
    triggered = [
        p.receipt_id
        for p in pads
        if any(e["action"] == "lookup_manager" for e in p.entries)
    ]
    not_triggered = [p.receipt_id for p in pads if p.receipt_id not in triggered]

    print(f"Tool call triggered ({len(triggered)}/{len(pads)}): {', '.join(triggered)}")
    print(f"Tool call NOT needed ({len(not_triggered)}/{len(pads)}): {', '.join(not_triggered)}")


def summarize_pads(pads: list[Scratchpad]) -> list[dict]:
    rows = []
    for p in pads:
        decision = "N/A"
        for entry in p.entries:
            if entry["action"] == "validate" and isinstance(entry["observation"], dict):
                decision = entry["observation"].get("decision", "N/A")
        rows.append(
            {
                "receipt_id": p.receipt_id,
                "steps": len(p.entries),
                "tool_calls": sum(1 for e in p.entries if e["action"] == "lookup_manager"),
                "decision": decision,
            }
        )
    return rows


def print_summary_table(rows: list[dict]) -> None:
    columns = ["receipt_id", "steps", "tool_calls", "decision"]
    str_rows = [{c: str(r[c]) for c in columns} for r in rows]
    widths = {c: max(len(c), *(len(row[c]) for row in str_rows)) for c in columns}

    print("  ".join(c.ljust(widths[c]) for c in columns))
    print("  ".join("-" * widths[c] for c in columns))
    for row in str_rows:
        print("  ".join(row[c].ljust(widths[c]) for c in columns))


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    if len(sys.argv) == 1:
        controller = ReActController()
        pads = run_all(controller)
        print_summary_table(summarize_pads(pads))
        print()
        print_tool_call_summary(pads)
        return

    if len(sys.argv) != 2:
        print(f"Usage: python {Path(__file__).name} [<receipt_id>]", file=sys.stderr)
        sys.exit(1)
    receipt_id = sys.argv[1]

    controller = ReActController()
    pad = controller.process(receipt_id)

    print(json.dumps(pad.to_dict(), indent=2, default=str))
    print(f"\nScratchpad saved to {pad.path}", file=sys.stderr)


if __name__ == "__main__":
    main()
