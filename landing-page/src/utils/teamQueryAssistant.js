// A handful of concrete, manager-scoped question patterns that compute a
// real answer from live claims data (myTeamClaims - claims resolved to the
// current manager as approver). This is NOT a general-purpose data query
// engine: only these 5 patterns are recognized. Anything else returns null
// so ChatAssistant.jsx falls through to the static findChatbotResponse FAQ
// dataset, unchanged from before.
import { formatUsd } from "./format";

const SPEND_PATTERNS = [
  /how much has ([a-z .'-]+?) spent/i,
  /how much did ([a-z .'-]+?) spend/i,
  /([a-z .'-]+?)'s (?:total )?spend(?:ing)?/i,
  /spending (?:for|by) ([a-z .'-]+)/i,
];

function extractEmployeeName(text) {
  for (const pattern of SPEND_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function findEmployeeByName(queryName, employees) {
  const q = queryName.toLowerCase().trim();
  const exact = employees.find((e) => e.name.toLowerCase() === q);
  if (exact) return exact;

  const queryWords = q.split(/\s+/);
  return employees.find((e) => {
    const nameWords = e.name.toLowerCase().split(/\s+/);
    return queryWords.some((w) => nameWords.includes(w));
  });
}

function matchEmployeeSpend(text, myTeamClaims, employees) {
  const name = extractEmployeeName(text);
  if (!name) return null;

  const person = findEmployeeByName(name, employees);
  if (!person) return null;

  const personClaims = myTeamClaims.filter((c) => c.employee_id === person.employee_id);
  if (personClaims.length === 0) {
    return `${person.name} has no claims currently routed to you as approver.`;
  }
  const spend = personClaims.reduce((sum, c) => sum + c.amount_usd, 0);
  return `${person.name} has ${formatUsd(spend)} across ${personClaims.length} claim(s) routed to you as approver.`;
}

function matchFlagged(text, myTeamClaims) {
  if (!/\b(flagged|policy violation|violations)\b/.test(text)) return null;

  const flagged = myTeamClaims.filter((c) => c.decision === "flagged");
  if (flagged.length === 0) {
    return "No claims in your queue are currently flagged for a policy violation.";
  }
  const list = flagged
    .map((c) => `${c.receipt_id} (${c.vendor}, ${formatUsd(c.amount_usd)})`)
    .join(", ");
  return `${flagged.length} claim(s) flagged for a policy issue: ${list}.`;
}

function matchDuplicate(text, myTeamClaims) {
  if (!text.includes("duplicate")) return null;

  const fieldAvailable = myTeamClaims.some((c) => "is_duplicate" in c);
  if (!fieldAvailable) {
    return "Duplicate flags aren't available in the current data yet.";
  }
  const duplicates = myTeamClaims.filter((c) => c.is_duplicate === true);
  if (duplicates.length === 0) {
    return "No duplicate flags in the current data.";
  }
  const list = duplicates
    .map((c) => `${c.receipt_id} (duplicate of ${c.duplicate_of.join(", ")})`)
    .join(", ");
  return `${duplicates.length} claim(s) flagged as duplicates: ${list}.`;
}

function matchPending(text, myTeamClaims, managerActions) {
  if (!/\b(pending|awaiting (my )?approval)\b/.test(text) && !/how many.*approve/.test(text)) {
    return null;
  }

  const pending = myTeamClaims.filter(
    (c) => c.approval_action_required && !managerActions[c.receipt_id]?.statusOverride
  );
  if (pending.length === 0) {
    return "Nothing is currently pending your approval.";
  }
  const total = pending.reduce((sum, c) => sum + c.amount_usd, 0);
  return `${pending.length} claim(s) are currently pending your approval, totaling ${formatUsd(total)}.`;
}

function matchHistory(text, myTeamClaims) {
  if (!/\b(claim history|my team'?s claims|team claims|claim log)\b/.test(text)) return null;

  if (myTeamClaims.length === 0) {
    return "No claims have been routed to you as approver yet.";
  }
  const recent = [...myTeamClaims]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(
      (c) => `${c.receipt_id} - ${c.employee_name}, ${c.vendor}, ${formatUsd(c.amount_usd)} (${c.routed_status})`
    );
  return `Most recent claims routed to you (up to 5 of ${myTeamClaims.length}): ${recent.join("; ")}.`;
}

export function answerTeamQuestion(message, { myTeamClaims, employees, managerActions }) {
  const text = message.toLowerCase();

  return (
    matchEmployeeSpend(text, myTeamClaims, employees) ||
    matchFlagged(text, myTeamClaims) ||
    matchDuplicate(text, myTeamClaims) ||
    matchPending(text, myTeamClaims, managerActions) ||
    matchHistory(text, myTeamClaims) ||
    null
  );
}
