'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { useLog } from '@/app/components/lib/logStore';
import {
  createAccount, signInWithPassword, sendPasswordReset, setPassword, startEmailAuth, signOut,
  MIN_PASSWORD,
} from '@/app/components/lib/auth';

type Tab = 'create' | 'signin';

export default function AccountPage() {
  const { theme: t } = useTweaks();
  const router = useRouter();
  const auth = useAuth();

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <button onClick={() => router.back()} style={backStyle(t)}>← back</button>
        <div style={eyebrowStyle(t)}>§ account</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 44, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1.2,
        }}>
          {auth.status === 'user'
            ? <>your<br /><span style={{ fontStyle: 'italic', color: t.signal }}>account</span></>
            : <>keep your<br /><span style={{ fontStyle: 'italic', color: t.signal }}>log</span></>}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {auth.status === 'init' && <Quiet t={t} text="connecting…" />}
        {auth.status === 'disabled' && <Quiet t={t} text="local mode: accounts need sync to be set up." />}
        {auth.status === 'error' && <Quiet t={t} text={`auth error · ${auth.error ?? 'unknown'}`} />}
        {auth.status === 'anon' && <AnonView t={t} />}
        {auth.status === 'user' && <UserView t={t} email={auth.email} />}
      </div>
    </div>
  );
}

// ── signed out (anonymous session) ──────────────────────────────────

function AnonView({ t }: { t: Theme }) {
  const [tab, setTab] = React.useState<Tab>('create');
  const [email, setEmail] = React.useState('');
  const [notice, setNotice] = React.useState<string | null>(null);

  const switchTo = (next: Tab, msg?: string) => {
    setTab(next);
    setNotice(msg ?? null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['create', 'signin'] as Tab[]).map(id => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => switchTo(id)} style={{
              flex: 1, padding: '10px 0', cursor: 'pointer',
              background: active ? t.cream : 'transparent',
              color: active ? t.bg : t.creamDim,
              border: `1px solid ${active ? t.cream : t.line}`,
              fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase',
            }}>{id === 'create' ? 'create account' : 'sign in'}</button>
          );
        })}
      </div>

      {notice && <Note t={t} tone="signal" text={notice} />}

      {tab === 'create'
        ? <CreateForm t={t} email={email} setEmail={setEmail}
            onExists={() => switchTo('signin', 'there is already an account with this email. sign in below.')} />
        : <SignInForm t={t} email={email} setEmail={setEmail} />}
    </div>
  );
}

function CreateForm({
  t, email, setEmail, onExists,
}: {
  t: Theme;
  email: string;
  setEmail: (v: string) => void;
  onExists: () => void;
}) {
  const [password, setPw] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<'confirm-email' | 'confirm-then-password' | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr('passwords don’t match'); return; }
    setBusy(true);
    const r = await createAccount(email, password);
    setBusy(false);
    if (!r.ok) {
      if (r.exists) onExists();
      else setErr(r.error);
      return;
    }
    setDone(r.step);
  };

  if (done) {
    return (
      <Note t={t} tone="signal" title={`✓ sent to ${email.trim().toLowerCase()}`} text={
        done === 'confirm-email'
          ? 'open the link in that email to confirm it. after that you can sign in with your email and password anywhere. your log stays as it is.'
          : 'open the link in that email to confirm it. it brings you back here to set your password. your log stays as it is.'
      } />
    );
  }

  return (
    <form onSubmit={submit} style={formStyle}>
      <Intro t={t} text="turn this device’s log into an account you can sign in to anywhere. everything you’ve logged so far comes with it." />
      <Field t={t} label="email">
        <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@somewhere.com" autoCapitalize="off" autoCorrect="off" style={inputStyle(t)} />
      </Field>
      <Field t={t} label={`password · at least ${MIN_PASSWORD} characters`}>
        <input type="password" autoComplete="new-password" value={password} onChange={e => setPw(e.target.value)}
          style={inputStyle(t)} />
      </Field>
      <Field t={t} label="password again">
        <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
          style={inputStyle(t)} />
      </Field>
      {err && <ErrorLine t={t} text={err} />}
      <Primary t={t} busy={busy} disabled={!email.trim() || !password || !confirm}
        label="create account" busyLabel="creating…" />
    </form>
  );
}

