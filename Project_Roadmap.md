# Project Roadmap — First Prototype (2-Day Plan)

**Status: complete.** All 5 core phases, both Architecture Extensions, and the full
ClaimPilot AI frontend described below have been built and tested against real
output — not the plan anymore, a record of what actually happened. For a full
interview-ready walkthrough of the finished system, with real numbers pulled from
its actual output files, see `Demo_Walkthrough.md`.

This was the plan for building a small, working first version of the Expense
Reimbursement Automation tool in just 2 days. It was not meant to be the full
product — it was a quick proof that the core idea works: a receipt goes in, Claude
reads it, checks it against company rules, catches anything suspicious, and gives a
decision. It ended up growing past that original 2-day scope (see the Architecture
Extensions and Phase 6 below), but the core pipeline described here is exactly what
got built.

We didn't have access to a real company system, so every phase below also creates or
uses simple made-up data (fake receipts, a fake employee list, fake rules) so the
demo has something real to work with. That data is genuinely fake; everything that
processes it is genuinely real, working code.

Original estimate: about 14.5 hours spread across 2 days for Phases 1–7. The two
Architecture Extensions and the full ClaimPilot AI frontend (well beyond the
original "simple demo screen" scope of Phase 6) were built on top of that, past the
original estimate.

---

## What We Built (and What We Deliberately Didn't)

Delivered:
- Reading receipts and pulling out the details (vendor, amount, date, etc.)
- Checking those details against company expense rules
- Spotting duplicate or suspicious expenses
- Deciding who needs to approve each expense
- A full frontend — landing page, chatbot, login, a personalized dashboard, a
  receipt-upload flow — not just a simple status screen
- A dynamic, per-transaction reasoning loop that decides its own next step instead
  of following a fixed sequence (Architecture Extension A)
- Cryptographic agent-to-agent authentication for payment authorization, including a
  self-run attack simulation that proves a forged authorization gets rejected
  (Architecture Extension B)

Still deliberately out of scope (this needs real company systems and more time than
a prototype like this had):
- Connecting to a real accounting/HR system
- A production-hardened employee-facing app (the frontend's login, registration,
  and persistence are all real working demo code, but they're intentionally
  simulated — no password, no server, no real database — see `Demo_Walkthrough.md`'s
  closing section for the exact real-vs-simulated breakdown)
- Testing with real employees

---

## Day 1

### Phase 1: Setting Up Our Practice Data — ✅ Complete
**Time: 1.5 hours**

Before we could build anything, we needed something to test it on. This phase was
just about getting that ready.

What we did:
- Set up folders for our data, code, and results
- Created a list of 10 fake employees with their departments and managers
- Wrote down 10 company expense rules (e.g., meals under $75, no alcohol, hotel limits)
- Set simple rules for who approves what amount

What we ended up with: three ready-to-use files — `data/employee_roster.csv`,
`data/policy_rulebook.json`, `data/approval_matrix.json` — plus `data/raw_receipts.json`,
the 12 seeded practice receipts everything downstream reads from.

---

### Phase 2: Teaching Claude to Read Receipts — ✅ Complete
**Time: 3 hours**

This was the heart of the whole idea: turning a messy receipt into clean, organized
information.

What we did:
- Wrote out 12 practice receipts (restaurant bill, taxi ride, hotel bill, flight
  ticket, office supplies, mileage log, etc.) as if they were scanned or photographed
- On purpose, made a few of them tricky: two are the same expense submitted twice,
  one is blurry and hard to read, and a couple are priced above their category cap
- Asked Claude to read each receipt and pull out the vendor, date, amount, currency,
  and category, plus a confidence score
- Receipts arrive in multiple currencies (INR, KRW, EUR, GBP, AED, JPY, USD) and get
  converted to USD before being checked against `policy_rulebook.json`, since all
  policy limits are USD-denominated

What we ended up with: `data/transactions.json` — all 12 receipts turned into neat,
organized, confidence-scored records. (`src/extraction/extract_receipts.py`)

---

