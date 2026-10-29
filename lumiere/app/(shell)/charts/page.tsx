'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchLeaderboard, CHART_MAX } from '@/app/components/lib/communityStore';
import type { ChartOrder, ChartRow } from '@/app/components/lib/communityStore';
import { useFilmsByIds } from '@/app/components/lib/useFilms';
import { Poster } from '@/app/components/ui/Poster';

const PAGE = 50;
const TABS: { id: ChartOrder; label: string; blurb: string }[] = [
  { id: 'rating', label: 'highest rated', blurb: 'by average cry, weighted so a handful of perfect scores can’t outrank hundreds of near-perfect ones.' },
  { id: 'popular', label: 'most logged', blurb: 'by how many people have logged and scored it.' },
];

export default function ChartsPage() {
  const { theme: t } = useTweaks();
  const router = useRouter();
  const auth = useAuth();
  const [order, setOrder] = React.useState<ChartOrder>('rating');
  const [rows, setRows] = React.useState<{ order: ChartOrder; list: ChartRow[]; done: boolean } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const ready = auth.status === 'anon' || auth.status === 'user';

  const apply = (o: ChartOrder, offset: number, page: ChartRow[] | null) => {
    if (!page) { setErr('couldn’t load the charts'); return; }
    setErr(null);
    setRows(prev => {
      const base = prev && prev.order === o && offset > 0 ? prev.list : [];
      const list = [...base, ...page];
      return { order: o, list, done: page.length < PAGE || list.length >= CHART_MAX };
    });
  };

  React.useEffect(() => {
    if (!ready) return;
    let cancel = false;  // a quick tab switch must not let the old tab's page land
    void fetchLeaderboard(order, PAGE, 0).then(page => { if (!cancel) apply(order, 0, page); });
    return () => { cancel = true; };
  }, [order, ready]);

  const loadMore = async (offset: number) => {
    const o = order;
    setLoading(true);
    const page = await fetchLeaderboard(o, PAGE, offset);
    setLoading(false);
    apply(o, offset, page);
  };

  const list = rows?.order === order ? rows.list : [];
  const films = useFilmsByIds(list.map(r => r.filmId));
  const tab = TABS.find(x => x.id === order)!;

  return (
    <div>
      <div style={{ padding: '20px 20px 18px', borderBottom: `1px solid ${t.line}` }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 16,
        }}>← back</button>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>§ charts</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 44, lineHeight: 0.95, color: t.cream, letterSpacing: -1.2,
        }}>the top <span style={{ fontStyle: 'italic', color: t.signal }}>{CHART_MAX}</span></div>
        <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
          {TABS.map(x => {
            const active = x.id === order;
            return (
              <button key={x.id} onClick={() => setOrder(x.id)} style={{
                padding: '6px 12px', cursor: 'pointer',
                background: active ? t.cream : 'transparent',
                color: active ? t.bg : t.creamDim,
                border: `1px solid ${active ? t.cream : t.line}`,
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase',
              }}>{x.label}</button>
            );
          })}
        </div>
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
          color: t.creamDim, marginTop: 12, lineHeight: 1.45,
        }}>{tab.blurb} films need 3+ people to chart.</div>
      </div>

      <div style={{ padding: '8px 20px 20px' }}>
        {err && <Quiet t={t} text={err} />}
        {!err && rows?.order === order && list.length === 0 && (
          <Quiet t={t} text="nothing has charted yet. films appear once 3 people have logged them." />
        )}
        {!err && rows?.order !== order && <Quiet t={t} text="loading…" />}

        {list.map(r => {
          const film = films[r.filmId];
          return (
            <Link key={r.filmId} href={`/films/${encodeURIComponent(r.filmId)}`} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
              borderBottom: `1px solid ${t.lineSoft}`, textDecoration: 'none', color: 'inherit',
            }}>
              <div style={{
                width: 34, flexShrink: 0, textAlign: 'right',
                fontFamily: LumiereType.mono, fontSize: 13, color: r.rank <= 3 ? t.signal : t.muted,
              }}>{r.rank}</div>
              <div style={{ width: 44, flexShrink: 0 }}>
                {film
                  ? <Poster film={film} size="xs" t={t} />
                  : <div style={{ width: 44, height: 64, background: t.surfaceHi }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: LumiereType.display, fontSize: 18, lineHeight: 1.1, color: t.cream, letterSpacing: -0.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{film?.title ?? '…'}</div>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
                  textTransform: 'uppercase', color: t.muted, marginTop: 4,
                }}>{film?.year || '—'} · {r.raters} {r.raters === 1 ? 'person' : 'people'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontFamily: LumiereType.display, fontSize: 26, lineHeight: 1, color: t.cream, letterSpacing: -0.6,
                }}>{r.avgCry}</div>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 7, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted,
                }}>avg cry</div>
              </div>
            </Link>
          );
        })}

        {rows?.order === order && !rows.done && list.length > 0 && (
          <button onClick={() => void loadMore(list.length)} disabled={loading} style={{
            display: 'block', width: '100%', marginTop: 18, padding: '12px 0',
            background: 'transparent', color: t.creamDim, border: `1px solid ${t.line}`,
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
          }}>{loading ? 'loading…' : `next ${Math.min(PAGE, CHART_MAX - list.length)} →`}</button>
        )}
      </div>
    </div>
  );
}

function Quiet({ t, text }: { t: Theme; text: string }) {
  return (
    <div style={{
      padding: '48px 0', textAlign: 'center',
      fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 16, color: t.creamDim,
    }}>{text}</div>
  );
}
