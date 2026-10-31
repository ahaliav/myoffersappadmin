import { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID as CLIENT_ID } from '../lib/googleConfig';

// Google Identity Services: Google renders its own button and hands back an ID token, which the API checks.
// Shown only when VITE_GOOGLE_CLIENT_ID is set.
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdApi {
  initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void; ux_mode?: 'popup' }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
}

// Read through a narrow view: window.google may already be typed elsewhere (e.g. Google Maps).
const googleId = (): GoogleIdApi | undefined =>
  (window as unknown as { google?: { accounts?: { id?: GoogleIdApi } } }).google?.accounts?.id;

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (googleId()) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface Props {
  onCredential: (idToken: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export default function GoogleSignInButton({ onCredential, onError, disabled }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const clientId = CLIENT_ID;
    if (!clientId) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        const api = googleId();
        if (cancelled || !api || !ref.current) return;
        api.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential);
          },
        });
        api.renderButton(ref.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          locale: 'he',
          width: ref.current.clientWidth || 320,
        });
      })
      .catch((e: Error) => onError?.(e.message));
    return () => {
      cancelled = true;
    };
  }, [onError]);

  if (!CLIENT_ID) return null;
  return (
    <div
      ref={ref}
      style={{ width: '100%', display: 'flex', justifyContent: 'center', minHeight: 44, opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    />
  );
}
