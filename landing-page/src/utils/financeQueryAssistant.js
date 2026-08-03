// A handful of concrete, finance-scoped question patterns that compute a
// real answer from live claims data (financeQueue - claims where
// approver_level === "finance"). This is NOT a general financial-insight
// engine: only these 3 patterns are recognized, mirroring the same scoped
// approach teamQueryAssistant.js uses for managers. Anything else returns
// null so ChatAssistant.jsx falls through to the static findChatbotResponse
// FAQ dataset, unchanged.
import { formatUsd } from "./format";

function matchPendingAmount(text, financeQueue) {
  if (!/how much is pending|pending amount|total pending/.test(text)) return null;

  const pending = financeQueue.filter((c) => c.approval_action_required);
  if (pending.length === 0) {
    return "Nothing is currently pending finance review.";
  }
  const total = pending.reduce((sum, c) => sum + c.amount_usd, 0);
  return `${pending.length} claim(s) pending finance review, totaling ${formatUsd(total)}.`;
}

function matchDuplicates(text, financeQueue) {
  if (!text.includes("duplicate")) return null;

  const fieldAvailable = financeQueue.some((c) => "is_duplicate" in c);
  if (!fieldAvailable) {
    return "Duplicate flags aren't available in the current data yet.";
  }
  const duplicates = financeQueue.filter((c) => c.is_duplicate === true);
  if (duplicates.length === 0) {
    return "No duplicate flags in the current finance queue.";
  }
  const list = duplicates
    .map((c) => `${c.receipt_id} (duplicate of ${c.duplicate_of.join(", ")})`)
    .join(", ");
  return `${duplicates.length} claim(s) flagged as duplicates: ${list}.`;
}

function matchHighRisk(text, financeQueue) {
  if (!/high[\s-]risk/.test(text)) return null;

  const highRisk = financeQueue.filter((c) => c.risk_score === "high");
  if (highRisk.length === 0) {
    return "No high-risk claims in the current finance queue.";
  }
  const list = highRisk
    .map((c) => `${c.receipt_id} (${c.vendor}, ${formatUsd(c.amount_usd)})`)
    .join(", ");
  return `${highRisk.length} high-risk claim(s): ${list}.`;
}

export function answerFinanceQuestion(message, { financeQueue }) {
  const text = message.toLowerCase();

  return (
    matchPendingAmount(text, financeQueue) ||
    matchDuplicates(text, financeQueue) ||
    matchHighRisk(text, financeQueue) ||
    null
  );
}