### Phase 3: Checking Expenses Against the Rules — ✅ Complete
**Time: 2.5 hours**

Now that we had clean data, we checked whether each expense actually follows company
policy.

What we did:
- Ran each expense through the rulebook (spending limits, receipt requirements,
  banned categories) with a deterministic check
- For trickier cases a simple rule can't judge — like whether a taxi fare over
  threshold is reasonable given the context on the receipt — asked Claude to use
  judgment and explain its reasoning
- Attached a clear result to every expense: compliant or flagged, with a
  plain-English reason why

What we ended up with: `data/validated_transactions.json` — every expense carries a
decision and a reason. The seeded alcohol charge (RCPT-001) is correctly hard-rejected
with no Claude call needed at all, since alcohol is a non-negotiable rule; RCPT-008
(a $145 taxi fare that exceeds the $100 justification threshold in rule R-05, with no
business justification note attached) is correctly flagged; and RCPT-010's illegible
scanned date (literally `"2026-07-2?"`) no longer crashes the submission-window
check — it fails gracefully into a flag instead. (`src/validation/validate_policy.py`)

---

## Architecture Extension A — Dynamic Reasoning (ReAct Controller) — ✅ Complete

Built immediately after Phase 3, on top of it — same placement in the actual commit
history (`git log` shows both extensions land right between the Phase 3 and Phase 4
commits).

The five-phase pipeline above is a fixed sequence: every transaction runs through the
same stages in the same order regardless of what's in it. This extension is a
different way of driving a *single* transaction: a controller that looks at the
transaction's current state on each step and decides what to do next — extract, flag
for low-confidence review, validate, look up a manager — rather than following a
hardcoded order, stopping as soon as there's nothing left to do.

What we ended up with: `src/agent/react_controller.py`, plus one reasoning-trace
scratchpad file per receipt under `data/scratchpads/`. Verified concretely, not just
claimed: 6 clean, compliant, normal-confidence receipts each take exactly 3 steps;
5 flagged receipts each take exactly 4 steps (the extra step is looking up an
approver); and RCPT-010 alone — the one receipt below the confidence threshold —
takes 5 steps, picking up an extra low-confidence review step on top of being
flagged. The step count is a genuine consequence of each receipt's own content, not a
number the controller was told to produce. Full detail and the exact commands to run
it are in `Demo_Walkthrough.md`, Section 3.

---

## Architecture Extension B — Agent-to-Agent Authentication — ✅ Complete

Built immediately after Extension A, still ahead of Phase 4.

Once a workflow agent decides who gets paid and a separate payment agent actually
executes the payment, there's a real security question a single script never has to
answer: how does the payment agent know an authorization actually came from
something allowed to issue one, rather than trusting a self-declared field that
anything could fake? This extension gives each agent identity (`workflow_agent`,
`payment_agent`, `finance_approver`) its own RSA keypair; authorizations are signed,
not just labeled, and any payment over $500 requires two independent signatures
(dual control) before it can execute.

What we ended up with: `src/agents/identity.py`, `src/agents/workflow_agent.py`, and
`src/agents/payment_agent.py`, writing `data/payment_authorizations.json` and
`data/disbursement_log.json`. Every run of the payment agent also constructs and
processes one deliberately forged authorization through the exact same verification
path as real ones — and the run asserts, every time, that the forgery is rejected
and never executed, because its signature doesn't verify against the identity it
claims to be. Full detail, the exact three commands to run in order, and the dual
control math are in `Demo_Walkthrough.md`, Section 4.

---

### Phase 4: Catching Duplicates and Weird Spending — ✅ Complete
**Time: 2 hours**

Some problems don't show up from rules alone — they show up from patterns. This
phase looks for those.

What we did:
- Checked for the same expense being submitted more than once
- Compared each expense to the average for its category, and flagged anything way
  higher than normal
- Asked Claude to explain why something looks suspicious

What we ended up with: `data/risk_scored_transactions.json` — RCPT-006 and RCPT-011
(the duplicate pair) are correctly flagged and point at each other; RCPT-008 is
correctly flagged as a statistical outlier (2.155x its category's real average, just
over the 2x threshold). (`src/anomaly/detect_anomalies.py`)

