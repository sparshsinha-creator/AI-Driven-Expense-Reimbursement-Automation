# ClaimPilot AI — Demo Walkthrough

This is a full interview script for this project, not a checklist. Read it top to
bottom and you'll have everything you need to run the whole thing, know what to say
at each step, and understand why it was built this way. It's organized in the order
you'd actually want to present it: the problem and approach first, then the backend
pipeline that does the real work, then the two architecture extensions that go beyond
a plain script, then the frontend that makes all of it visible and clickable, then a
closing section that's honest about what's real and what's simplified.

Every number in this document is pulled directly from this project's own real output
files (`data/final_decisions.json`, `data/risk_scored_transactions.json`,
`data/raw_receipts.json`) and its own source code — nothing here is illustrative or
rounded for effect.

---

## 1. Project Overview

**The problem.** Expense reimbursement, in most companies, is a manual, paper-chase
process. An employee submits a receipt — often a photo or a scan — and then a human
somewhere has to read it, figure out what it was for, check it against a policy
document nobody has fully memorized, decide whether it's reasonable, notice if it's
a duplicate of something already submitted, and route it to the right approver. Every
one of those steps is slow, inconsistent between reviewers, and error-prone in both
directions: legitimate expenses get delayed because a reviewer is busy or unsure of
the rule, and problematic ones (an accidental duplicate, an alcohol line item on a
"business dinner," a taxi fare well outside the normal range) slip through because
nobody has time to cross-check every receipt against every other receipt from the
same week. None of this is a hard problem to reason about — it's a volume problem.
A person can absolutely tell that a $310 dinner receipt looks suspiciously like one
they approved four days ago. The issue is that they'd have to remember it, and at
any real scale, nobody does.

**The approach.** This project is an AI-driven pipeline that does exactly that
reasoning, consistently, at whatever volume you throw at it. A receipt comes in, gets
read and turned into structured data, gets checked against a real, explicit rulebook
(not "policy in someone's head"), gets cross-checked against everything else in the
system for duplicates and unusual amounts, and gets routed to the correct approver —
auto-approved outright, sent to a manager, escalated to finance, or rejected — with a
plain-English reason attached at every step. The design deliberately splits this into
five phases, each one reading the previous phase's output file and writing its own,
rather than one monolithic script. That's not just tidiness: it means every
intermediate result is a real, inspectable JSON file you can open and check by hand,
and it means each phase's logic is independently testable and independently
explainable. When you're walking someone through *why* a transaction ended up
rejected, you can point to the exact file where that decision was made, rather than
saying "the algorithm did it."

On top of that five-phase pipeline sit two "architecture extensions" that push this
past a fixed, linear script: a ReAct-style reasoning loop that decides its own next
step per transaction instead of always running the same fixed sequence of stages, and
a cryptographic agent-to-agent authentication layer that treats "who authorized this
payment" as something that has to be *proven*, not just asserted, before real money
would move.

**The 2-day build context.** This is worth saying plainly, because it explains some
of the decisions you'll see later: this was built as a 2-day prototype (see
`Project_Roadmap.md` — about 14.5 hours across the phases below), specifically to
prove the *core idea* works, not to ship a production system. There's no connection
to a real HR system, a real accounting system, or real receipts — there's a
deliberately small, deliberately tricky set of 12 seeded receipts (`data/raw_receipts.json`)
built by hand to include exactly the edge cases a reviewer would want to see proven:
a duplicate submission, an outright policy violation, a statistical outlier, and an
illegible scan. Everything downstream of that seed data — the extraction, the policy
checks, the anomaly detection, the routing, the frontend — is real, working code
that actually runs against that data and produces real output. The "fake" part is
strictly the input (a handful of made-up receipts standing in for a real company's
document flow); the pipeline that processes them is not a mockup.

---

## 2. Backend Pipeline (Phases 1–5)

Before running anything, make sure `ANTHROPIC_API_KEY` is set in your environment —
every phase from 2 onward calls Claude for at least part of its decision-making, and
without a key each script still runs to completion but falls back to a safe default
(flagged for human review, rather than silently guessing) instead of a real model
call. Install dependencies once with `pip install -r requirements.txt` from the
project root. Every command below is written to be run from the project root.

### 2.1 Phase 1 — Setting Up Practice Data

