// Google sign-in (Google Identity Services) is shown only when the OAuth client id is configured.
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || undefined;

export const googleSignInEnabled = Boolean(GOOGLE_CLIENT_ID);