---

### Phase 5: Deciding Who Needs to Approve What — ✅ Complete
**Time: 2 hours**

An expense being flagged isn't the end of the story — someone needs to actually
review and approve it. This phase handles that routing.

What we did:
- Used the approval matrix to decide the next step for each expense: auto-approved,
  needs a manager's approval, needs finance's approval, or rejected
- Matched each expense to the right approver using the employee list
- Asked Claude to write a one-line summary for the approver

What we ended up with: `data/final_decisions.json` — every one of the 12 expenses
carries a final routed status, an approver (or an explicit, reasoned "no approver
could be resolved" for RCPT-009, whose employee has no manager in the roster), and a
Claude-drafted summary. (`src/workflow/route_decisions.py`)

---

### Phase 6: Building the Demo Interface — ✅ Complete (grew well past "simple")
**Time: originally budgeted 2.5 hours — actual scope ended up much larger**

The original plan for this phase was a single simple screen: a filterable
transaction table and a click-through detail view. What actually got built is the
full **ClaimPilot AI** React frontend — the commit that finished it is tagged
`Phase 6: Demo Interface: Final Landing Page` in the project history, and the name
undersells it:

- A full marketing landing page (hero, an animated "How ClaimPilot AI Works"
  timeline, feature cards, security/integrations sections, an FAQ accordion, a
  contact section)
- A floating AI chatbot answering policy questions from a local, keyword-matched
  dataset grounded in the real rulebook — no API calls
- A public, no-login `/live-demo` view of all 12 real transactions (the original
  "simple screen" concept, kept as its own route)
- Employee login and self-service registration (no password — Employee ID + official
  email checked against the real roster)
- A personalized `/dashboard` for the logged-in employee: KPI cards, charts, and a
  claims table scoped to *their own* claims, not the aggregate 12
- A working Upload Receipt flow: drag-and-drop a PDF, get a simulated extraction
  result, see it show up immediately in that employee's own claims list
- A dark/light theme toggle and a fully responsive layout

What we ended up with: the `landing-page/` React app in this repo. See
`landing-page/README.md` for its structure and setup, and `Demo_Walkthrough.md`,
Section 5, for a full walkthrough of every screen and exactly which parts are real
backend output versus clearly-labeled simulated demo behavior.

---

### Phase 7: Final Check and Wrap-Up — ✅ Complete
**Time: 1 hour**

Before calling it done, we made sure everything actually works from start to finish,
and prepared it for a walkthrough.

What we did:
- Ran the whole pipeline again from a clean state
- Double-checked the seeded cases were caught correctly (duplicate expense, alcohol
  charge, statistical outlier, ambiguous scan)
- Wrote the full walkthrough: what to click, what to run, what to say, what each
  example proves, and why it matters architecturally

What we ended up with: **`Demo_Walkthrough.md`**, at the project root — a complete,
narrative interview script covering the backend pipeline, both Architecture
Extensions, and the full frontend, plus an honest closing section on what's real
versus simulated and which limitations were deliberate scope decisions rather than
oversights. That document, not this one, is the one to hand someone before a demo.

---

## The Practice Data We Started With

Four files were created in Phase 1 so the phases above could start right away:

- `employee_roster.csv`: 10 fake employees across 3 departments, with their managers
- `policy_rulebook.json`: 10 company expense rules
- `approval_matrix.json`: the rules for who approves what amount
- `raw_receipts.json`: 12 practice receipts, with the tricky cases built in on
  purpose (a duplicate pair, a rule-breaking charge, a blurry receipt, and outliers)

Everything else in `data/` — `transactions.json`, `validated_transactions.json`,
`risk_scored_transactions.json`, `final_decisions.json`, `payment_authorizations.json`,
`disbursement_log.json`, the `agent_keys/` directory, and the `scratchpads/` directory
— is real, generated output from actually running the phases and extensions above
against that starting data, not more hand-written fixtures.