There's no script to run here — this phase produced the four static files everything
else reads from: `data/employee_roster.csv` (10 employees across 3 departments, with
their managers), `data/policy_rulebook.json` (10 explicit expense rules), `data/approval_matrix.json`
(the rules for who approves what), and `data/raw_receipts.json` (the 12 seeded
receipts). If you want to show a reviewer where the "policy" actually lives, this is
the file to open — `policy_rulebook.json` has real numbers for every category: $75
per meal, alcohol at $0 (never reimbursable), lodging at $250/night ($400/night in
New York, London, Tokyo, or Dubai), ground transport at $100/ride, mileage at
$0.67/mile, international per-diem at $150/day, office supplies at $200/purchase, a
$25 itemized-receipt threshold, and a 60-day submission window. Nothing downstream
invents a number that isn't traceable back to this file.

### 2.2 Phase 2 — Receipt Extraction

**Run:** `python src/extraction/extract_receipts.py`
**Reads:** `data/raw_receipts.json`
**Writes:** `data/transactions.json`

This is the "read the receipt" step. Each of the 12 raw receipts is OCR-style text —
some clean, some deliberately messy — and Claude turns each one into a structured
record: vendor, date, amount, currency, an amount converted to USD (receipts arrive
in INR, KRW, EUR, GBP, AED, JPY, and USD, and every policy limit is USD-denominated,
so this conversion has to happen before anything downstream can compare against a
rule), a category, itemized line items, and a confidence score for how sure the
extraction is. What a reviewer should look at here: open `data/transactions.json`
and pick any record — every field is exactly what you'd expect a human data-entry
clerk to produce, just done consistently across all 12 receipts in one pass. The
confidence score is the interesting field to point out — it's not decorative; Phase
3 (and the ReAct controller in Section 3) actually reads it and changes behavior when
it's low.

### 2.3 Phase 3 — Policy Validation

**Run:** `python src/validation/validate_policy.py`
**Reads:** `data/transactions.json`, `data/policy_rulebook.json`, `data/raw_receipts.json`
**Writes:** `data/validated_transactions.json`

This is the phase that actually checks each transaction against the rulebook. It's
deliberately split into two layers, and this split is the single most important
architectural idea in the whole backend, so it's worth explaining clearly:

**Layer one — deterministic checks.** A pure Python function scans every line item's
description for alcohol keywords (wine, beer, whiskey, champagne, cocktail, liquor,
vodka, rum, gin, tequila, brandy) using a regex; checks the category-specific numeric
cap (meals, lodging with a high-cost-city override, ground transport, mileage, office
supplies); checks whether an itemized receipt is required and present; and checks
whether the transaction was submitted within the 60-day window. None of this touches
Claude. It's fast, deterministic, and — critically — some of these checks are
declared **non-negotiable**: the alcohol rule (R-02) is the one rule in this system
where a hard failure is never sent to Claude for a second opinion. If the deterministic
scan finds an alcohol keyword, that transaction is flagged immediately, full stop.

**Layer two — Claude reasoning for genuine ambiguity.** Everything else that fails a
deterministic check gets one more look before being flagged outright: does the raw
receipt text contain language suggesting a legitimate business justification (a
detour, a client dinner, an airport transfer, "party of," a conference), or is the
extraction confidence low enough that the "violation" might just be a bad read rather
than a real one? If either is true, the transaction — along with the specific rule it
broke and the raw receipt text — goes to Claude, which returns a compliant/flagged
decision and a one-sentence, plain-English reason. If neither is true, it's flagged
automatically with no Claude call needed, because there's nothing for a model to
usefully weigh in on.

This two-layer design is the answer to "why not just ask Claude to check everything?"
— asking Claude to re-derive "$310 is more than $75" on every transaction would be
slower, more expensive, and less consistent than a two-line numeric comparison. Claude
gets called exactly where judgment is genuinely needed, and nowhere else.

### 2.4 Phase 4 — Anomaly & Duplicate Detection

**Run:** `python src/anomaly/detect_anomalies.py`
**Reads:** `data/validated_transactions.json`
**Writes:** `data/risk_scored_transactions.json`

Two independent checks run here, on top of everything Phase 3 already decided:

**Duplicate detection.** Transactions are first bucketed by exact match on
(normalized vendor name, date). Within a bucket, amounts are clustered using
union-find: any two transactions whose `amount_usd` is within a $0.01 tolerance of
each other get merged into the same duplicate cluster, and that clustering is
transitive — if A matches B and B matches C, all three end up grouped together even
if A and C weren't directly within tolerance of each other. This tolerance-based
clustering is exactly what real receipts need, since a resubmission through a
different channel can pick up trivial rounding differences.

**Outlier detection.** Every transaction is grouped by category, and each category's
average `amount_usd` is computed — but with one important correction: before
computing that average, duplicate clusters are collapsed to a single representative
transaction, so a duplicate pair doesn't get double-counted and drag its own category
average upward. Anything more than 2x its category's (deduplicated) average is
flagged as an outlier.