function SignInForm({ t, email, setEmail }: { t: Theme; email: string; setEmail: (v: string) => void }) {
  const entries = useLog();
  const [password, setPw] = React.useState('');
  const [busy, setBusy] = React.useState<'password' | 'reset' | 'link' | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<'reset' | 'link' | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy('password');
    const error = await signInWithPassword(email, password);
    setBusy(null);
    if (error) setErr(error);
    // on success AuthProvider flips to 'user' and this view unmounts
  };

  const reset = async () => {
    setErr(null);
    setBusy('reset');
    const error = await sendPasswordReset(email);
    setBusy(null);
    if (error) setErr(error); else setSent('reset');
  };

  const link = async () => {
    setErr(null);
    setBusy('link');
    const r = await startEmailAuth(email);
    setBusy(null);
    if (!r.ok) setErr(r.error ?? 'failed'); else setSent('link');
  };

  if (sent) {
    return (
      <Note t={t} tone="signal" title={`✓ sent to ${email.trim().toLowerCase()}`} text={
        sent === 'reset'
          ? 'open the link in that email to choose a new password.'
          : 'open the link in that email to sign in.'
      } />
    );
  }

  return (
    <form onSubmit={submit} style={formStyle}>
      {entries.length > 0 && (
        <Note t={t} tone="danger" text={`signing in to another account replaces this device’s anonymous log (${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}). to keep them, create an account instead.`} />
      )}
      <Field t={t} label="email">
        <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@somewhere.com" autoCapitalize="off" autoCorrect="off" style={inputStyle(t)} />
      </Field>
      <Field t={t} label="password">
        <input type="password" autoComplete="current-password" value={password} onChange={e => setPw(e.target.value)}
          style={inputStyle(t)} />
      </Field>
      {err && <ErrorLine t={t} text={err} />}
      <Primary t={t} busy={busy === 'password'} disabled={busy !== null || !email.trim() || !password}
        label="sign in" busyLabel="signing in…" />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <TextButton t={t} onClick={() => void reset()} disabled={busy !== null || !email.trim()}
          label={busy === 'reset' ? 'sending…' : 'forgot password?'} />
        <TextButton t={t} onClick={() => void link()} disabled={busy !== null || !email.trim()}
          label={busy === 'link' ? 'sending…' : 'email me a login link instead'} />
      </div>
    </form>
  );
}

// ── signed in ───────────────────────────────────────────────────────

