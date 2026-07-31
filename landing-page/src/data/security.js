// Card titles match the requested spec exactly. Descriptions use "designed
// around" / "architected against" rather than claiming formal certification -
// this is a prototype with no compliance audit behind it yet.
export const SECURITY_FEATURES = [
  {
    key: "encryption",
    title: "End-to-End Encryption",
    description:
      "All data in transit and at rest is encrypted, from receipt upload through final disbursement.",
  },
  {
    key: "rbac",
    title: "Role Based Access",
    description:
      "Employees, managers, and finance approvers each see only the claims and data their role requires.",
  },
  {
    key: "audit-logs",
    title: "Audit Logs",
    description:
      "Every extraction, validation, and approval decision is logged and traceable back to the data that produced it.",
  },
  {
    key: "gdpr",
    title: "GDPR",
    description:
      "Data handling is designed around GDPR principles - minimal retention, explicit purpose, and the right to erasure.",
  },
  {
    key: "soc2",
    title: "SOC 2",
    description:
      "Architected against SOC 2 control objectives for security, availability, and confidentiality.",
  },
  {
    key: "mfa",
    title: "MFA",
    description:
      "Multi-factor authentication on every account, so a password alone is never enough to sign in.",
  },
  {
    key: "secure-cloud",
    title: "Secure Cloud",
    description:
      "Deployed on infrastructure with network isolation and least-privilege access controls throughout.",
  },
];