**The risk-scoring pass.** Only transactions that come out of either check flagged —
a duplicate, an outlier, or both — get sent to Claude with the specific reason(s) they
were flagged, for a one-sentence risk explanation and a low/medium/high risk score.
Every clean transaction gets `risk_score: "low"` automatically, no Claude call spent
on it. Same "no wasted calls" philosophy as Phase 3, and as the ReAct controller in
Section 3.

Two implementation details worth surfacing if asked: the tolerance check uses a tiny
epsilon guard (`AMOUNT_TOLERANCE + 1e-9`) on top of the $0.01 tolerance, because
`abs(100.00 - 100.01)` in Python floating-point actually evaluates to
`0.010000000000005116` — a hair over the raw tolerance, which would have produced a
false negative right at the boundary. That's a real bug this project's own testing
caught, not a hypothetical one, and the fix is a permanent guard now, not a one-off
patch. And the outlier average is intentionally computed on the *deduplicated*
representative set, not the raw list — an earlier version of this logic let
RCPT-006/RCPT-011 count as two separate $310 meals rather than one, which pulled the
meals category average up and nearly hid RCPT-012 as an outlier; recomputing it
correctly (see the case walkthrough below) still didn't flag RCPT-012, and that
negative result was reported as-is rather than adjusted to fit an expected story.

### 2.5 Phase 5 — Workflow Routing

**Run:** `python src/workflow/route_decisions.py`
**Reads:** `data/validated_transactions.json`, `data/risk_scored_transactions.json`, `data/approval_matrix.json`, `data/employee_roster.csv`, `data/raw_receipts.json`
**Writes:** `data/final_decisions.json`

This is the last stop before a transaction has a final status. It joins Phase 3's
policy decision with Phase 4's risk score by receipt ID, then walks
`approval_matrix.json`'s five routing rules **in order, first match wins**:

1. Compliant, low risk, $50 or under → `auto_approved`
2. Compliant, low/medium risk, over $50 and up to $500 → `pending_manager_approval`
3. Over $500 → `pending_finance_approval`
4. Category is alcohol → `rejected` (zero-tolerance, no human review)
5. Not compliant, or high risk → `pending_finance_approval`

Rule order matters enormously here: the alcohol rule sits *after* the amount-based
rules but is checked using a dedicated predicate, not a generic "category == alcohol"
field lookup — there is no top-level `alcohol` category in this dataset; alcohol is
detected as a line-item keyword inside a `meals` transaction, and that fact only
survives into this phase as specific wording in Phase 3's reason text
("Non-negotiable rule violated: ... alcohol keyword ..."). Matching on that exact
phrase, rather than a naive substring search for the word "alcohol," turned out to be
necessary in testing — Claude's own free-text reasoning on an unrelated flag can
mention the word in a negation (one case's reason literally opens with "Although no
alcohol was involved...") which a naive check would have misfired on.

Once routed, each transaction's employee is looked up in the roster to find their
manager (with an explicit `null` + reason if no manager can be resolved — see the
RCPT-009 case below, and the closing section), and finance escalations are routed to
a fixed "Finance Team" identity rather than incorrectly reusing the submitter's direct
manager. Finally, Claude drafts one plain-English approval summary per transaction,
with tone that depends on the routed status (a factual confirmation for
auto-approved, a rejection notice for rejected, an actionable briefing for the two
pending statuses) and an explicit instruction never to conflate the *submitting*
employee with the *approver* — an earlier version of this prompt did exactly that,
misattributing one employee's expense to their approver in the generated summary,
which is why the current prompt spells out the distinction so bluntly.

### 2.6 The Four Proof Cases, Walked Through

This is the part of the demo that actually proves the pipeline works, not just that
it runs. All four of these are seeded on purpose in `data/raw_receipts.json` — say so
plainly when you present them; the point isn't that the system "got lucky," it's that
these edge cases were built in deliberately and the pipeline handles every one of
them correctly.

#### RCPT-001 — Alcohol, auto-rejected by a deterministic rule

Priya Nair (E001) submits a $33.90 (₹2,824.50) dinner receipt from Trishna
Restaurant, dated 2026-07-14. The raw scan reads, in part: *"1 House Red Wine
950.00"* and closes with *"Thank you for dining with us — Business dinner w/ client
(Acme Corp)."* Notice that last line: it explicitly contains "client" and "business
dinner," two of Phase 3's justification keywords. If this transaction reached the
"is there mitigating context?" check, it would qualify. **It never gets there.** R-02
(alcohol) is a non-negotiable rule — the deterministic keyword scan finds "House Red
Wine," matches it against the alcohol pattern, and the transaction is flagged
immediately with no Claude call and no chance for "business dinner" framing to change
the outcome. Phase 5 then routes it straight to `rejected` via the dedicated alcohol
predicate, bypassing every amount/risk-based rule entirely. Final state: `routed_status:
"rejected"`, reason: *"Non-negotiable rule violated: line item 'House Red Wine'
matches alcohol keyword 'Wine' — Not reimbursable under any circumstance, including
client entertainment."* **What this proves:** the system distinguishes a rule that's
genuinely non-negotiable from one that merely needs judgment, and doesn't let
sympathetic-sounding context talk its way around a zero-tolerance policy.

#### RCPT-006 / RCPT-011 — The duplicate pair

Robert Singh (E006) submits a $310.00 (₹25,823.00) dinner receipt from The Oberoi —
Fine Dining, dated 2026-07-18, for a party of 4 client entertainment dinner. Four
days later, a second receipt — RCPT-011 — arrives: **same vendor, same date, same
amount to the cent**, explicitly annotated *"[Resubmitted via different channel —
same transaction as RCPT-006]."* Phase 4's duplicate detection buckets both by
(vendor, date), then clusters them by amount within the $0.01 tolerance — since
they're identical to the cent, they union into the same cluster immediately. Both
come out with `is_duplicate: true` and point at each other (`duplicate_of: ["RCPT-011"]`
and `duplicate_of: ["RCPT-006"]` respectively) — a check confirmed by an explicit
assertion in the script itself (`assert by_id["RCPT-006"]["duplicate_of"] ==
["RCPT-011"]`) and by a check that no *other* transaction was incorrectly swept into
the cluster. Both also fail Phase 3's $75/meal cap on their own — split evenly, $310
across 4 diners is $77.50 per person — and because the deterministic meal check
compares the *whole receipt total* against the cap (there's no party-size field in
this schema), that $310 figure is what gets checked, and the per-person framing you
see in the reason text is something Claude itself worked out during the reasoning
escalation, not a structural calculation the code performs (more on this in the
closing section). Both land on `risk_score: "high"` and route to
`pending_finance_approval`. **What this proves:** the duplicate check isn't a naive
"same amount" match — it requires vendor and date to line up too, and it's built to
survive a resubmission through a different channel rather than only catching an
exact-copy upload.

