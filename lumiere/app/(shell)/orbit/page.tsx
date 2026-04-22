'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType, DEFAULT_DIMS } from '@/app/components/lib/tokens';
import type { DimKey } from '@/app/components/lib/tokens';
import { useLog } from '@/app/components/lib/logStore';
import { useFilmsForEntries } from '@/app/components/lib/useFilms';
import { useFilmOverrides, applyOverride } from '@/app/components/lib/filmOverrides';
import type { Film, LogEntry } from '@/app/components/lib/types';
import { Poster } from '@/app/components/ui/Poster';
import { Eyebrow } from '@/app/components/ui/Primitives';

export default function OrbitPage() {
  const { theme: t } = useTweaks();
  const entries = useLog();
  const rawFilms = useFilmsForEntries(entries);
  const overrides = useFilmOverrides();
  const films = React.useMemo<Record<string, Film>>(() => {
    const out: Record<string, Film> = {};
    for (const [id, f] of Object.entries(rawFilms)) {
      out[id] = overrides[id] ? applyOverride(f, overrides[id]) : f;
    }
    return out;
  }, [rawFilms, overrides]);

  const stats = React.useMemo(() => buildStats(entries, films), [entries, films]);

  return (
    <div>
      <div style={{ padding: '20px 20px 18px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>§ the atlas</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 36, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1,
        }}>
          <span style={{ fontStyle: 'italic', color: t.signal }}>{entries.length.toString().padStart(3, '0')}</span>
          {' '}{entries.length === 1 ? 'reading' : 'readings'}
        </div>
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
          color: t.creamDim, marginTop: 10,
        }}>{stats.subtitle}</div>
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
          <OrbitChart entries={entries} films={films} t={t} />

          <div style={{ padding: '16px 20px 0' }}>
            <Eyebrow num="01" label="summary" t={t} style={{ marginBottom: 14 }} />
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1,
              background: t.line,
              border: `1px solid ${t.line}`,
            }}>
              <Stat t={t} label="avg cry" value={stats.avgCry} />
              <Stat t={t} label="peak cry" value={stats.peakCry} />
              <Stat t={t} label="days logged" value={stats.daysLogged} />
              <Stat t={t} label="wettest streak" value={stats.longestStreak} />
            </div>
          </div>

          <div style={{ padding: '28px 20px 0' }}>
            <Eyebrow num="02" label="cry distribution" t={t} style={{ marginBottom: 14 }} />
            <CryHistogram buckets={stats.cryBuckets} t={t} />
          </div>

          {stats.peakFilm && (
            <div style={{ padding: '28px 20px 0' }}>
              <Eyebrow num="03" label="peaks" t={t} style={{ marginBottom: 14 }} />
              <PeakRow label="wettest" entry={stats.peakFilm.entry} film={stats.peakFilm.film} t={t} />
              {stats.dryFilm && stats.dryFilm.entry.id !== stats.peakFilm.entry.id && (
                <PeakRow label="driest" entry={stats.dryFilm.entry} film={stats.dryFilm.film} t={t} />
              )}
            </div>
          )}

          {stats.dims.length > 0 && (
            <div style={{ padding: '28px 20px 0' }}>
              <Eyebrow num="04" label="your dimensions" t={t} style={{ marginBottom: 14 }} />
              <DimensionBars dims={stats.dims} t={t} />
            </div>
          )}

          {stats.tags.length > 0 && (
            <div style={{ padding: '28px 20px 0' }}>
              <Eyebrow num="05" label="recurring tags" t={t} style={{ marginBottom: 14 }} />
              <TagCloud tags={stats.tags} t={t} />
            </div>
          )}

          {stats.cadence.some(c => c.count > 0) && (
            <div style={{ padding: '28px 20px 40px' }}>
              <Eyebrow num="06" label="cadence · last 12 months" t={t} style={{ marginBottom: 14 }} />
              <CadenceChart cadence={stats.cadence} t={t} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── stats building ───────────────────────────────────────────────────────

interface Stats {
  subtitle: string;
  avgCry: string;
  peakCry: string;
  daysLogged: string;
  longestStreak: string;
  cryBuckets: { label: string; count: number }[];
  peakFilm: { entry: LogEntry; film: Film | null } | null;
  dryFilm: { entry: LogEntry; film: Film | null } | null;
  dims: { key: DimKey; label: string; avg: number; count: number }[];
  tags: { tag: string; count: number }[];
  cadence: { label: string; count: number }[];
}

function buildStats(entries: LogEntry[], films: Record<string, Film>): Stats {
  if (entries.length === 0) {
    return {
      subtitle: 'the archive is empty.',
      avgCry: '000', peakCry: '000',
      daysLogged: '000', longestStreak: '000',
      cryBuckets: [], peakFilm: null, dryFilm: null,
      dims: [], tags: [], cadence: [],
    };
  }

  const sumCry = entries.reduce((s, e) => s + e.cry, 0);
  const avg = Math.round(sumCry / entries.length);
  const peak = entries.reduce((best, e) => (e.cry > best.cry ? e : best), entries[0]);
  const driestCandidates = entries.filter(e => e.cry > 0);
  const driest = driestCandidates.length
    ? driestCandidates.reduce((low, e) => (e.cry < low.cry ? e : low), driestCandidates[0])
    : null;

  const buckets = [
    { label: '0–20', count: 0 },
    { label: '20–40', count: 0 },
    { label: '40–60', count: 0 },
    { label: '60–80', count: 0 },
    { label: '80–100', count: 0 },
  ];
  for (const e of entries) {
    const idx = Math.min(4, Math.floor(e.cry / 20));
    buckets[idx].count++;
  }

  // dimensions
  const dimTotals: Record<string, { sum: number; count: number }> = {};
  for (const e of entries) {
    for (const [k, v] of Object.entries(e.ratings)) {
      if (!v) continue;
      if (!dimTotals[k]) dimTotals[k] = { sum: 0, count: 0 };
      dimTotals[k].sum += v;
      dimTotals[k].count++;
    }
  }
  const dims: { key: DimKey; label: string; avg: number; count: number }[] =
    DEFAULT_DIMS.flatMap(d => {
      const tot = dimTotals[d.key];
      return tot ? [{ key: d.key as DimKey, label: String(d.label), avg: tot.sum / tot.count, count: tot.count }] : [];
    }).sort((a, b) => b.avg - a.avg);

  // tags from films
  const tagCount = new Map<string, number>();
  for (const e of entries) {
    const f = films[e.filmId];
    if (!f?.tags) continue;
    for (const tag of f.tags) tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
  }
  const tags = Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // days + streak (uses local date)
  const daySet = new Set<string>();
  for (const e of entries) daySet.add(dayKey(e.createdAt));
  const days = Array.from(daySet).sort();
  let longest = 0, cur = 1;
  for (let i = 1; i < days.length; i++) {
    if (dayDiff(days[i - 1], days[i]) === 1) { cur++; }
    else { longest = Math.max(longest, cur); cur = 1; }
  }
  longest = Math.max(longest, cur);
  if (days.length === 0) longest = 0;

  // cadence — last 12 months
  const now = new Date();
  const cadence: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    cadence.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase(),
      count: entries.filter(e => e.createdAt.startsWith(key)).length,
    });
  }

  const subtitle = avg >= 60
    ? 'you cry. the record reflects this.'
    : avg >= 30
      ? 'a measured amount of water.'
      : 'mostly contained, the archive.';

  return {
    subtitle,
    avgCry: avg.toString().padStart(3, '0'),
    peakCry: peak.cry.toString().padStart(3, '0'),
    daysLogged: days.length.toString().padStart(3, '0'),
    longestStreak: longest.toString().padStart(3, '0'),
    cryBuckets: buckets,
    peakFilm: { entry: peak, film: films[peak.filmId] ?? null },
    dryFilm: driest ? { entry: driest, film: films[driest.filmId] ?? null } : null,
    dims,
    tags,
    cadence,
  };
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / 86400000);
}

