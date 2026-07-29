# AI-Driven Expense Reimbursement Automation

Prototype build for the expense reimbursement automation challenge. Automates receipt extraction, policy validation, anomaly detection, and workflow routing, with a public landing page and an internal working dashboard.

## Folder structure

- docs/ - Full phased roadmap (AI_Expense_Reimbursement_Phased_Plan.pdf) and the 2-day prototype build plan (Prototype_2Day_Build_Plan.pdf)
- data/ - Dummy datasets: employee_roster.csv, policy_rulebook.json, approval_matrix.json, raw_receipts.json
- src/extraction/ - Phase 2: Claude receipt-to-structured-JSON extraction
- src/validation/ - Phase 3: policy rules engine + Claude reasoning for ambiguous cases
- src/anomaly/ - Phase 4: duplicate and outlier detection
- src/workflow/ - Phase 5: approval routing simulation
- output/ - Generated pipeline results (transactions.json, validated_transactions.json, risk_scored_transactions.json, final_decisions.json)
- landing-page/ - Public marketing/product page
- dashboard/ - Internal working demo that visualizes output/final_decisions.json
- tests/ - End-to-end pipeline test script

## Status

Folder structure scaffolded. Pipeline code, landing page, and dashboard not yet built.