#### RCPT-008 — Statistical outlier

Thomas Berger (E008) submits a $145.00 (€134.50) taxi fare from FREE NOW Taxi, Berlin
Brandenburg Airport to a downtown hotel, "via detour — traffic diversion," with "No
note attached." Phase 3 fails it deterministically on R-05 (ground transport, $100/ride)
— $145 exceeds the limit and, since the extraction schema has no field to capture a
justification note even if one existed, it's treated as violated. The raw text's
"detour" and "traffic" language matches Phase 3's justification keywords, so it's
escalated to Claude rather than hard-flagged, and Claude flags it anyway given the
explicit "No note attached." Separately, in Phase 4: the three ground-transport
receipts in this dataset are RCPT-002 ($34.20), RCPT-008 ($145.00), and RCPT-010
($22.70) — a category average of $67.30. $145.00 divided by $67.30 is **2.155x** the
average — just over the 2.0x outlier threshold, which is exactly the number that
shows up in `risk_scored_transactions.json` as `outlier_ratio: 2.155` and
`is_outlier: true`. Notice it's not a dramatic 10x outlier — it's a real, marginal
case that a human skimming a spreadsheet might miss, and the system catches it
precisely because it's comparing against an actual computed average, not a gut
feeling. Final state: `risk_score: "medium"`, routed to `pending_finance_approval`.
**What this proves:** the outlier check is a genuine statistical comparison against
the category's real data, not a hardcoded amount ceiling, and it catches a fairly
close call, not just obvious extremes.

#### RCPT-010 — Illegible OCR date, fail-safe instead of a crash

