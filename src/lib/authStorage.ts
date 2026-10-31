// The API's sign-in token (Supabase is no longer used). Kept in localStorage so a reload stays signed in.
const TOKEN_KEY = 'tooday_admin_token';

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage blocked: the session lasts until the tab closes
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    // Leftover Supabase sessions from before the move.
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('sb-')) window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
