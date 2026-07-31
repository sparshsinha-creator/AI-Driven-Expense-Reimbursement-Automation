// Keyword-matched Q&A dataset for the chatbot - no API calls. Policy figures
// below are pulled directly from data/policy_rulebook.json so the chatbot
// never contradicts the rest of the system.
export const CHATBOT_RESPONSES = [
  {
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon"],
    response: "Hi there! I'm the ClaimPilot AI assistant. Ask me about receipts, policy limits, approvals, security, or anything else about how claims move through the pipeline.",
  },
  {
    keywords: ["thanks", "thank you", "appreciate it"],
    response: "You're welcome! Let me know if there's anything else about your claim or our policies I can help with.",
  },
  {
    keywords: ["what is a receipt", "receipt processing", "how do receipts work"],
    response: "You upload a receipt as a photo or PDF and AI extraction reads it directly - pulling out vendor, date, amount, currency, and category into a structured record automatically.",
  },
  {
    keywords: ["upload a receipt", "how do i upload", "receipt upload", "upload"],
    response: "Upload your receipt as a JPG, PNG, or PDF from the claim submission screen. Extraction runs automatically the moment it's uploaded - no manual data entry needed.",
  },
  {
    keywords: ["receipt status", "track my receipt", "where is my receipt"],
    response: "Once uploaded, a receipt moves through extraction, policy validation, and anomaly checks automatically. You can check its current stage from your claims dashboard.",
  },
  {
    keywords: ["ocr", "scan my receipt", "receipt scanning", "extraction accuracy"],
    response: "Receipts are read by AI extraction rather than traditional OCR templates - it pulls vendor, date, amount, currency, and category directly, along with a confidence score for each field.",
  },
  {
    keywords: ["confidence score", "low confidence", "extraction confidence"],
    response: "Every extracted receipt gets a confidence score. Low-confidence extractions are automatically flagged for a quick human review rather than silently guessed at.",
  },
  {
    keywords: ["invoice"],
    response: "Invoices are processed the same way as receipts - vendor, date, amount, and invoice number are extracted automatically and checked against policy.",
  },
  {
    keywords: ["invoice number"],
    response: "The invoice number is one of the fields extracted automatically from your receipt or invoice during processing.",
  },
  {
    keywords: ["gst"],
    response: "GST amounts are extracted from your receipt automatically as part of the structured data, so they're captured alongside the base amount and total.",
  },
  {
    keywords: ["vat"],
    response: "VAT amounts are extracted from your receipt automatically, the same way GST is - captured as a separate field alongside the total.",
  },
  {
    keywords: ["currency", "foreign currency", "exchange rate", "multi-currency"],
    response: "Claims submitted in a foreign currency are automatically converted to USD during extraction, so every claim is comparable and policy limits apply consistently.",
  },
  {
    keywords: ["duplicate"],
    response: "Duplicate submissions are detected by matching vendor, date, and amount across your claims - genuine duplicates are flagged before they reach approval.",
  },
  {
    keywords: ["fraud"],
    response: "Every claim is checked for duplicate submissions and statistical outliers against category norms. Genuinely ambiguous cases get an AI-generated risk explanation - clean claims never need one.",
  },
  {
    keywords: ["high risk", "risk score"],
    response: "Claims flagged as duplicates or outliers get a risk score and an explanation of why. A high risk score routes the claim to Finance for review rather than auto-approving it.",
  },
  {
    keywords: ["anomaly", "outlier"],
    response: "Outlier detection compares your claim's amount to the average for its category. Claims well above that average get flagged for review, not automatically rejected.",
  },
  {
    keywords: ["vendor", "merchant"],
    response: "The vendor or merchant name is extracted automatically from your receipt and used for duplicate and category checks.",
  },
  {
    keywords: ["meal", "meals", "lunch", "dinner", "breakfast", "food"],
    response: "Meals are capped at $75 per meal (breakfast, lunch, or dinner). Alcohol is never reimbursable and must be itemized separately if it's on the same receipt. An itemized receipt is required for any meal at or above $25.",
  },
  {
    keywords: ["alcohol", "wine", "beer", "bar tab", "drinks"],
    response: "Alcohol is not reimbursable under any circumstance, including client entertainment - it's a zero-tolerance rule, not a spending cap.",
  },
  {
    keywords: ["hotel", "lodging", "accommodation", "where can i stay"],
    response: "Lodging is capped at $250 per night for standard cities. That cap rises to $400/night for pre-approved high-cost cities: New York City, London, Tokyo, and Dubai.",
  },
  {
    keywords: ["flight", "airfare", "plane ticket", "travel class"],
    response: "Economy class is required for flights under 6 hours. Premium economy is allowed for flights over 6 hours, but needs director approval.",
  },
  {
    keywords: ["travel coupon", "travel voucher"],
    response: "Travel coupons and vouchers are processed like any other travel receipt - upload it and extraction will pull the vendor, amount, and date automatically.",
  },
  {
    keywords: ["taxi", "uber", "rideshare", "ground transport", "cab"],
    response: "Ground transport (taxis, rideshares) is capped at $100 per ride. Rides over $100 are still reimbursable, but require a written business justification note.",
  },
  {
    keywords: ["mileage", "personal vehicle", "drove my car", "miles"],
    response: "Personal vehicle mileage is reimbursed at $0.67 per mile - the IRS standard rate. An odometer log is required for trips over 50 miles.",
  },
  {
    keywords: ["per diem", "perdiem", "international travel", "incidentals"],
    response: "International travel over 24 hours qualifies for a $150/day per-diem covering meals and incidentals. Itemized receipts aren't required under per-diem.",
  },
  {
    keywords: ["office supplies", "equipment", "supplies"],
    response: "Office supplies and equipment are capped at $200 per purchase. Anything over $200 needs manager pre-approval and an asset tag.",
  },
  {
    keywords: ["expense category", "expense categories", "what categories"],
    response: "Supported categories are meals, lodging, ground transport, mileage, per-diem, and office supplies - each checked against its own policy limit rather than one blanket cap.",
  },
  {
    keywords: ["expense limit", "spending limit", "how much can i spend", "cap"],
    response: "Limits vary by category: $75/meal, $250/night lodging ($400 in NYC, London, Tokyo, or Dubai), $100/ride ground transport, $0.67/mile, $150/day international per-diem, and $200/purchase for office supplies.",
  },
  {
    keywords: ["weekend policy", "weekend rule", "weekend expense"],
    response: "Weekend expenses go through the same category caps and validation as any other day - there's no separate weekend cap, but weekend meal or transport claims may get an extra look during anomaly checks.",
  },
  {
    keywords: ["receipt required", "need a receipt", "itemized receipt"],
    response: "Any expense at or above $25 requires an itemized receipt, regardless of category.",
  },
  {
    keywords: ["submission window", "deadline", "how long to submit", "late claim", "60 days"],
    response: "You have 60 days from the transaction date to submit an expense claim. After that window, the claim is out of policy.",
  },
  {
    keywords: ["how do i submit a claim", "submit a claim", "file a claim"],
    response: "Submit a claim by uploading your receipt - extraction, policy validation, and routing all run automatically once you do.",
  },
  {
    keywords: [
      "claim rejected",
      "claim was rejected",
      "claim is rejected",
      "denied",
      "rejection",
      "why was my claim rejected",
      "why is my claim rejected",
    ],
    response: "A claim is rejected when it hits a non-negotiable policy rule - most commonly the zero-tolerance alcohol rule. You'll get an explanation of exactly which rule triggered it.",
  },
  {
    keywords: ["claim status", "track my claim", "where is my claim"],
    response: "Your claim's current stage - extraction, validation, anomaly check, or routing - is visible from your claims dashboard at every step.",
  },
  {
    keywords: ["policy", "rules", "what are the rules"],
    response: "Policy is enforced through deterministic rule checks (spending caps, receipt requirements, submission windows) plus AI reasoning for anything that needs judgment, like a justified exception.",
  },
  {
    keywords: ["approval", "approve my claim", "how does approval work"],
    response: "Compliant, low-risk claims are auto-approved. Flagged or higher-value claims route to a manager or Finance, each with an AI-generated summary explaining why.",
  },
  {
    keywords: ["approval pending", "waiting for approval", "still pending"],
    response: "A pending claim is waiting on its assigned approver - a manager or Finance - who received an AI-generated summary explaining what needs their judgment.",
  },
  {
    keywords: ["manager approval"],
    response: "Claims that need a human decision but aren't high-value or high-risk enough for Finance are routed to your manager, along with an AI-generated summary of the claim.",
  },
  {
    keywords: ["manager"],
    response: "Your manager is resolved automatically from the employee roster and only gets involved when a claim needs their judgment call.",
  },
  {
    keywords: ["finance review"],
    response: "High-value or higher-risk claims route to Finance rather than a direct manager, since those decisions carry more weight.",
  },
  {
    keywords: ["finance"],
    response: "The Finance team reviews claims that are high-value, high-risk, or otherwise need financial sign-off beyond a manager's approval.",
  },
  {
    keywords: ["who approves", "approval matrix", "routing", "how is my claim routed"],
    response: "Routing is decided by an approval matrix: policy compliance, risk score, and claim amount together determine whether a claim is auto-approved, sent to a manager, sent to Finance, or rejected.",
  },
  {
    keywords: ["reimbursement", "reimburse", "get paid back", "payment", "disbursement", "when will i get paid"],
    response: "Once a claim is approved, a signed payment authorization is issued and funds are disbursed to you - the same signed-authorization flow this project's payment agent actually runs.",
  },
  {
    keywords: ["processing time", "how long does it take", "turnaround"],
    response: "Auto-approved claims move straight to disbursement. Claims needing manager or Finance review depend on how quickly that approver responds - the routing and summary are ready the moment you submit.",
  },
  {
    keywords: ["employee"],
    response: "Employees submit claims with a receipt attached - everything after that (extraction, validation, routing) runs automatically.",
  },
  {
    keywords: ["dashboard"],
    response: "The dashboard shows real claim data: totals, approval status breakdowns, category spending, and flagged claims, all from this pipeline's actual output.",
  },
  {
    keywords: ["analytics", "reports", "insights"],
    response: "Analytics cover total expenses, pending vs. approved vs. rejected claims, department spending, fraud alerts, policy violations, and processing time trends.",
  },
  {
    keywords: ["security", "encrypted", "encryption"],
    response: "Security covers end-to-end encryption, role-based access, audit logs, and secure cloud infrastructure - see the Security section above for the full list.",
  },
  {
    keywords: ["soc2", "soc 2"],
    response: "The platform is architected against SOC 2 control objectives for security, availability, and confidentiality.",
  },
  {
    keywords: ["gdpr"],
    response: "Data handling is designed around GDPR principles - minimal retention, explicit purpose, and the right to erasure.",
  },
  {
    keywords: ["mfa", "authentication", "2fa", "two factor", "two-factor"],
    response: "Multi-factor authentication is supported on every account, so a password alone is never enough to sign in.",
  },
  {
    keywords: ["login", "log in", "sign in"],
    response: "You can log in from the Login page. Note this demo build doesn't have a live authentication backend wired up yet.",
  },
  {
    keywords: ["register", "registration", "sign up", "create an account"],
    response: "You can create an account from the Register page. Like Login, this demo build's registration form isn't connected to a real backend yet.",
  },
  {
    keywords: ["logout", "log out", "sign out"],
    response: "You can sign out from your account menu once authentication is fully wired up - this demo build doesn't persist a real session yet.",
  },
  {
    keywords: ["erp"],
    response: "ClaimPilot AI is built to work alongside any ERP system your finance team already relies on, rather than replacing it.",
  },
  {
    keywords: ["integration", "integrate", "sap", "oracle", "workday", "quickbooks", "slack", "microsoft teams", "payroll"],
    response: "ClaimPilot AI connects with systems like SAP, Oracle, Workday, QuickBooks, Slack, Microsoft Teams, and payroll providers - see the Integrations section above.",
  },
  {
    keywords: ["ai", "artificial intelligence"],
    response: "AI is used for receipt extraction, policy reasoning on ambiguous cases, anomaly/risk explanations, and approval summaries - it's only called when a claim genuinely needs judgment, not on every single field.",
  },
  {
    keywords: ["support", "help"],
    response: "For anything I can't answer here, reach out through the Contact section below - Contact Sales, Book Demo, or the contact form all work.",
  },
  {
    keywords: ["contact", "reach you", "email you", "get in touch"],
    response: "You can reach us through the Contact section - Contact Sales, Book Demo, or Start Free Trial, plus a contact form if you'd rather write in.",
  },
];

const FALLBACK_RESPONSE =
  "I don't have a specific answer for that yet - try asking about receipts, policy limits, approvals, security, or integrations, or reach out via the Contact section below.";

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary matching, not plain substring - a bare .includes() check let
// short keywords like "ai" false-match inside unrelated words (it's a
// substring of "claim"), and let "support" match inside "supported" and win
// over a more specific keyword like "gdpr" on the same question.
export function findChatbotResponse(message) {
  const text = message.toLowerCase();
  let bestEntry = null;
  let bestScore = 0;

  for (const entry of CHATBOT_RESPONSES) {
    for (const keyword of entry.keywords) {
      // Trailing "s?" tolerates simple plurals ("integrations" should still
      // match keyword "integration") without reopening the bare-substring
      // bug the word boundary was added to fix.
      const pattern = new RegExp(`\\b${escapeRegExp(keyword)}s?\\b`);
      if (pattern.test(text) && keyword.length > bestScore) {
        bestScore = keyword.length;
        bestEntry = entry;
      }
    }
  }

  return bestEntry ? bestEntry.response : FALLBACK_RESPONSE;
}