This one is Kenji Watanabe's (E010) Tokyo MK Taxi fare, and it's the deliberately
"bad scan" case: the raw text is literally tagged `[LOW QUALITY SCAN — PARTIALLY
LEGIBLE]`, with *"Date: 2?-Jul-2026"* and *"Fare: JPY ?,400 (first digit unclear —
could be 3 or 8)."* The extraction resolves the fare as 3,400 JPY (~$22.70,
confidence score **0.25** — the lowest of any transaction in the dataset, and the
only one below Phase 3's 0.5 low-confidence threshold) but the date field is passed
through with the illegible character preserved literally: `"date": "2026-07-2?"`.
When Phase 3's submission-window check (R-10) tries to parse that string with
Python's `date.fromisoformat()`, it raises a `ValueError` — a `2?` is not a valid day
number. **This used to crash the script outright.** The current code wraps that parse
in a try/except and, on failure, returns `passed: False` with a detail explaining
that the date couldn't be parsed, rather than letting the whole pipeline run die on
one bad record. Since R-10 isn't a non-negotiable rule, and the extraction confidence
(0.25) is well under the 0.5 threshold, the transaction is escalated to Claude, which
flags it: *"The receipt's date and amount are illegible due to poor scan quality,
preventing verification of the submission window and transaction amount, so it
requires human review."* Routed to `pending_finance_approval` despite being the
smallest dollar amount in the entire dataset and the lowest risk score (`"low"`) —
because being flagged by Phase 3 at all is enough to escalate, independent of amount
or risk. **What this proves:** a malformed or ambiguous field doesn't take down the
pipeline — it degrades gracefully into "flag this for a human," which is the correct,
safe behavior for data you can't fully trust.

---

## 3. Architecture Extension A — ReAct Controller

**Run:** `python src/agent/react_controller.py` (all 12 receipts) or
`python src/agent/react_controller.py RCPT-001` (a single receipt, prints its full
reasoning trace to stdout)
**Reads:** `data/raw_receipts.json`, `data/policy_rulebook.json`, `data/employee_roster.csv`
**Writes:** one scratchpad file per receipt under `data/scratchpads/<receipt_id>.json`

**The problem it solves.** Phases 2 through 5 are a fixed pipeline: every transaction
runs through extraction, then validation, then anomaly detection, then routing, in
that exact order, regardless of what's actually in it. That's fine for a batch job,
but it's not how you'd want a single-transaction agent to behave — a clean,
high-confidence, compliant receipt genuinely doesn't need the same amount of process
as an ambiguous one. This extension replaces the fixed sequence with a loop that
looks at the transaction's *current state* on every iteration and decides what to do
next, rather than what step number it's on.

**How it works mechanically.** The `ReActController` drives one receipt through a
Reason → Act → Observe loop, up to a hard cap of 5 steps. On each iteration, `_reason()`
inspects the transaction's current state — has it been extracted yet? Is the
confidence too low? Has it been validated? If it's flagged, has an approver been
looked up? — and picks exactly one of four registered "skills" to run next, or
decides there's nothing left to do and stops:

