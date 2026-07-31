// Tracks who's "logged in" for this demo. There's no real auth backend, so
// this is just the matched employee record from Login.jsx, kept in
// localStorage so other pages (like Upload Receipt) can read it.
const STORAGE_KEY = "claimpilot_session_user";

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // localStorage unavailable - the session just won't survive a refresh.
  }
}

export function clearCurrentUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
