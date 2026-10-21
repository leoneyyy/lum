'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { useWatchlist } from '@/app/components/lib/watchlistStore';
import { useFilmsByIds } from '@/app/components/lib/useFilms';
import { useFilmOverrides, applyOverride } from '@/app/components/lib/filmOverrides';
import type { Film } from '@/app/components/lib/types';
import { Poster } from '@/app/components/ui/Poster';

export default function WatchlistPage() {
  const { theme: t } = useTweaks();
  const router = useRouter();
  const auth = useAuth();
  const { ids, state } = useWatchlist();

  const ordered = React.useMemo(() => ids.slice().reverse(), [ids]);
  const filmsRaw = useFilmsByIds(ordered);
  const overrides = useFilmOverrides();
  const films = React.useMemo<Record<string, Film>>(() => {
    const out: Record<string, Film> = {};
    for (const [id, f] of Object.entries(filmsRaw)) {
      out[id] = overrides[id] ? applyOverride(f, overrides[id]) : f;
    }
    return out;
  }, [filmsRaw, overrides]);

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
        }}>§ queue</div>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 14,
          fontFamily: LumiereType.display, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1.4,
        }}>
          <span style={{ fontSize: 48, fontStyle: 'italic', color: t.signal }}>watchlist</span>
          <span style={{ fontSize: 36, color: t.creamDim }}>{ids.length.toString().padStart(3, '0')}</span>
        </div>
      </div>

      {auth.status !== 'anon' && auth.status !== 'user' && (
        <Empty t={t} text="connect to use a watchlist." />
      )}

      {(auth.status === 'anon' || auth.status === 'user') && state !== 'loaded' && (
        <Empty t={t} text="loading…" />
      )}

      {state === 'loaded' && ids.length === 0 && (
        <Empty t={t} text='nothing queued. tap "watchlist" on any film page to save it for later.' />
      )}

      {state === 'loaded' && ids.length > 0 && (
        <div style={{ padding: 20 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
            gap: 10,
          }}>
            {ordered.map(id => {
              const film = films[id];
              return (
                <Link
                  key={id}
                  href={`/films/${encodeURIComponent(id)}`}
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                  title={film?.title}
                >
                  {film
                    ? <div style={{ width: '100%', aspectRatio: '2/3' }}>
                        <Poster film={film} size="sm" t={t} style={{ width: '100%', height: '100%' }} />
                      </div>
                    : <div style={{
                        width: '100%', aspectRatio: '2/3', background: t.surfaceHi,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: LumiereType.mono, fontSize: 10, color: t.muted,
                      }}>·</div>
                  }
                  {film && (
                    <div style={{
                      fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1,
                      color: t.muted, marginTop: 6,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{film.title}</div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ t, text }: { t: Theme; text: string }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center',
      fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 16,
      color: t.creamDim,
    }}>{text}</div>
  );
}
