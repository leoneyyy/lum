'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import { useLog } from '@/app/components/lib/logStore';
import { getFilm } from '@/app/components/lib/api';
import type { Film } from '@/app/components/lib/types';

interface Body {
  id: string;
  title: string;
  cry: number;
  filmId: string;
  angle: number;
  radius: number;
  size: number;
}

export default function OrbitPage() {
  const { theme: t } = useTweaks();
  const entries = useLog();
  const [titles, setTitles] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const need = Array.from(new Set(entries.map(e => e.filmId))).filter(id => !titles[id]);
    if (need.length === 0) return;
    let cancel = false;
    Promise.all(need.map(id => getFilm(id).then(f => [id, f] as const))).then(pairs => {
      if (cancel) return;
      setTitles(prev => {
        const next = { ...prev };
        for (const [id, f] of pairs) if (f) next[id] = (f as Film).title;
        return next;
      });
    });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const bodies: Body[] = React.useMemo(() => {
    return entries.map((e, i) => {
      const cry = Math.max(0, Math.min(100, e.cry));
      return {
        id: e.id,
        filmId: e.filmId,
        title: titles[e.filmId] || '…',
        cry,
        angle: (i * 137.5) % 360,
        radius: 60 + (100 - cry) * 1.4,
        size: 6 + (cry / 100) * 10,
      };
    });
  }, [entries, titles]);

  const sumCry = entries.reduce((s, e) => s + e.cry, 0);
  const avgCry = entries.length ? Math.round(sumCry / entries.length) : 0;

  return (
    <div>
      <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>§ orbit · your gravity</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 36, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1,
        }}>
          <span style={{ fontStyle: 'italic', color: t.signal }}>{entries.length.toString().padStart(3, '0')}</span>
          {' '}satellites
        </div>
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
          color: t.creamDim, marginTop: 10,
        }}>each body weighted by the wetness of its effect on you.</div>
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 18,
            color: t.creamDim, lineHeight: 1.4,
          }}>empty sky. log a film to draw the first body.</div>
          <Link href="/search" style={{
            display: 'inline-block', marginTop: 18, padding: '12px 22px',
            border: `1px solid ${t.cream}`, color: t.cream, textDecoration: 'none',
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.5,
            textTransform: 'uppercase',
          }}>begin</Link>
        </div>
      ) : (
        <>
          <OrbitChart bodies={bodies} t={t} />
          <div style={{
            padding: '0 20px',
            display: 'flex', justifyContent: 'space-between',
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
            textTransform: 'uppercase', color: t.muted,
          }}>
            <span>avg cry · {avgCry.toString().padStart(3, '0')}</span>
            <span>total wet · {sumCry}</span>
          </div>
          <div style={{ padding: '24px 20px' }}>
            {bodies.map(b => (
              <Link key={b.id} href={`/films/${encodeURIComponent(b.filmId)}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: `1px solid ${t.lineSoft}`,
                textDecoration: 'none', color: 'inherit',
              }}>
                <div style={{
                  fontFamily: LumiereType.body, fontSize: 17, color: t.cream,
                }}>{b.title}</div>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                  textTransform: 'uppercase', color: t.muted,
                }}>cry · {b.cry.toString().padStart(3, '0')}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrbitChart({ bodies, t }: { bodies: Body[]; t: ReturnType<typeof useTweaks>['theme'] }) {
  const size = 320;
  const cx = size / 2, cy = size / 2;
  return (
    <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[80, 130, 180].map(r => (
          <circle key={r} cx={cx} cy={cy} r={r} stroke={t.lineSoft} fill="none" strokeWidth="0.5" />
        ))}
        <circle cx={cx} cy={cy} r={4} fill={t.signal} />
        {bodies.map(b => {
          const rad = (b.angle * Math.PI) / 180;
          const x = cx + Math.cos(rad) * b.radius;
          const y = cy + Math.sin(rad) * b.radius;
          return (
            <g key={b.id}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={t.lineSoft} strokeWidth="0.5" />
              <circle cx={x} cy={y} r={b.size / 2} fill={t.cream} opacity={0.4 + (b.cry / 100) * 0.6} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
