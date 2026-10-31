import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, toAuthError } from '../api/authApi';
import type { AuthErrorInfo, AuthResponse, AuthUser } from '../api/authApi';
import { clearToken, getToken, setToken } from '../lib/authStorage';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthErrorInfo | null }>;
  signInWithGoogle: (idToken: string) => Promise<{ error: AuthErrorInfo | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const NOT_ADMIN: AuthErrorInfo = { code: 'not_admin', message: 'This account has no admin access' };

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Loading only while a stored token is being checked.
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((res) => {
        if (res.data.isAdmin) {
          setUser(res.data);
        } else {
          clearToken();
          setUser(null);
        }
      })
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Only admins use this app: a signed-in non-admin is signed straight out again.
  const accept = (data: AuthResponse): { error: AuthErrorInfo | null } => {
    if (!data.user.isAdmin) {
      clearToken();
      setUser(null);
      return { error: NOT_ADMIN };
    }
    setToken(data.token);
    setUser(data.user);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    try {
      return accept((await authApi.login(email.trim(), password)).data);
    } catch (e) {
      return { error: toAuthError(e) };
    }
  };

  const signInWithGoogle = async (idToken: string) => {
    try {
      return accept((await authApi.google(idToken)).data);
    } catch (e) {
      return { error: toAuthError(e) };
    }
  };

  const signOut = () => {
    clearToken();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