- **`extract`** — pulls structured fields from the raw receipt via Claude (this
  reuses `extract_receipts.py`'s actual extraction function, not a reimplementation).
- **`review_low_confidence`** — only invoked if the extraction confidence came back
  below 0.5; flags the transaction for extra scrutiny before it's trusted downstream.
- **`validate`** — runs the transaction through the real Phase 3 policy check.
- **`lookup_manager`** — only invoked if the decision came back "flagged"; calls a
  mock HRIS/MCP tool (`get_employee_manager`, reading `employee_roster.csv`) to
  resolve the employee's manager for routing.

Every step — thought, action, and observation — is recorded to a `Scratchpad` and
persisted as a real JSON file under `data/scratchpads/`. Each skill is defined as a
name, description, and a plain function reference; the *heavy* part of each skill
(importing `extract_receipts.py` or `validate_policy.py`, which each define large
system prompts and their own Claude-calling machinery) is deferred with a lazy
`import` statement inside the skill's own run function, not at module load time or
when the skill catalog is built — so building the catalog itself costs nothing, and
you only pay for loading a skill's real dependencies the first time it's actually
invoked.

**The real step-count proof.** This is the part to actually demonstrate, because it's
a concrete, checkable number, not a claim: run the controller against all 12 receipts
and look at the step counts.

- **6 transactions take exactly 3 steps** (`extract` → `validate` → stop): every
  compliant, normal-confidence transaction — RCPT-002, RCPT-003, RCPT-004, RCPT-005,
  RCPT-007, RCPT-009. Nothing extra was needed, so nothing extra ran.
- **5 transactions take exactly 4 steps** (`extract` → `validate` → `lookup_manager`
  → stop): every flagged transaction with normal confidence — RCPT-001, RCPT-006,
  RCPT-008, RCPT-011, RCPT-012. Being flagged means an approver has to be found, so
  the loop reasons its way to that fourth step.
- **RCPT-010 alone takes 5 steps** (`extract` → `review_low_confidence` → `validate`
  → `lookup_manager` → stop): it's the only transaction in the dataset with
  extraction confidence below 0.5 (0.25, from the illegible scan discussed above), so
  it's the only one that picks up the extra low-confidence review step *in addition
  to* being flagged and needing an approver looked up.

Run `python src/agent/react_controller.py` with no argument and the summary table at
the end prints exactly these step counts per receipt, plus which ones triggered the
`lookup_manager` tool call and which didn't. **What this proves:** the number of
steps a transaction takes is a genuine consequence of its content — a low-confidence
extraction and a policy flag each independently add a step to the trace — not a fixed
number the controller was told to produce.

---

## 4. Architecture Extension B — Agent-to-Agent Authentication

**Run, in order:**
1. `python src/agents/identity.py` — generates (or confirms) the three agent
   keypairs, then runs its own self-test.
2. `python src/agents/workflow_agent.py` — issues signed payment authorizations.
3. `python src/agents/payment_agent.py` — verifies and (mock) executes them,
   including the built-in attack simulation.

**Reads/writes:** identities live under `data/agent_keys/` (private keys are
gitignored); `workflow_agent.py` reads `data/validated_transactions.json` and writes
`data/payment_authorizations.json`; `payment_agent.py` reads that file and writes
`data/disbursement_log.json`.

**The risk it addresses.** Once you have multiple agents cooperating — one deciding
who gets paid, another actually executing the payment — you've introduced a genuine
security question that a single-script pipeline never has to answer: how does the
payment-executing agent know a given authorization *actually* came from the
component that's allowed to issue them, rather than from something else entirely?
If the payment agent trusted a self-declared `approver_identity` field in the
payload — just a string saying "this came from workflow_agent" — then anything that
can construct a JSON object could authorize an arbitrary payment simply by claiming
to be the workflow agent. That's a classic confused-deputy problem, and in a real
system it's exactly the kind of gap a compromised component, a bug, or a
prompt-injected upstream step could exploit to move real money. The fix has to be
that authorization is *proven*, not *asserted*.

**How it works.** `src/agents/identity.py` gives each of three agent identities —
`workflow_agent`, `payment_agent`, `finance_approver` — its own 2048-bit RSA keypair,
generated once and persisted to disk (unencrypted PEM, gitignored — acceptable for a
prototype, called out directly in the module's own docstring as something a real
deployment would want in a proper key vault instead). To sign anything, a payload
dict is first serialized to a canonical form (`json.dumps(..., sort_keys=True,
separators=(",", ":"))`) so the same data always produces the same bytes regardless
of key order, then signed with RSA-PSS (MGF1/SHA-256, max salt length) using the
signing agent's private key. Verification takes a public key, the same canonical
payload, and a signature, and returns a plain `True`/`False` — no exceptions leak
through, no ambiguity.

`workflow_agent.py` issues a signed authorization — transaction ID, amount, payee,
approver identity, timestamp — for every transaction Phase 3 marked `"compliant"`,
and only those; a flagged transaction never gets an authorization issued for it at
all, full stop, regardless of what else happens to it later. Above a
$500 **dual-control threshold**, an authorization needs a *second*, independent
signature from `finance_approver` in addition to `workflow_agent`'s — both stored in
a `signatures` dict keyed by agent name, so the payment agent can see exactly who
signed off. Worth being upfront about here: none of the 12 real compliant
transactions in this dataset actually exceeds $500 (the largest is RCPT-003 at
$440.00), so dual-control was never organically triggered by the seed data — it was
verified with a synthetic $750 test transaction constructed specifically to cross the
threshold, not something you'll see fire naturally if you just run the pipeline
end-to-end on the 12 seeded receipts.

`payment_agent.py` is the only component allowed to "execute" a disbursement (a mock
one — every execution just prints a `[MOCK]` line and appends a record to
`disbursement_log.json`; no real payment gateway exists or is called). It never
trusts the payload's self-declared `approver_identity` string — it only trusts a
signature that actually verifies against the corresponding agent's real public key.
If the workflow_agent signature is missing or doesn't verify, the whole authorization
is rejected outright. If the amount exceeds the dual-control threshold and the
finance_approver signature is missing or invalid, it's rejected too — a single valid
signature is explicitly not enough for a high-value payment. It's also idempotent:
it tracks already-disbursed transaction IDs in the log and skips re-executing
anything it's already paid out, so running it twice doesn't double-pay anyone.

**The attack simulation.** Every time `payment_agent.py` runs, it constructs one
additional, deliberately forged authorization — transaction ID `RCPT-999-FORGED`
(never a real receipt ID), amount $999,999.99, `approver_identity` field set to
`"workflow_agent"` — but actually signs it with **`payment_agent`'s own private
key**. This is exactly the confused-deputy attack described above: something
pretending, via the payload's self-declared field, to be workflow-approved, without
actually holding workflow_agent's private key. Critically, this forged authorization
is run through the *exact same* verification loop as every real one — it's not
special-cased or intercepted separately. Verification checks the payload's claimed
signer, tries to verify the signature against `workflow_agent`'s real public key,
and fails, because the signature was never produced by that key. The script asserts
outright that this transaction ID ends up in the rejected list and never in the
executed list, and prints the exact reasoning: *"Signature verification against
workflow_agent's public key correctly failed, proving the self-declared approver
field is never trusted on its own — only a real signature is."* **What this proves:**
the security here isn't "we didn't think of that attack" — it's demonstrated,
on every single run, that the specific spoofing attempt this system is designed to
prevent is actually caught by the mechanism, not by a special case written to catch
that one input.

---

## 5. ClaimPilot AI Frontend

**Run:** `cd landing-page && npm install && npm run dev`, then open the printed
local URL.

The frontend is a demo layer on top of everything above — it renders the real
backend output everywhere it can, and clearly separates that from the parts that are
simulated because there's no live server behind this app. Walking through it in the
order a visitor would actually experience it:

**Landing page (`/`).** The marketing front door: a hero section with the real
value proposition, an animated "How ClaimPilot AI Works" timeline that mirrors the
actual Phase 2–5 flow (not an invented one) branching into the same four routed
outcomes described above, seven feature cards, a business-impact section (explicitly
labeled as architecture targets, not measured production metrics — this project has
never run at production scale), security and integrations sections, an FAQ
accordion, and a contact section. The floating chatbot (bottom-right, on every page)
answers questions by keyword-matching against a local dataset of 59+ Q&A pairs — no
API calls — and every policy number it states (the $75 meal cap, the $400 high-cost-city
lodging cap, the 60-day window, all of it) is pulled from the same
`policy_rulebook.json` values described in Section 2.1, so it can never contradict
the backend.

**Watch Demo → `/live-demo`.** This is the one-click, no-login public demo — click
it and you see all 12 real claims (the actual contents of `data/final_decisions.json`,
converted once into `src/data/claims.json` and never altered since), a category
spend chart, and the routing-outcomes donut. This is deliberately kept separate from
the personalized dashboard below and deliberately requires no login, so the "see it
work on real claims, no sign-up required" promise on the landing page stays true even
after login was added elsewhere in the app.

**Login → personalized Dashboard.** Login asks for an Employee ID and an official
email — no password anywhere — and validates the pair against the real employee
roster (`src/data/employees.json`, converted from `data/employee_roster.csv`) or a
session-registered demo account. A successful login lands on `/dashboard`, which is
where the real-vs-simulated split matters most: the KPI cards (Total to Reimburse,
Pending, Approved, Rejected, This Month), the Fraud & Anomaly chart, the Expense
Categories chart, and the Routing Outcomes donut are all filtered to *only* the
logged-in employee's own claims, while Department Spending stays company-wide
deliberately, as informational context to compare your own numbers against. This
was verified concretely, not assumed: logging in as Priya Nair (E001) shows a
different total, a different rejected count, and a different routing-outcome
breakdown than logging in as Sarah Johnson (E009) — real, different numbers for two
real employees, not the same aggregate view with a different name pasted on top.

**Upload Receipt.** A logged-in employee can drag-and-drop or pick a PDF; the app
runs a genuinely simulated "processing" animation (no OCR or model call actually
happens) and returns a mock extraction — vendor, amount, category, date — drawn from
a small pool of realistic combinations. The resulting claim is tagged with
`routed_status: "processing"` and the logged-in employee's actual `employee_id`, and
is stored in the browser's `localStorage` for the rest of the session (see
`src/utils/sessionClaims.js`), not sent anywhere. It then shows up immediately in
that same employee's "My recent claims" table on the dashboard.

