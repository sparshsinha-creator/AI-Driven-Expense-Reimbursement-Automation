// Registrations from this demo aren't sent to any backend - there isn't one.
// New "employees" created via the Register page are kept in this browser's
// localStorage so Login can recognize them for the rest of the session, but
// they're never persisted anywhere real and won't show up for anyone else.
const STORAGE_KEY = "claimpilot_demo_users";

export function getDemoUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addDemoUser(user) {
  const existing = getDemoUsers().filter(
    (u) => u.employee_id.toLowerCase() !== user.employee_id.toLowerCase()
  );
  const updated = [...existing, user];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (e.g. private browsing) - registration still
    // "succeeds" for this page view, it just won't survive a refresh.
  }
  return updated;
}
