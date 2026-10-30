'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Theme } from '@/app/components/lib/tokens';
import { LumiereType } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { getLastAccount, forgetAccount } from '@/app/components/lib/auth';

const noop = () => () => {};

/**
 * Shown when the app is anonymous although a real account was signed in on
 * this device and nobody signed out: the session was dropped (e.g. Supabase
 * rejected it on reopen) or the sign-in happened in another browser.
 */
export function SignedOutNotice({ t }: { t: Theme }) {
  const auth = useAuth();
  const pathname = usePathname();
  const last = React.useSyncExternalStore(noop, getLastAccount, () => null);
  const [dismissed, setDismissed] = React.useState(false);

  if (auth.status !== 'anon' || !last || dismissed || pathname.startsWith('/account')) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '12px 20px 0', padding: '10px 12px',
      border: `1px solid ${t.signal}`, background: t.surface,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14, color: t.creamDim, lineHeight: 1.35,
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>signed out of {last} on this device.</div>
        <Link href={`/account?signin=${encodeURIComponent(last)}`} style={{
          display: 'inline-block', marginTop: 4, color: t.cream, textUnderlineOffset: 3,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase',
        }}>sign in again →</Link>
      </div>
      <button
        aria-label="dismiss"
        onClick={() => { forgetAccount(); setDismissed(true); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          color: t.muted, fontFamily: LumiereType.mono, fontSize: 14,
        }}
      >×</button>
    </div>
  );
}
