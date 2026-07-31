// Landing page feature-card copy. Kept as data (not inline JSX) so the
// content is easy to review/edit independent of layout.
export const FEATURES = [
  {
    key: "ai-receipt-processing",
    title: "AI Receipt Processing",
    description: "Upload JPG, PNG, PDF.",
    tagsLabel: "Extract:",
    tags: [
      "Merchant",
      "Date",
      "Amount",
      "GST",
      "VAT",
      "Currency",
      "Invoice Number",
      "Expense Category",
      "Payment Method",
    ],
  },
  {
    key: "intelligent-data-extraction",
    title: "Intelligent Data Extraction",
    description:
      "Convert unstructured receipts into structured expense records automatically.",
  },
  {
    key: "smart-policy-validation",
    title: "Smart Policy Validation",
    tagsLabel: "Validate:",
    tags: [
      "Meal Limits",
      "Hotel Limits",
      "Travel Policies",
      "Per Diem",
      "GST Compliance",
      "Duplicate Checks",
      "Weekend Rules",
    ],
    outro: "Show instant policy feedback.",
  },
  {
    key: "ai-fraud-detection",
    title: "AI Fraud Detection",
    tagsLabel: "Detect:",
    tags: [
      "Duplicate Receipts",
      "Edited Bills",
      "Suspicious Spending",
      "High Risk Vendors",
      "Outlier Expenses",
      "Policy Abuse",
    ],
    outro: "Generate AI Risk Score.",
  },
  {
    key: "automated-approval-workflow",
    title: "Automated Approval Workflow",
    description:
      "Routes every claim by policy compliance, risk score, and amount - the same logic this project's own workflow engine runs. Managers and Finance receive AI-generated approval recommendations for each claim.",
  },
  {
    key: "ai-expense-assistant",
    title: "AI Expense Assistant",
    tagsLabel: "Employees can ask:",
    tags: [
      "Why was my claim rejected?",
      "Can I claim hotel expenses?",
      "GST policy?",
      "Meal reimbursement?",
      "Travel allowance?",
      "Duplicate receipt?",
      "How do I resubmit a claim?",
      "What is my reimbursement limit?",
    ],
    outro: "Provides intelligent predefined responses.",
  },
  {
    key: "expense-analytics",
    title: "Expense Analytics",
    tagsLabel: "Show:",
    tags: [
      "Total Expenses",
      "Pending Claims",
      "Approved Claims",
      "Rejected Claims",
      "Department Spending",
      "Fraud Alerts",
      "Policy Violations",
      "Monthly Trends",
      "Processing Time",
    ],
  },
];
