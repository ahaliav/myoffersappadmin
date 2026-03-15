import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';
import { supabase, clearSupabaseAuthStorage } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clearStaleSession = () => {
      setSession(null);
      setUser(null);
      clearSupabaseAuthStorage();
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      window.location.href = '/login';
    };

    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error?.code === 'session_not_found' || error?.message?.includes('session_not_found')) {
        clearStaleSession();
      } else {
        setSession(s);
        setUser(s?.user ?? null);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    setSession(null);
    setUser(null);
    clearSupabaseAuthStorage();
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
