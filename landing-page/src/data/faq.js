export const FAQ_ITEMS = [
  {
    key: "how-extraction-works",
    question: "How does AI receipt extraction work?",
    answer:
      "Upload a receipt as a photo or PDF and the extraction engine reads it directly, pulling vendor, date, amount, currency, and category into a structured record - no manual data entry.",
  },
  {
    key: "flagged-claim",
    question: "What happens if my claim is flagged?",
    answer:
      "Flagged claims aren't rejected automatically. They're routed to a manager or Finance with an AI-generated explanation of exactly which policy rule triggered the flag, so a human makes the final call with full context.",
  },
  {
    key: "reimbursement-time",
    question: "How long does reimbursement take?",
    answer:
      "Auto-approved claims move straight to disbursement. Claims needing manager or Finance review depend on how quickly that approver responds - the routing and summary are ready the moment the claim is submitted.",
  },
  {
    key: "categories-supported",
    question: "What expense categories are supported?",
    answer:
      "Meals, lodging, ground transport, mileage, and general purchases are all covered today, each checked against its own policy limit rather than one blanket cap.",
  },
  {
    key: "erp-integration",
    question: "Can I integrate ClaimPilot AI with our existing ERP or payroll system?",
    answer:
      "Yes - see the Integrations section above. ClaimPilot AI is built to sit alongside systems like SAP, Oracle, Workday, and your payroll provider rather than replace them.",
  },
  {
    key: "fraud-detection",
    question: "How is fraud detected?",
    answer:
      "Every claim is checked for duplicate submissions and statistical outliers against category norms, then genuinely ambiguous cases get an AI-generated risk explanation - clean claims never need one.",
  },
  {
    key: "data-security",
    question: "Is my data secure?",
    answer:
      "Yes - see the Security section above for the full list of encryption, access-control, and audit safeguards in place.",
  },
  {
    key: "resubmit-claim",
    question: "What if I need to resubmit a claim?",
    answer:
      "Rejected or returned claims can be corrected and resubmitted with the same receipt - the pipeline re-runs extraction, validation, and routing from scratch on the new submission.",
  },
];
