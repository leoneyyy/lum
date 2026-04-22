'use client';
import { getSupabase } from './supabase';

export type AuthIntent = 'upgrade' | 'signin';

export interface StartEmailResult {
  ok: boolean;
  intent: AuthIntent;
  error?: string;
}

/**
 * Start the email flow for the current session.
 * - If anon: try updateUser({email}) to link email to this account.
 *   If email already in use, fall back to signInWithOtp (switching accounts).
 * - Otherwise: just signInWithOtp.
 */
export async function startEmailAuth(email: string): Promise<StartEmailResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, intent: 'signin', error: 'offline' };
  const target = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
    return { ok: false, intent: 'signin', error: 'enter a valid email' };
  }

  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

  const { data: { user } } = await sb.auth.getUser();
  const isAnon = !!user?.is_anonymous;

  if (isAnon) {
    const { error } = await sb.auth.updateUser(
      { email: target },
      redirectTo ? { emailRedirectTo: redirectTo } : {},
    );
    if (!error) return { ok: true, intent: 'upgrade' };
    // email already associated with another account → fall through to signIn
    const conflict = /already/i.test(error.message) || /registered/i.test(error.message);
    if (!conflict) return { ok: false, intent: 'upgrade', error: error.message };
  }

  const { error } = await sb.auth.signInWithOtp({
    email: target,
    options: {
      shouldCreateUser: !isAnon,  // on fresh sessions allow creating; on anon upgrade only match existing
      emailRedirectTo: redirectTo,
    },
  });
  if (error) return { ok: false, intent: 'signin', error: error.message };
  return { ok: true, intent: 'signin' };
}

export async function signOut(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'offline';
  const { error } = await sb.auth.signOut();
  return error?.message ?? null;
}
