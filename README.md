# ClaimPilot AI — AI-Driven Expense Reimbursement Automation

An AI-driven expense reimbursement pipeline: a receipt goes in, gets read and turned
into structured data, gets checked against a real policy rulebook, gets cross-checked
for duplicates and unusual amounts, and gets routed to the right approver — with a
plain-English reason at every step. Built as a 2-day prototype (see
`Project_Roadmap.md`) that grew into three real, working pieces:

1. **A 5-phase backend pipeline** (`src/extraction`, `src/validation`, `src/anomaly`,
   `src/workflow`) that actually runs against 12 seeded receipts and produces real,
   inspectable output at every stage.
2. **Two architecture extensions** on top of that pipeline: a dynamic, ReAct-style
   reasoning loop (`src/agent`) and a cryptographic agent-to-agent authentication
   layer for payment authorization (`src/agents`), including a self-run attack
   simulation.
3. **ClaimPilot AI**, a full React frontend (`landing-page/`) that visualizes the
   real pipeline output — landing page, chatbot, login, a personalized dashboard, a
   receipt-upload flow.

For a full narrated walkthrough of the whole system — what to run, what to say, and
what each piece proves, with real numbers pulled from this project's own output —
see **`Demo_Walkthrough.md`**. For the plan this was built from and a phase-by-phase
record of what shipped, see **`Project_Roadmap.md`**.

## Folder structure

```
data/                   Real seed data (employee_roster.csv, policy_rulebook.json,
                        approval_matrix.json, raw_receipts.json) and every real
                        pipeline output file (transactions.json,
                        validated_transactions.json, risk_scored_transactions.json,
                        final_decisions.json, payment_authorizations.json,
                        disbursement_log.json), plus agent_keys/ and scratchpads/
docs/                   The original full phased roadmap and 2-day build plan (PDFs)
src/extraction/         Phase 2 - receipt-to-structured-JSON extraction
src/validation/         Phase 3 - policy rules engine + Claude reasoning
src/anomaly/            Phase 4 - duplicate and outlier detection
src/workflow/           Phase 5 - approval routing
src/agent/              Architecture Extension A - ReAct reasoning controller
src/agents/             Architecture Extension B - agent identity, signing, payments
landing-page/           ClaimPilot AI - the full React frontend
Project_Roadmap.md      Phase-by-phase plan and completion record
Demo_Walkthrough.md     Full interview walkthrough script
requirements.txt        Python dependencies for the backend
```

## Running it

**Backend** (from the project root): `pip install -r requirements.txt`, then set
`ANTHROPIC_API_KEY` in your environment. Exact commands for every phase and
extension, in order, are in `Demo_Walkthrough.md`.

**Frontend**: `cd landing-page && npm install && npm run dev`. See
`landing-page/README.md` for the frontend's own structure, routes, and a breakdown
of which parts of the UI are real backend output versus clearly-labeled simulated
demo behavior.