**Why the real-vs-session split matters architecturally.** This is worth explaining
explicitly rather than leaving implicit: the aggregate KPIs and most charts are
scoped to the 12 real, backend-processed transactions specifically so that
uploading a mock receipt through the demo UI can never quietly inflate or distort
the numbers that are supposed to represent this project's actual, tested pipeline
output. A new upload is real in the sense that it's really stored and really shows
up in that employee's own claims list — but it hasn't been through Phase 3 or Phase
4, so it has no real risk score and no real duplicate/outlier signal, and the app
never pretends otherwise (its `routed_status` of `"processing"` and its lack of a
`risk_score` make that visible rather than papering over it with a fabricated
number).

**Contact section.** Two real tabs — Contact Sales and Book Demo — switch the
message form's placeholder to match intent; a Start Free Trial link (deliberately
*not* part of that tab group) navigates straight to `/register`, same destination as
the Hero's own button; and a plain-text line offers a real `mailto:` link as the one
genuinely working contact affordance in the section, since the tabs themselves don't
send anything anywhere.

---

## 6. Closing — What's Real, What's Simulated, and What Was a Judgment Call

### What's real

- All 12 transactions shown everywhere in the app — the live demo, the personalized
  dashboard, every chart — are the actual output of Phases 2 through 5, unaltered.
