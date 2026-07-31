// Same real values as data/policy_rulebook.json - kept consistent with the
// chatbot dataset (src/data/chatbotResponses.js) so this never contradicts
// the rest of the system.
export const POLICY_SUMMARY = [
  {
    rule: "Meals",
    limit: "$75 per meal",
    note: "Alcohol is never reimbursable and must be itemized separately if it's on the same receipt.",
  },
  {
    rule: "Lodging",
    limit: "$250/night ($400/night in NYC, London, Tokyo, Dubai)",
    note: "The higher cap only applies to those four pre-approved high-cost cities.",
  },
  {
    rule: "Ground Transport",
    limit: "$100 per ride",
    note: "Rides over $100 are reimbursable but require a written business justification.",
  },
  {
    rule: "Mileage",
    limit: "$0.67 per mile",
    note: "The IRS standard rate. An odometer log is required for trips over 50 miles.",
  },
  {
    rule: "Per Diem (International)",
    limit: "$150 per day",
    note: "Applies to international travel over 24 hours, covering meals and incidentals.",
  },
  {
    rule: "Office Supplies",
    limit: "$200 per purchase",
    note: "Purchases over $200 need manager pre-approval and an asset tag.",
  },
  {
    rule: "Receipt Requirement",
    limit: "$25 threshold",
    note: "Any expense at or above $25 requires an itemized receipt, regardless of category.",
  },
  {
    rule: "Submission Window",
    limit: "60 days",
    note: "Expenses must be submitted within 60 days of the transaction date.",
  },
];
