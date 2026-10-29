'use client';
import React from 'react';
import Link from 'next/link';
import type { Theme } from '@/app/components/lib/tokens';
import { LumiereType, DEFAULT_DIMS } from '@/app/components/lib/tokens';
import { fetchFilmCommunityStats } from '@/app/components/lib/communityStore';
import type { CommunityStats } from '@/app/components/lib/communityStore';
import { Eyebrow } from '@/app/components/ui/Primitives';

const BAND_LABELS = ['0–19', '20–39', '40–59', '60–79', '80–100'];

/** Everyone's cry for this film, as aggregates (3+ people). */
export function CommunityRating({ filmId, t }: { filmId: string; t: Theme }) {
  const [data, setData] = React.useState<{ id: string; stats: CommunityStats | null } | null>(null);
  React.useEffect(() => {
    let cancel = false;
    void fetchFilmCommunityStats(filmId).then(stats => { if (!cancel) setData({ id: filmId, stats }); });
    return () => { cancel = true; };
  }, [filmId]);

  const stats = data?.id === filmId ? data.stats : undefined;
  // undefined: loading; null: backend unavailable (local mode, migration missing)
  if (stats === undefined || stats === null) return null;

  return (
    <div style={{ padding: '8px 20px 8px', borderTop: `1px solid ${t.line}`, marginTop: 8 }}>
      <Eyebrow num="◎" label="everyone" t={t} style={{ margin: '24px 0 14px' }} />

      {stats.raters === 0 || stats.avgCry == null ? (
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15, color: t.creamDim,
        }}>not enough readings yet. the average shows once 3 people have logged it.</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
            <div style={{
              fontFamily: LumiereType.display, fontSize: 56, lineHeight: 0.9,
              color: t.cream, letterSpacing: -1.6,
            }}>{stats.avgCry}</div>
            <div>
              <div style={{
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                textTransform: 'uppercase', color: t.muted,
              }}>avg cry</div>
              <div style={{
                fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14, color: t.creamDim, marginTop: 2,
              }}>from {stats.raters} {stats.raters === 1 ? 'person' : 'people'}</div>
            </div>
          </div>

          <Distribution buckets={stats.buckets} t={t} />

          {Object.keys(stats.dims).length > 0 && (
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEFAULT_DIMS.filter(d => stats.dims[d.key] != null).map(d => (
                <DimRow key={d.key} label={d.label} value={stats.dims[d.key]} t={t} />
              ))}
            </div>
          )}

          <Link href="/charts" style={{
            display: 'inline-block', marginTop: 16, color: t.creamDim, textDecoration: 'none',
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase',
          }}>see the charts →</Link>
        </>
      )}
    </div>
  );
}

function Distribution({ buckets, t }: { buckets: number[]; t: Theme }) {
  const max = Math.max(1, ...buckets);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
      {BAND_LABELS.map((label, i) => {
        const n = buckets[i] ?? 0;
        return (
          <div key={label} title={`${n} · cry ${label}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', height: `${Math.max(n ? 6 : 1, (n / max) * 100)}%`,
                background: n ? t.cream : t.lineSoft, opacity: 0.35 + (i / 4) * 0.6,
              }} />
            </div>
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 7, letterSpacing: 0.6, color: t.muted, textAlign: 'center',
            }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function DimRow({ label, value, t }: { label: string; value: number; t: Theme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 84, flexShrink: 0,
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: t.creamDim,
      }}>{label}</div>
      <div style={{ flex: 1, height: 2, background: t.lineSoft, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${(value / 5) * 100}%`, background: t.cream }} />
      </div>
      <div style={{
        width: 28, textAlign: 'right', fontFamily: LumiereType.mono, fontSize: 11, color: t.cream,
      }}>{value.toFixed(1)}</div>
    </div>
  );
}
