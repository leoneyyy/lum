'use client';
import React from 'react';
import { getSupabase, isSupabaseConfigured } from '@/app/components/lib/supabase';
import { setBackendUser } from '@/app/components/lib/logStore';
import { setProfileUser } from '@/app/components/lib/profileStore';
import { setFollowUser } from '@/app/components/lib/followStore';
import { setReactionUser } from '@/app/components/lib/reactionStore';
import { setFeedUser } from '@/app/components/lib/feedStore';

export type AuthStatus = 'init' | 'anon' | 'user' | 'disabled' | 'error';

export interface AuthState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  error: string | null;
}

const initial: AuthState = {
  status: isSupabaseConfigured() ? 'init' : 'disabled',
  userId: null,
  email: null,
  error: null,
};

const AuthContext = React.createContext<AuthState>(initial);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(initial);

  React.useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setBackendUser(null);
      setProfileUser(null);
      setFollowUser(null);
      setReactionUser(null);
      setFeedUser(null);
      return;
    }

    let cancel = false;

    const apply = (
      session: Awaited<ReturnType<typeof sb.auth.getSession>>['data']['session'],
      error?: string | null,
    ) => {
      if (cancel) return;
      const userId = session?.user?.id ?? null;
      const email = session?.user?.email ?? null;
      const isAnon = !!session?.user?.is_anonymous;
      setBackendUser(userId);
      setProfileUser(userId);
      setFollowUser(userId);
      setReactionUser(userId);
      setFeedUser(userId);
      setState({
        status: error ? 'error' : userId ? (isAnon ? 'anon' : 'user') : 'init',
        userId,
        email,
        error: error ?? null,
      });
    };

    void (async () => {
      const { data, error } = await sb.auth.getSession();
      if (cancel) return;
      if (error) { apply(null, error.message); return; }
      if (data.session) { apply(data.session); return; }

      const { data: anon, error: anonErr } = await sb.auth.signInAnonymously();
      if (cancel) return;
      apply(anon.session ?? null, anonErr?.message ?? null);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      apply(session);
    });

    return () => {
      cancel = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return React.useContext(AuthContext);
}
