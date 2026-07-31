// Claims uploaded through this demo's Upload Receipt page aren't sent to any
// real pipeline - Phases 2-5 don't actually run against them, and there's no
// server to persist them on. They're kept in this browser's localStorage
// alongside the static src/data/claims.json seed data so they show up
// consistently for the rest of this session, tagged to whichever employee_id
// is "logged in".
const STORAGE_KEY = "claimpilot_session_claims";

export function getSessionClaims() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSessionClaim(claim) {
  const claims = [...getSessionClaims(), claim];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  } catch {
    // localStorage unavailable - the claim still shows on this page view.
  }
  return claims;
}