- Every dollar figure the app states anywhere (policy modal, chatbot, KPI cards) is
  traceable back to `policy_rulebook.json` or `final_decisions.json`.
- The duplicate/outlier flags used in the Fraud & Anomaly chart are the real
  `is_duplicate`/`is_outlier`/`outlier_ratio` values Phase 4 actually computed.
- The ReAct controller's step counts (3 / 4 / 5) are a real, reproducible consequence
  of running the actual code against the actual 12 receipts, not a scripted demo.
- The RSA signing, dual-control logic, and the attack simulation in Extension B all
  run real cryptographic operations against real generated keypairs — the only
  "mock" part is that no real payment gateway is called at the very end.

### What's simulated, and clearly labeled as such in the code and the UI

- **Receipt extraction on Upload Receipt** — no OCR or model call; a small pool of
  realistic mock results.
- **Frontend authentication** — Employee ID + email check against static data and
  `localStorage`, no password, no real session/token, no server.
- **Persistence for anything created in the frontend** — new registrations and
  uploaded claims live only in that browser's `localStorage`, gone if it's cleared.
- **The chatbot** — local keyword matching, not a live model call.
- **The contact form** — shows a success state locally; nothing is actually sent.
- **Travel Coupons / Hotel Offers and the business-impact percentages** — explicitly
  labeled illustrative in both the UI copy and the code comments.

### Known limitations — deliberate scope decisions, not oversights

- **RCPT-009's approver is unresolved, on purpose.** Sarah Johnson (E009, VP
  Operations) has no `manager_id` in the roster — she's the top of this small,
  fictional org chart. Rather than inventing a fake approver (a "Board of Directors"
  entry that doesn't exist in the roster) or silently skipping the transaction, the
  system surfaces this honestly: `approver_id: null` with an explicit, specific
  resolution note, and Phase 5's Claude-drafted summary is instructed to name the
  gap directly rather than write a generic "please approve" sentence that implies a
  normal approver exists. A real system would need a defined alternate escalation
  path for top-of-chain approvals; this prototype's roster simply doesn't model one,
  and pretending otherwise would be worse than surfacing the gap.
- **The meal cap is checked per-receipt, not per-person.** R-01's deterministic check
  compares the whole receipt's `amount_usd` against the $75 cap — there's no
  party-size field anywhere in the extraction schema. The $77.50-per-person framing
  you see in RCPT-006/RCPT-011's reasoning is Claude's own judgment during the
  reasoning escalation (triggered by "party of" appearing in the raw receipt text),
  not a structural calculation the deterministic layer performs. It works for these
  seeded cases because the raw text happens to spell out the party size in words;
  it wouldn't generalize to a receipt that didn't. Adding a real `party_size` field
  was a reasonable scope cut for a 2-day build, not something that was missed.
- **R-04 (airfare) has no enforced numeric limit.** It's a class-of-service rule
  (economy under 6 hours, premium economy over 6 hours with director approval) that
  depends on flight duration, which the extraction schema doesn't capture. The check
  deliberately returns "skipped" rather than guessing at a duration from a text
  description.
- **R-05's "business justification note" isn't a real field.** The rule says a ride
  over $100 needs one attached; the extraction schema has no place to put it, so
  *any* ride over $100 is treated as violated by default, regardless of whether a
  justification conceptually exists on the physical receipt. RCPT-008's flag is
  correct given what the system can actually see, not a false accusation.
- **The Finance Team approver is a fixed placeholder identity**
  (`finance@meridiancorp.com`), not looked up from a real finance department roster —
  this dummy dataset doesn't model one. Using a fixed department identity instead of
  incorrectly reusing the submitter's own direct manager was the deliberate fix here.
- **Dual-control (Extension B) was never organically exercised by the seed data** —
  every real compliant transaction is under the $500 threshold. It was verified with
  a purpose-built synthetic transaction, which is a real, passing test, but not the
  same as having watched it fire naturally end-to-end on the 12 seeded receipts.
- **Private agent keys are unencrypted PEM files on disk**, gitignored but not
  otherwise protected — explicitly called out in `identity.py`'s own docstring as
  something a real deployment would put in a proper key vault instead, not a gap
  anyone tried to hide.

Every item on this list was a conscious call made while building a 2-day prototype
meant to prove a specific set of ideas, not a production system. None of them were
discovered after the fact — they're the same trade-offs a competent engineer would
name unprompted if you asked "what would you build next."
