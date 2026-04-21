'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import { searchFilms } from '@/app/components/lib/api';
import { Poster } from '@/app/components/ui/Poster';
import { Eyebrow } from '@/app/components/ui/Primitives';
import type { Film } from '@/app/components/lib/types';

export default function SearchPage() {
  const { theme: t } = useTweaks();
  const [q, setQ] = React.useState('');
  const [results, setResults] = React.useState<Film[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const term = q.trim();
    if (!term) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      setErr(null);
      try {
        const r = await searchFilms(term);
        if (!cancelled) setResults(r);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [q]);

  const shown = q.trim() ? results : [];

  return (
    <div>
      <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>§ find a film</div>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="title, director, anything…"
          style={{
            width: '100%', padding: '10px 0', border: 'none', outline: 'none',
            borderBottom: `1px solid ${t.line}`, background: 'transparent',
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 22,
            color: t.cream,
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 8,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
          textTransform: 'uppercase', color: t.muted,
        }}>
          <span>{loading ? 'searching…' : err ? `error · ${err}` : q.trim() ? `${shown.length} result${shown.length === 1 ? '' : 's'}` : 'awaiting input'}</span>
          <span>archive · tmdb</span>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {!q.trim() && <EmptyHint t={t} />}
        {q.trim() && !loading && !err && shown.length === 0 && results.length === 0 && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
            color: t.creamDim, padding: '20px 0',
          }}>nothing found. try a different angle.</div>
        )}
        {shown.length > 0 && (
          <>
            <Eyebrow num="01" label="matches" t={t} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {shown.map(f => <ResultRow key={f.id} film={f} t={t} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyHint({ t }: { t: ReturnType<typeof useTweaks>['theme'] }) {
  const hints = ['citizen kane', 'wong kar-wai', 'before sunrise', 'in the mood for love'];
  return (
    <div>
      <Eyebrow num="00" label="try" t={t} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {hints.map(h => (
          <div key={h} style={{
            padding: '6px 12px', border: `1px solid ${t.line}`,
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.4,
            textTransform: 'uppercase', color: t.creamDim,
          }}>{h}</div>
        ))}
      </div>
    </div>
  );
}

function ResultRow({ film, t }: { film: Film; t: ReturnType<typeof useTweaks>['theme'] }) {
  return (
    <Link href={`/films/${encodeURIComponent(film.id)}`} style={{
      display: 'flex', gap: 14, textDecoration: 'none', color: 'inherit',
      borderBottom: `1px solid ${t.lineSoft}`, paddingBottom: 14,
    }}>
      <Poster film={film} size="sm" t={t} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 22, lineHeight: 1.05,
          color: t.cream, letterSpacing: -0.4, marginBottom: 4,
        }}>{film.title}</div>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
          textTransform: 'uppercase', color: t.muted, marginBottom: 8,
        }}>
          {film.year || '—'} · {film.kind}
        </div>
        {film.synopsis && (
          <div style={{
            fontFamily: LumiereType.body, fontSize: 14, lineHeight: 1.4,
            color: t.creamDim,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{film.synopsis}</div>
        )}
      </div>
    </Link>
  );
}
