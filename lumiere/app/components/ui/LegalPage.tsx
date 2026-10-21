'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';

// Shell for long-form text pages (Impressum, Datenschutz, About). The pages
// themselves are server components so they can read server-only env vars;
// they hand plain h2/p/ul/a markup to this wrapper, which themes it.
export function LegalPage({
  eyebrow, title, missing, children,
}: {
  eyebrow: string;
  title: string;
  missing?: string[];
  children: React.ReactNode;
}) {
  const { theme: t } = useTweaks();
  const router = useRouter();
  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 16,
        }}>← back</button>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 40, lineHeight: 1,
          color: t.cream, letterSpacing: -1,
        }}>{title}</div>
      </div>

      {missing && missing.length > 0 && (
        <div style={{
          margin: '20px 20px 0', padding: '12px 14px', border: `1px solid ${t.danger}`,
          fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.2, lineHeight: 1.6,
          color: t.danger,
        }}>
          noch nicht ausgefüllt: {missing.join(', ')}. in vercel unter settings →
          environment variables eintragen und neu deployen.
        </div>
      )}

      <div className="lum-legal" style={{ padding: '8px 20px 20px' }}>
        <style>{`
          .lum-legal h2 { font-family: ${LumiereType.mono}; font-size: 10px; letter-spacing: 1.8px;
            text-transform: uppercase; color: ${t.muted}; font-weight: 400; margin: 28px 0 10px; }
          .lum-legal p, .lum-legal li { font-family: ${LumiereType.body}; font-size: 16px;
            line-height: 1.55; color: ${t.creamDim}; margin: 0 0 10px; }
          .lum-legal ul { padding-left: 18px; margin: 0 0 10px; }
          .lum-legal strong { color: ${t.cream}; font-weight: 600; }
          .lum-legal a { color: ${t.cream}; text-underline-offset: 3px; }
        `}</style>
        {children}
      </div>
    </div>
  );
}

// TMDB's official logo, hotlinked like the posters (it can't be vendored
// from here). Hidden if it fails to load; the text notice carries the
// attribution either way.
export function TmdbLogo() {
  const [failed, setFailed] = React.useState(false);
  if (failed) return null;
  return (
    <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
      <img
        src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
        alt="TMDB"
        onError={() => setFailed(true)}
        style={{ display: 'block', height: 18, width: 'auto' }}
      />
    </a>
  );
}

export function LegalFooterLinks() {
  const { theme: t } = useTweaks();
  const link: React.CSSProperties = {
    color: t.creamDim, textDecoration: 'none',
    fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase',
  };
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Link href="/about" style={link}>about &amp; credits</Link>
      <Link href="/impressum" style={link}>impressum</Link>
      <Link href="/datenschutz" style={link}>datenschutz</Link>
    </div>
  );
}
