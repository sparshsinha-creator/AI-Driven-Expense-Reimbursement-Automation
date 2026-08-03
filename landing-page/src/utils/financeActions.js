// Verify/Approve, Reject, and comment actions taken from the Finance
// Dashboard aren't sent to any real backend - there isn't one, same as
// managerActions.js (which this mirrors with its own storage key, since a
// finance-level claim and a manager-level claim are reviewed from separate
// dashboards and shouldn't share session state).
const STORAGE_KEY = "claimpilot_finance_actions";

export function getFinanceActions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFinanceActions(actions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch {
    // localStorage unavailable - the action still applies for this page view.
  }
  return actions;
}

function getEntry(actions, receiptId) {
  return actions[receiptId] ?? { statusOverride: null, comments: [], paymentHeld: false };
}

export function setClaimStatusOverride(receiptId, statusOverride) {
  const actions = getFinanceActions();
  const entry = getEntry(actions, receiptId);
  return saveFinanceActions({
    ...actions,
    [receiptId]: { ...entry, statusOverride },
  });
}

// Hold/release is a separate axis from the approve/reject decision above -
// a claim can be approved and still have its payment held, or vice versa.
// Brand new session-local state, not connected to data/payment_authorizations.json
// or data/disbursement_log.json (those are a real but unrelated past
// simulation - see SecurityAuditPanel.jsx).
export function setPaymentHeld(receiptId, paymentHeld) {
  const actions = getFinanceActions();
  const entry = getEntry(actions, receiptId);
  return saveFinanceActions({
    ...actions,
    [receiptId]: { ...entry, paymentHeld },
  });
}

export function addClaimComment(receiptId, comment) {
  const actions = getFinanceActions();
  const entry = getEntry(actions, receiptId);
  return saveFinanceActions({
    ...actions,
    [receiptId]: { ...entry, comments: [...entry.comments, comment] },
  });
}

// A claim's status as actually shown on screen this session: the finance
// reviewer's own override if they've acted on it, otherwise the real
// routed_status the pipeline resolved. Never mutates the underlying claim.
export function getEffectiveStatus(claim, actions) {
  return actions[claim.receipt_id]?.statusOverride ?? claim.routed_status;
}
