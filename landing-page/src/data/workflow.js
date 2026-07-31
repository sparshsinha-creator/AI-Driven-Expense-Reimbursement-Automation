// Mirrors this project's actual Phase 2-5 pipeline - not an invented flow.
export const WORKFLOW_STEPS = [
  {
    key: "employee",
    label: "Employee",
    description: "Submits an expense claim with a receipt attached.",
  },
  {
    key: "receipt-upload",
    label: "Receipt Upload",
    description: "The receipt image or PDF enters the pipeline as raw, unstructured input.",
  },
  {
    key: "ai-extraction",
    label: "AI Extraction",
    phase: "Phase 2",
    description:
      "Extracts vendor, date, amount, currency, category, and a confidence score from the receipt.",
  },
  {
    key: "policy-validation",
    label: "Policy Validation",
    phase: "Phase 3",
    description:
      "Deterministic rule checks plus AI reasoning decide whether the claim is compliant or flagged.",
  },
  {
    key: "anomaly-check",
    label: "Anomaly & Duplicate Check",
    phase: "Phase 4",
    description:
      "Clusters duplicate submissions and flags statistical outliers against category norms.",
  },
  {
    key: "workflow-routing",
    label: "Workflow Routing",
    phase: "Phase 5",
    description:
      "Routes the claim by policy compliance, risk score, and amount against the approval matrix.",
  },
];

export const WORKFLOW_BRANCHES = [
  { key: "rejected", label: "Rejected", tone: "danger", outcome: "stop" },
  { key: "auto-approved", label: "Auto-Approved", tone: "success", outcome: "reimbursement" },
  { key: "manager-approval", label: "Manager Approval", tone: "warning", outcome: "reimbursement" },
  { key: "finance-review", label: "Finance Review", tone: "warning", outcome: "reimbursement" },
];
