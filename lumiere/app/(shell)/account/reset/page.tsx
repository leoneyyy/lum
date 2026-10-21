'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { setPassword, sendPasswordReset, MIN_PASSWORD } from '@/app/components/lib/auth';

// Landing page for the "reset password" email. Supabase signs the user in
// from the link (detectSessionInUrl), so a signed-in account here means the
// link worked; an anonymous session means it was expired or already used.
export default function ResetPasswordPage() {
  const { theme: t } = useTweaks();
  const auth = useAuth();
  // Expired/used links come back as #error=…&error_description=…. Read once
  // on first render, before Supabase strips the hash. Only shown after auth
  // resolves, so the server/client difference never reaches the markup.
  const [linkError] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const desc = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description');
    return desc ? desc.replace(/\+/g, ' ') : null;
  });

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>§ account</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 44, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1.2,
        }}>new<br /><span style={{ fontStyle: 'italic', color: t.signal }}>password</span></div>
      </div>
      <div style={{ padding: 20 }}>
        {auth.status === 'init' && <Quiet t={t} text="checking your link…" />}
        {auth.status === 'user' && <NewPasswordForm t={t} email={auth.email} />}
        {(auth.status === 'anon' || auth.status === 'error') && <ExpiredLink t={t} reason={linkError} />}
        {auth.status === 'disabled' && <Quiet t={t} text="local mode: accounts need sync to be set up." />}
      </div>
    </div>
  );
}

function NewPasswordForm({ t, email }: { t: Theme; email: string | null }) {
  const [password, setPw] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr('passwords don’t match'); return; }
    setBusy(true);
    const error = await setPassword(password);
    setBusy(false);
    if (error) setErr(error); else setDone(true);
  };

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Note t={t} text="✓ password saved. you’re signed in." />
        <Link href="/profile" style={primaryLink(t)}>go to your profile →</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {email && (
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15, color: t.creamDim,
        }}>choose a new password for {email}.</div>
      )}
      <Label t={t} text={`new password · at least ${MIN_PASSWORD} characters`}>
        <input type="password" autoComplete="new-password" value={password}
          onChange={e => setPw(e.target.value)} style={inputStyle(t)} />
      </Label>
      <Label t={t} text="new password again">
        <input type="password" autoComplete="new-password" value={confirm}
          onChange={e => setConfirm(e.target.value)} style={inputStyle(t)} />
      </Label>
      {err && <div role="alert" style={errorStyle(t)}>{err}</div>}
      <button type="submit" disabled={busy || !password || !confirm} style={{
        padding: '13px 0', background: t.cream, color: t.bg, border: 'none',
        cursor: busy ? 'default' : 'pointer', opacity: busy || !password || !confirm ? 0.6 : 1,
        fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase',
      }}>{busy ? 'saving…' : 'save new password'}</button>
    </form>
  );
}

function ExpiredLink({ t, reason }: { t: Theme; reason: string | null }) {
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const error = await sendPasswordReset(email);
    setBusy(false);
    if (error) setErr(error); else setSent(true);
  };

  if (sent) return <Note t={t} text={`✓ new link sent to ${email.trim().toLowerCase()}.`} />;

  return (
    <form onSubmit={resend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15, color: t.creamDim, lineHeight: 1.45,
      }}>
        this reset link didn’t work{reason ? ` (${reason.toLowerCase()})` : ''}. links expire after a while
        and only work once. get a fresh one:
      </div>
      <Label t={t} text="email">
        <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@somewhere.com" autoCapitalize="off" autoCorrect="off" style={inputStyle(t)} />
      </Label>
      {err && <div role="alert" style={errorStyle(t)}>{err}</div>}
      <button type="submit" disabled={busy || !email.trim()} style={{
        padding: '13px 0', background: t.cream, color: t.bg, border: 'none',
        cursor: busy ? 'default' : 'pointer', opacity: busy || !email.trim() ? 0.6 : 1,
        fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase',
      }}>{busy ? 'sending…' : 'send new link'}</button>
    </form>
  );
}

function Label({ t, text, children }: { t: Theme; text: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted, marginBottom: 4,
      }}>{text}</div>
      {children}
    </label>
  );
}

function Note({ t, text }: { t: Theme; text: string }) {
  return (
    <div style={{
      padding: '12px 14px', border: `1px solid ${t.signal}`, background: t.surface,
      fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15, color: t.creamDim,
    }}>{text}</div>
  );
}

function Quiet({ t, text }: { t: Theme; text: string }) {
  return (
    <div style={{
      padding: '40px 0', textAlign: 'center',
      fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 16, color: t.creamDim,
    }}>{text}</div>
  );
}

function inputStyle(t: Theme): React.CSSProperties {
  return {
    width: '100%', padding: 11, background: t.bg, color: t.cream,
    border: `1px solid ${t.line}`, outline: 'none',
    fontFamily: LumiereType.mono, fontSize: 13, letterSpacing: 0.5,
  };
}

function errorStyle(t: Theme): React.CSSProperties {
  return {
    fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4, lineHeight: 1.5,
    textTransform: 'uppercase', color: t.danger,
  };
}

function primaryLink(t: Theme): React.CSSProperties {
  return {
    display: 'block', textAlign: 'center', padding: '13px 0', background: t.cream, color: t.bg,
    textDecoration: 'none',
    fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase',
  };
}
