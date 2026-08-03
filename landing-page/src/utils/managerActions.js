// Approve/reject/escalate/comment actions taken from the Manager Dashboard
// aren't sent to any real backend - there isn't one, same as sessionClaims.js.
// They're kept in this browser's localStorage, keyed by receipt_id, as an
// overlay on top of the real pipeline output in claims.json rather than
// mutating it, so they persist for the rest of this session.
const STORAGE_KEY = "claimpilot_manager_actions";

export function getManagerActions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveManagerActions(actions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch {
    // localStorage unavailable - the action still applies for this page view.
  }
  return actions;
}

function getEntry(actions, receiptId) {
  return actions[receiptId] ?? { statusOverride: null, comments: [] };
}

export function setClaimStatusOverride(receiptId, statusOverride) {
  const actions = getManagerActions();
  const entry = getEntry(actions, receiptId);
  return saveManagerActions({
    ...actions,
    [receiptId]: { ...entry, statusOverride },
  });
}

export function addClaimComment(receiptId, comment) {
  const actions = getManagerActions();
  const entry = getEntry(actions, receiptId);
  return saveManagerActions({
    ...actions,
    [receiptId]: { ...entry, comments: [...entry.comments, comment] },
  });
}

// A claim's status as actually shown on screen this session: the manager's
// own override if they've acted on it, otherwise the real routed_status the
// pipeline resolved. Never mutates the underlying claim.
export function getEffectiveStatus(claim, actions) {
  return actions[claim.receipt_id]?.statusOverride ?? claim.routed_status;
}
