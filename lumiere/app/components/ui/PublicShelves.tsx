'use client';
import React from 'react';
import Link from 'next/link';
import type { Theme } from '@/app/components/lib/tokens';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Film } from '@/app/components/lib/types';
import { useFilmsByIds } from '@/app/components/lib/useFilms';
import { useFilmOverridesFor, applyOverride } from '@/app/components/lib/filmOverrides';
import { fetchPublicListsByUser } from '@/app/components/lib/listsStore';
import type { PublicListSummary } from '@/app/components/lib/listsStore';
import { fetchWatchedByUser } from '@/app/components/lib/watchedStore';
import { Eyebrow } from '@/app/components/ui/Primitives';
import { Poster } from '@/app/components/ui/Poster';

// Films as the profile owner styled them (custom posters), keyed by id.
function useOwnerFilms(ownerId: string, ids: readonly string[]): Record<string, Film> {
  const raw = useFilmsByIds(ids);
  const overrides = useFilmOverridesFor(ownerId);
  return React.useMemo(() => {
    const out: Record<string, Film> = {};
    for (const [id, f] of Object.entries(raw)) {
      out[id] = overrides[id] ? applyOverride(f, overrides[id]) : f;
    }
    return out;
  }, [raw, overrides]);
}

/** Native share sheet on phones, copy-to-clipboard elsewhere. */
export function ShareProfileButton({ handle, t, dark }: { handle: string; t: Theme; dark?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const share = async () => {
    const url = `${window.location.origin}/u/${encodeURIComponent(handle)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${handle} on lumière`, url });
        return;
      } catch (e) {
        // user dismissed the sheet: nothing to do
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('copy this link', url);
    }
  };
  const color = dark ? t.cream : t.creamDim;
  return (
    <button onClick={() => void share()} aria-label="share profile" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      height: 36, padding: '0 12px', cursor: 'pointer',
      background: dark ? 'rgba(0,0,0,0.45)' : 'transparent',
      border: `1px solid ${copied ? t.signal : t.line}`,
      color: copied ? t.signal : color,
      fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
      textTransform: 'uppercase',
    }}>
      <ShareIcon c={copied ? t.signal : color} />
      {copied ? 'link copied' : 'share'}
    </button>
  );
}

function ShareIcon({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M6 1v7M3 4l3-3 3 3M2 7v4h8V7" stroke={c} fill="none" strokeWidth="1" />
    </svg>
  );
}

/** Someone's watched films, when they've chosen to show them. */
export function PublicWatchedStrip({ ownerId, t }: { ownerId: string; t: Theme }) {
  const [data, setData] = React.useState<{ owner: string; ids: string[]; total: number } | null>(null);
  React.useEffect(() => {
    let cancel = false;
    void fetchWatchedByUser(ownerId).then(r => { if (!cancel) setData({ owner: ownerId, ...r }); });
    return () => { cancel = true; };
  }, [ownerId]);
  const ids = data?.owner === ownerId ? data.ids : [];
  const films = useOwnerFilms(ownerId, ids);
  if (!data || data.owner !== ownerId || data.total === 0) return null;

  return (
    <div style={{ padding: '20px', borderBottom: `1px solid ${t.line}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted,
        }}>
          <span style={{ color: t.accent }}>◇</span> watched
        </div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 22, lineHeight: 1,
          color: t.cream, letterSpacing: -0.4,
        }}>{data.total.toString().padStart(3, '0')}</div>
        <div style={{ flex: 1, height: 1, background: t.line }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {ids.map(id => (
          <Link key={id} href={`/films/${encodeURIComponent(id)}`} title={films[id]?.title} style={{
            flexShrink: 0, width: 72, textDecoration: 'none', color: 'inherit',
          }}>
            {films[id]
              ? <Poster film={films[id]} size="sm" t={t} />
              : <div style={{ width: 72, height: 104, background: t.surfaceHi }} />}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Public lists as cards with a four-poster cover strip. */
export function PublicListsSection({ ownerId, t, isSelf }: { ownerId: string; t: Theme; isSelf: boolean }) {
  const [data, setData] = React.useState<{ owner: string; lists: PublicListSummary[] } | null>(null);
  React.useEffect(() => {
    let cancel = false;
    void fetchPublicListsByUser(ownerId).then(lists => { if (!cancel) setData({ owner: ownerId, lists }); });
    return () => { cancel = true; };
  }, [ownerId]);
  const lists = data?.owner === ownerId ? data.lists : [];
  const coverIds = React.useMemo(() => lists.flatMap(l => l.coverFilmIds), [lists]);
  const films = useOwnerFilms(ownerId, coverIds);
  if (!data || data.owner !== ownerId) return null;

  if (lists.length === 0) {
    if (!isSelf) return null;
    return (
      <div style={{ padding: '20px', borderBottom: `1px solid ${t.line}` }}>
        <Eyebrow num="▤" label="lists" t={t} style={{ marginBottom: 12 }} />
        <Link href="/profile/lists" style={{
          display: 'block', padding: '12px 14px', border: `1px dashed ${t.line}`,
          textDecoration: 'none', color: t.creamDim,
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
        }}>no public lists yet. set a list to public to show it here →</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', borderBottom: `1px solid ${t.line}` }}>
      <Eyebrow num="▤" label="lists" t={t} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lists.map(l => (
          <Link key={l.id} href={`/profile/lists/${l.id}`} style={{
            display: 'flex', gap: 14, alignItems: 'center',
            padding: 12, border: `1px solid ${t.line}`, background: t.surface,
            textDecoration: 'none', color: 'inherit',
          }}>
            <div style={{ display: 'flex', flexShrink: 0 }}>
              {Array.from({ length: 4 }, (_, i) => {
                const id = l.coverFilmIds[i];
                const film = id ? films[id] : null;
                return (
                  <div key={i} style={{
                    width: 36, height: 52, marginLeft: i === 0 ? 0 : -14,
                    border: `1px solid ${t.bg}`, background: t.surfaceHi, overflow: 'hidden',
                    position: 'relative', zIndex: 4 - i,
                  }}>
                    {film && <Poster film={film} size="xs" t={t} style={{ width: '100%', height: '100%' }} />}
                  </div>
                );
              })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: LumiereType.display, fontSize: 19, lineHeight: 1.1,
                color: t.cream, letterSpacing: -0.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{l.name}</div>
              <div style={{
                fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
                textTransform: 'uppercase', color: t.muted, marginTop: 4,
              }}>{l.filmCount} film{l.filmCount === 1 ? '' : 's'}</div>
            </div>
            <div style={{ fontFamily: LumiereType.mono, fontSize: 14, color: t.creamDim }}>›</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
