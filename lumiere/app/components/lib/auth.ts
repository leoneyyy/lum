'use client';
import { getSupabase } from './supabase';
import { clearLogCaches } from './logStore';

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
  // don't leave the account's log copy behind on a shared device
  if (!error) { clearLogCaches(); forgetAccount(); }
  return error?.message ?? null;
}

// ── "you were signed out" ───────────────────────────────────────────
// The last real account signed in on this device. If the app later comes up
// anonymous without the user signing out (the session was rejected, or they
// signed in through a link that opened in another browser), we can say so
// instead of silently showing an empty log.

const LAST_ACCOUNT_KEY = 'lumiere:last-account';

export function rememberAccount(email: string) {
  try { localStorage.setItem(LAST_ACCOUNT_KEY, email); } catch {}
}

export function forgetAccount() {
  try { localStorage.removeItem(LAST_ACCOUNT_KEY); } catch {}
}

export function getLastAccount(): string | null {
  try { return localStorage.getItem(LAST_ACCOUNT_KEY); } catch { return null; }
}

/** Running as the installed home-screen app rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

// ── email + password ────────────────────────────────────────────────

export const MIN_PASSWORD = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function origin(): string | undefined {
  return typeof window !== 'undefined' ? window.location.origin : undefined;
}

// Supabase's messages are written for developers; map the common ones.
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'wrong email or password';
  if (m.includes('email not confirmed')) return 'confirm your email first: check your inbox for the link';
  if (m.includes('already') && (m.includes('registered') || m.includes('exists'))) return 'there is already an account with this email. sign in instead';
  if (m.includes('password') && (m.includes('at least') || m.includes('weak') || m.includes('short'))) return `password too weak: use at least ${MIN_PASSWORD} characters`;
  if (m.includes('same') && m.includes('password')) return 'that is already your password';
  const wait = m.match(/after (\d+) seconds?/);
  if (wait) return `too many tries: wait ${wait[1]}s and try again`;
  if (m.includes('rate limit')) return 'too many emails sent: try again in a while';
  return message;
}

function checkEmail(email: string): string | null {
  return EMAIL_RE.test(email) ? null : 'enter a valid email';
}

function checkPassword(password: string): string | null {
  return password.length >= MIN_PASSWORD ? null : `use at least ${MIN_PASSWORD} characters`;
}

export type CreateAccountResult =
  | { ok: true; step: 'confirm-email' }         // email + password set, confirm the email
  | { ok: true; step: 'confirm-then-password' } // email linked; set the password after confirming
  | { ok: false; error: string; exists?: boolean };

/**
 * Turn the current anonymous session into a real account, keeping its id
 * (and so the whole log). Supabase documents this as two steps (link email,
 * confirm, then set a password); try both at once first and fall back to
 * the documented order if the server refuses the password before the email
 * is confirmed.
 */
export async function createAccount(rawEmail: string, password: string): Promise<CreateAccountResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'offline' };
  const email = rawEmail.trim().toLowerCase();
  const bad = checkEmail(email) ?? checkPassword(password);
  if (bad) return { ok: false, error: bad };

  const { data: { user } } = await sb.auth.getUser();
  if (!user?.is_anonymous) return { ok: false, error: 'already signed in to an account' };

  const redirect = origin() ? { emailRedirectTo: `${origin()}/account` } : {};
  const both = await sb.auth.updateUser({ email, password }, redirect);
  if (!both.error) return { ok: true, step: 'confirm-email' };

  const msg = both.error.message.toLowerCase();
  if (msg.includes('already') && (msg.includes('registered') || msg.includes('exists'))) {
    return { ok: false, error: friendlyAuthError(both.error.message), exists: true };
  }
  if (!msg.includes('password')) return { ok: false, error: friendlyAuthError(both.error.message) };

  const emailOnly = await sb.auth.updateUser({ email }, redirect);
  if (emailOnly.error) {
    const em = emailOnly.error.message.toLowerCase();
    return {
      ok: false,
      error: friendlyAuthError(emailOnly.error.message),
      exists: em.includes('already') && (em.includes('registered') || em.includes('exists')),
    };
  }
  return { ok: true, step: 'confirm-then-password' };
}

/** Sign in to an existing account. Replaces this device's anonymous session. */
export async function signInWithPassword(rawEmail: string, password: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'offline';
  const email = rawEmail.trim().toLowerCase();
  const bad = checkEmail(email);
  if (bad) return bad;
  if (!password) return 'enter your password';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? friendlyAuthError(error.message) : null;
}

/** Email a link that opens /account/reset to choose a new password. */
export async function sendPasswordReset(rawEmail: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'offline';
  const email = rawEmail.trim().toLowerCase();
  const bad = checkEmail(email);
  if (bad) return bad;
  const { error } = await sb.auth.resetPasswordForEmail(email, origin() ? { redirectTo: `${origin()}/account/reset` } : {});
  return error ? friendlyAuthError(error.message) : null;
}

/** Set or change the password of the signed-in (non-anonymous) account. */
export async function setPassword(password: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'offline';
  const bad = checkPassword(password);
  if (bad) return bad;
  const { error } = await sb.auth.updateUser({ password });
  return error ? friendlyAuthError(error.message) : null;
}
