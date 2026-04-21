'use client';
import type { Theme } from '@/lib/tokens';
import { LumiereType } from '@/lib/tokens';
import type { Film } from '@/lib/types';

interface PosterProps {
  film: Film;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  t: Theme;
  style?: React.CSSProperties;
}

export function Poster({ film, size = 'md', t, style }: PosterProps) {
  const sizes = {
    xs: { w: 44, h: 64, title: 8, meta: 6 },
    sm: { w: 72, h: 104, title: 11, meta: 7 },
    md: { w: 108, h: 156, title: 14, meta: 8 },
    lg: { w: 160, h: 232, title: 18, meta: 9 },
    xl: { w: 220, h: 320, title: 24, meta: 10 },
  };
  const s = sizes[size];

  // Prefer real TMDB image when available
  if (film.posterUrl) {
    return (
      <div style={{
        width: s.w, height: s.h, position: 'relative',
        overflow: 'hidden', flexShrink: 0,
        boxShadow: '0 2px 0 rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.25)',
        ...style,
      }}>
        <img
          src={film.posterUrl}
          alt={film.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }

  // Stylised placeholder fallback
  const fallback = film.poster || '#3a3a4a';
  const accent = film.posterAccent || t.cream;
  return (
    <div style={{
      width: s.w, height: s.h, position: 'relative',
      background: fallback, overflow: 'hidden', flexShrink: 0,
      boxShadow: '0 2px 0 rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.25)',
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(135deg, transparent 0 8px, rgba(0,0,0,0.08) 8px 9px)`,
      }} />
      <div style={{
        position: 'absolute', left: s.w * 0.08, top: s.h * 0.3, right: s.w * 0.08,
        fontFamily: LumiereType.display, fontSize: s.title, lineHeight: 1,
        color: accent, letterSpacing: -0.3,
      }}>{film.title.toLowerCase()}</div>
      <div style={{
        position: 'absolute', left: s.w * 0.08, bottom: s.h * 0.08,
        fontFamily: LumiereType.mono, fontSize: s.meta,
        color: accent, letterSpacing: 1.5, opacity: 0.8,
      }}>
        {film.year} · {film.kind === 'series' ? `S${film.season}E${film.episode}` : 'FILM'}
      </div>
    </div>
  );
}