function UserView({ t, email }: { t: Theme; email: string | null }) {
  const router = useRouter();
  const [password, setPw] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [confirmOut, setConfirmOut] = React.useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    if (password !== confirm) { setErr('passwords don’t match'); return; }
    setBusy(true);
    const error = await setPassword(password);
    setBusy(false);
    if (error) { setErr(error); return; }
    setPw(''); setConfirm(''); setSaved(true);
  };

  const out = async () => {
    setBusy(true);
    const error = await signOut();
    setBusy(false);
    if (error) setErr(error);
    else router.push('/profile');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ padding: '12px 14px', border: `1px solid ${t.line}`, background: t.surface }}>
        <div style={eyebrowStyle(t)}>signed in as</div>
        <div style={{ fontFamily: LumiereType.mono, fontSize: 13, color: t.cream, wordBreak: 'break-all' }}>
          {email ?? '—'}
        </div>
      </div>

      <form onSubmit={save} style={formStyle}>
        <div style={eyebrowStyle(t)}>set or change password</div>
        <Field t={t} label={`new password · at least ${MIN_PASSWORD} characters`}>
          <input type="password" autoComplete="new-password" value={password} onChange={e => setPw(e.target.value)}
            style={inputStyle(t)} />
        </Field>
        <Field t={t} label="new password again">
          <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
            style={inputStyle(t)} />
        </Field>
        {err && <ErrorLine t={t} text={err} />}
        {saved && <Note t={t} tone="signal" text="✓ password saved. you can now sign in with it on any device." />}
        <Primary t={t} busy={busy} disabled={!password || !confirm} label="save password" busyLabel="saving…" />
      </form>

      {!confirmOut ? (
        <button onClick={() => setConfirmOut(true)} style={dangerOutline(t)}>sign out</button>
      ) : (
        <div style={formStyle}>
          <Intro t={t} text="sign out on this device? your account and log stay safe; sign back in any time." />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmOut(false)} style={{ ...secondary(t), flex: 1 }}>cancel</button>
            <button onClick={() => void out()} disabled={busy} style={{
              ...secondary(t), flex: 2, background: t.danger, color: t.bg, border: 'none',
              opacity: busy ? 0.6 : 1,
            }}>{busy ? 'signing out…' : 'confirm sign out'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── bits ────────────────────────────────────────────────────────────

const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };

function Intro({ t, text }: { t: Theme; text: string }) {
  return (
    <div style={{
      fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
      color: t.creamDim, lineHeight: 1.45,
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

function Field({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted, marginBottom: 4,
      }}>{label}</div>
      {children}
    </label>
  );
}

function Note({ t, tone, title, text }: { t: Theme; tone: 'signal' | 'danger'; title?: string; text: string }) {
  const c = tone === 'signal' ? t.signal : t.danger;
  return (
    <div style={{ padding: '12px 14px', border: `1px solid ${c}`, background: t.surface }}>
      {title && <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', color: c, marginBottom: 6,
      }}>{title}</div>}
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
        color: t.creamDim, lineHeight: 1.45,
      }}>{text}</div>
    </div>
  );
}

function ErrorLine({ t, text }: { t: Theme; text: string }) {
  return (
    <div role="alert" style={{
      fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4, lineHeight: 1.5,
      textTransform: 'uppercase', color: t.danger,
    }}>{text}</div>
  );
}

function Primary({
  t, busy, disabled, label, busyLabel,
}: { t: Theme; busy: boolean; disabled: boolean; label: string; busyLabel: string }) {
  const off = busy || disabled;
  return (
    <button type="submit" disabled={off} style={{
      padding: '13px 0', background: t.cream, color: t.bg, border: 'none',
      cursor: off ? 'default' : 'pointer', opacity: off ? 0.6 : 1,
      fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase',
    }}>{busy ? busyLabel : label}</button>
  );
}

function TextButton({ t, onClick, disabled, label }: { t: Theme; onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'none', border: 'none', padding: 0,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      color: t.creamDim, textDecoration: 'underline', textUnderlineOffset: 3,
      fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase',
    }}>{label}</button>
  );
}

function inputStyle(t: Theme): React.CSSProperties {
  return {
    width: '100%', padding: 11,
    background: t.bg, color: t.cream,
    border: `1px solid ${t.line}`, outline: 'none',
    fontFamily: LumiereType.mono, fontSize: 13, letterSpacing: 0.5,
  };
}

function secondary(t: Theme): React.CSSProperties {
  return {
    padding: '11px 0', background: 'transparent', color: t.creamDim,
    border: `1px solid ${t.line}`, cursor: 'pointer',
    fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase',
  };
}

function dangerOutline(t: Theme): React.CSSProperties {
  return { ...secondary(t), color: t.danger, border: `1px solid ${t.danger}` };
}

function backStyle(t: Theme): React.CSSProperties {
  return {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
    textTransform: 'uppercase', color: t.muted, marginBottom: 16,
  };
}

function eyebrowStyle(t: Theme): React.CSSProperties {
  return {
    fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
    textTransform: 'uppercase', color: t.muted, marginBottom: 8,
  };
}