// ── components ───────────────────────────────────────────────────────────

function OrbitChart({
  entries, films, t,
}: {
  entries: LogEntry[];
  films: Record<string, Film>;
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const size = 300;
  const cx = size / 2, cy = size / 2;
  const bodies = entries.map((e, i) => {
    const cry = Math.max(0, Math.min(100, e.cry));
    const angle = (i * 137.5) % 360;
    return {
      id: e.id,
      rad: (angle * Math.PI) / 180,
      radius: 56 + (100 - cry) * 1.2,
      size: 5 + (cry / 100) * 8,
      cry,
      title: films[e.filmId]?.title ?? '…',
    };
  });

  return (
    <div style={{ padding: '18px 20px 8px', display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[70, 120, 170].map(r => (
          <circle key={r} cx={cx} cy={cy} r={r} stroke={t.lineSoft} fill="none" strokeWidth="0.5" />
        ))}
        <circle cx={cx} cy={cy} r={3} fill={t.signal} />
        {bodies.map(b => {
          const x = cx + Math.cos(b.rad) * b.radius;
          const y = cy + Math.sin(b.rad) * b.radius;
          return (
            <g key={b.id}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={t.lineSoft} strokeWidth="0.4" />
              <circle cx={x} cy={y} r={b.size / 2} fill={t.cream} opacity={0.35 + (b.cry / 100) * 0.55} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Stat({
  t, label, value,
}: {
  t: ReturnType<typeof useTweaks>['theme'];
  label: string;
  value: string;
}) {
  return (
    <div style={{ background: t.bg, padding: '16px 14px' }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted, marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: LumiereType.display, fontSize: 32, lineHeight: 1,
        color: t.cream, letterSpacing: -0.8,
      }}>{value}</div>
    </div>
  );
}

function CryHistogram({
  buckets, t,
}: {
  buckets: { label: string; count: number }[];
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const max = Math.max(1, ...buckets.map(b => b.count));
  const barMax = 120;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {buckets.map((b, i) => {
        const pct = b.count / max;
        const w = Math.max(pct * 100, b.count ? 4 : 0);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 54, flexShrink: 0,
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
              color: t.muted,
            }}>{b.label}</div>
            <div style={{ flex: 1, height: 14, background: t.lineSoft, position: 'relative' }}>
              <div style={{
                width: `${w}%`, height: '100%',
                background: t.cream, opacity: 0.4 + (i / (buckets.length - 1)) * 0.6,
                transition: 'width 0.4s ease',
                maxWidth: `${barMax}%`,
              }} />
            </div>
            <div style={{
              width: 24, textAlign: 'right',
              fontFamily: LumiereType.mono, fontSize: 11,
              color: b.count ? t.cream : t.muted,
            }}>{b.count}</div>
          </div>
        );
      })}
    </div>
  );
}

function PeakRow({
  label, entry, film, t,
}: {
  label: string;
  entry: LogEntry;
  film: Film | null;
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const href = film ? `/films/${encodeURIComponent(film.id)}` : '#';
  return (
    <Link href={href} style={{
      display: 'flex', gap: 12, alignItems: 'center',
      padding: '10px 0', borderBottom: `1px solid ${t.lineSoft}`,
      textDecoration: 'none', color: 'inherit',
    }}>
      {film
        ? <Poster film={film} size="xs" t={t} />
        : <div style={{
            width: 44, height: 64, background: t.surfaceHi, flexShrink: 0,
          }} />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 4,
        }}>{label}</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 20, lineHeight: 1.05,
          color: t.cream, letterSpacing: -0.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{film?.title ?? 'unknown'}</div>
      </div>
      <div style={{
        fontFamily: LumiereType.display, fontSize: 28, lineHeight: 1,
        color: t.signal, letterSpacing: -0.6,
      }}>{entry.cry.toString().padStart(3, '0')}</div>
    </Link>
  );
}

function DimensionBars({
  dims, t,
}: {
  dims: { key: DimKey; label: string; avg: number; count: number }[];
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {dims.map(d => {
        const pct = (d.avg / 5) * 100;
        return (
          <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 90, flexShrink: 0,
              fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
              textTransform: 'uppercase', color: t.creamDim,
            }}>{d.label}</div>
            <div style={{ flex: 1, display: 'flex', gap: 3 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{
                  flex: 1, height: 4,
                  background: d.avg >= i - 0.5 ? t.cream : t.lineSoft,
                  opacity: d.avg >= i - 0.5 ? 1 : 0.5,
                }} />
              ))}
            </div>
            <div style={{
              width: 44, textAlign: 'right',
              fontFamily: LumiereType.mono, fontSize: 10,
              color: t.muted,
            }}>
              <span style={{ color: t.cream }}>{d.avg.toFixed(1)}</span>
              <span style={{ opacity: 0.6 }}> · {d.count}</span>
            </div>
          </div>
        );
      })}
      <div style={{ height: 4 }} />
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
        textTransform: 'uppercase', color: t.muted,
      }}>avg / rating count · sorted strongest first</div>
    </div>
  );
}

