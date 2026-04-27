'use client';
import React from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { LumiereType } from '@/app/components/lib/tokens';

const MIN_SHOW_MS = 500;
const FADE_MS = 550;

export function Splash() {
  const auth = useAuth();
  const startedAt = React.useRef<number>(typeof window !== 'undefined' ? Date.now() : 0);
  const [dismissed, setDismissed] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    if (auth.status === 'init') return;
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, MIN_SHOW_MS - elapsed);
    const t = setTimeout(() => setDismissed(true), wait);
    return () => clearTimeout(t);
  }, [auth.status]);

  React.useEffect(() => {
    if (!dismissed) return;
    const t = setTimeout(() => setHidden(true), FADE_MS);
    return () => clearTimeout(t);
  }, [dismissed]);

  if (hidden) return null;

  return (
    <div
      aria-hidden={dismissed}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#06040a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: dismissed ? 0 : 1,
        pointerEvents: dismissed ? 'none' : 'auto',
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      <div style={{
        fontFamily: LumiereType.display, fontSize: 56,
        color: '#ebe6d8', fontStyle: 'italic', letterSpacing: -1.5,
        lineHeight: 1,
      }}>lumière</div>
      <div style={{
        marginTop: 22,
        fontFamily: LumiereType.mono, fontSize: 9,
        letterSpacing: 2.8, textTransform: 'uppercase',
        color: '#6f6a78',
        animation: 'lum-splash-pulse 1.4s ease-in-out infinite',
      }}>· loading ·</div>
      <style>{`
        @keyframes lum-splash-pulse {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
