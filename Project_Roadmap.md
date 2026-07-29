# Project Roadmap — First Prototype (2-Day Plan)

This is the plan for building a small, working first version of the Expense Reimbursement Automation tool in just 2 days. It is not the full product — it is a quick proof that the core idea works: a receipt goes in, Claude reads it, checks it against company rules, catches anything suspicious, and gives a decision.

We don't have access to a real company system yet, so every phase below also creates or uses simple made-up data (fake receipts, a fake employee list, fake rules) so the demo has something real to work with.

Total time: about 14.5 hours spread across 2 days.

---

## What We Are Building (and Not Building)

In scope for these 2 days:
- Reading receipts and pulling out the details (vendor, amount, date, etc.)
- Checking those details against company expense rules
- Spotting duplicate or suspicious expenses
- Deciding who needs to approve each expense
- A simple screen to show all of this happening

Not in scope for these 2 days (this needs real company systems and more time):
- Connecting to a real accounting/HR system
- A full employee-facing app
- Testing with real employees

---

## Day 1

### Phase 1: Setting Up Our Practice Data
**Time: 1.5 hours**

Before we can build anything, we need something to test it on. This phase is just about getting that ready.

What we do:
- Set up folders for our data, code, and results
- Create a list of 10 fake employees with their departments and managers
- Write down 10 company expense rules (e.g., meals under $75, no alcohol, hotel limits)
- Set simple rules for who approves what amount

What we end up with: three ready-to-use files, the employee list, the rulebook, and the approval rules.

---

### Phase 2: Teaching Claude to Read Receipts
**Time: 3 hours**

This is the heart of the whole idea, turning a messy receipt into clean, organized information.

What we do:
- Write out 12 practice receipts (restaurant bill, taxi ride, hotel bill, flight ticket, office supplies, etc.) as if they were scanned or photographed
- On purpose, we make a few of them tricky: two are actually the same expense submitted twice, one is blurry and hard to read, and one is priced way too high
- Ask Claude to read each receipt and pull out the vendor, date, amount, currency, and category, plus a confidence score
- Receipts arrive in multiple currencies (INR, KRW, EUR, GBP, AED, JPY, USD) and must be converted to USD before being checked against policy_rulebook.json, since all policy limits are USD-denominated

What we end up with: all 12 receipts turned into neat, organized records.

---

### Phase 3: Checking Expenses Against the Rules
**Time: 2.5 hours**

Now that we have clean data, we check whether each expense actually follows company policy.

What we do:
- Run each expense through the rulebook (spending limits, receipt requirements, banned categories)
- For trickier cases that a simple rule can't judge, like whether a taxi fare is reasonable, ask Claude to use judgment and explain its reasoning
- Attach a clear result to every expense: approved or flagged, with a plain-English reason why

What we end up with: every expense now has a decision and a reason attached to it. The fake alcohol charge from Phase 2 should get caught here, along with RCPT-008 (a ~$145 taxi fare that exceeds the $100 justification threshold in rule R-05 with no business justification note attached).

*End of Day 1*

---

## Day 2

### Phase 4: Catching Duplicates and Weird Spending
**Time: 2 hours**

Some problems don't show up from rules alone, they show up from patterns. This phase looks for those.

What we do:
- Check for the same expense being submitted more than once
- Compare each expense to the average for its category, and flag anything way higher than normal
- Ask Claude to explain why something looks suspicious

What we end up with: the duplicate receipts and the overpriced one from Phase 2 should now be correctly flagged.

---

### Phase 5: Deciding Who Needs to Approve What
**Time: 2 hours**

An expense being flagged isn't the end of the story, someone needs to actually review and approve it. This phase handles that routing.

What we do:
- Use simple rules to decide the next step for each expense: auto-approved, needs a manager's approval, needs finance's approval, or rejected
- Match each expense to the right person to approve it, using the employee list
- Ask Claude to write a one-line summary for the approver, so they don't have to read the whole thing

What we end up with: every single expense now has a final status and a person responsible for the next step.

---

### Phase 6: Building a Simple Demo Screen
**Time: 2.5 hours**

All of this is currently just data in files, this phase makes it visible so people can actually see it working.

What we do:
- Build one simple webpage showing all the expenses in a table (vendor, amount, category, decision, status, reason)
- Let people filter by status
- Let people click into any expense to see its full journey, from raw receipt, to Claude's reading of it, to the policy check, to the risk flag, to who's approving it

What we end up with: a working, clickable demo, no more digging through raw files to see results.

---

### Phase 7: Final Check and Wrap-Up
**Time: 1 hour**

Before calling it done, we make sure everything actually works from start to finish, and we prepare it for a walkthrough.

What we do:
- Run the whole thing again from scratch, start to finish
- Double check the tricky cases were caught correctly (duplicate expense, alcohol charge, overpriced lunch, unclear receipt)
- Write a short one-page guide: what to click, what to say, what each example proves

What we end up with: a working prototype we can confidently demo, plus simple notes for anyone presenting it.

---

## The Practice Data We Already Have Ready

Four files were already created so the phases above can start right away:

- employee_roster.csv: 10 fake employees across 3 departments, with their managers
- policy_rulebook.json: 10 company expense rules
- approval_matrix.json: the rules for who approves what amount
- raw_receipts.json: 12 practice receipts, with the tricky cases built in on purpose (a duplicate pair, a rule-breaking charge, a blurry receipt, and an overpriced one)