function TagCloud({
  tags, t,
}: {
  tags: { tag: string; count: number }[];
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const max = tags[0]?.count ?? 1;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {tags.map(({ tag, count }) => {
        const strength = 0.4 + (count / max) * 0.6;
        return (
          <div key={tag} style={{
            padding: '6px 10px', border: `1px solid ${t.line}`,
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.4,
            textTransform: 'uppercase', color: t.cream, opacity: strength,
          }}>
            {tag} <span style={{ color: t.muted, marginLeft: 4 }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function CadenceChart({
  cadence, t,
}: {
  cadence: { label: string; count: number }[];
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const max = Math.max(1, ...cadence.map(c => c.count));
  const height = 100;
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 4, height,
        borderBottom: `1px solid ${t.line}`,
      }}>
        {cadence.map((c, i) => {
          const h = (c.count / max) * (height - 4);
          return (
            <div key={i} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'flex-end', gap: 2,
              position: 'relative',
            }}>
              <div style={{
                width: '100%', height: Math.max(h, c.count ? 2 : 0),
                background: t.cream, opacity: 0.3 + (c.count / max) * 0.7,
              }} />
            </div>
          );
        })}
      </div>
      <div style={{
        display: 'flex', gap: 4, marginTop: 4,
      }}>
        {cadence.map((c, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center',
            fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1,
            textTransform: 'uppercase', color: c.count ? t.creamDim : t.muted,
          }}>{c.label}</div>
        ))}
      </div>
    </div>
  );
}
