'use client';
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchProfileByHandle, useMyProfile } from '@/app/components/lib/profileStore';
import { useFollowing, follow, unfollow } from '@/app/components/lib/followStore';
import { usePublicEntriesByUser } from '@/app/components/lib/feedStore';
import { useFilmsForEntries } from '@/app/components/lib/useFilms';
import { useFilmOverrides, applyOverride } from '@/app/components/lib/filmOverrides';
import type { Film, LogEntry, Profile } from '@/app/components/lib/types';
import { Avatar, avatarFor, Eyebrow } from '@/app/components/ui/Primitives';
import { CryMeter } from '@/app/components/ui/CryMeter';
import { Poster } from '@/app/components/ui/Poster';

export default function UserPage() {
  const { theme: t, tweaks } = useTweaks();
  const router = useRouter();
  const params = useParams<{ handle: string }>();
  const handle = decodeURIComponent(params.handle ?? '').toLowerCase();
  const auth = useAuth();
  const { profile: me } = useMyProfile();
  const { ids: followingIds } = useFollowing();

  const [result, setResult] = React.useState<{ handle: string; profile: Profile | null } | null>(null);
  React.useEffect(() => {
    if (!handle) return;
    let cancel = false;
    void fetchProfileByHandle(handle).then(p => { if (!cancel) setResult({ handle, profile: p }); });
    return () => { cancel = true; };
  }, [handle]);
  const isLoading = !handle || result?.handle !== handle;
  const profile: Profile | null = result?.handle === handle ? result.profile : null;
  const userId = profile?.id ?? '';
  const feed = usePublicEntriesByUser(userId, 40);
  const rawFilms = useFilmsForEntries(feed.entries);
  const overrides = useFilmOverrides();
  const films = React.useMemo<Record<string, Film>>(() => {
    const out: Record<string, Film> = {};
    for (const [id, f] of Object.entries(rawFilms)) {
      out[id] = overrides[id] ? applyOverride(f, overrides[id]) : f;
    }
    return out;
  }, [rawFilms, overrides]);

  if (isLoading) return <Center t={t} text="loading…" />;
  if (!profile) return <Center t={t} text={`no one named @${handle}`} />;

  const isSelf = me?.id === profile.id;
  const isFollowing = followingIds.includes(profile.id);
  const avatar = avatarFor(profile.id, profile.handle);

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 16,
        }}>← back</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar friend={avatar} size={64} t={t} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: LumiereType.display, fontSize: 32, lineHeight: 1,
              color: t.cream, letterSpacing: -0.8,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>@{profile.handle}</div>
            {profile.name && (
              <div style={{
                fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 16,
                color: t.creamDim, marginTop: 4,
              }}>{profile.name}</div>
            )}
          </div>
        </div>

        {profile.bio && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
            color: t.creamDim, marginTop: 14, lineHeight: 1.45,
          }}>{profile.bio}</div>
        )}

        {!isSelf && (auth.status === 'anon' || auth.status === 'user') && me && (
          <FollowButton id={profile.id} isFollowing={isFollowing} t={t} />
        )}
        {isSelf && (
          <div style={{
            marginTop: 16, padding: '10px 12px', border: `1px dashed ${t.line}`,
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
            textTransform: 'uppercase', color: t.muted, textAlign: 'center',
          }}>this is your public page</div>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        <Eyebrow num="§" label={isSelf ? 'your public log' : 'public log'} t={t} style={{ marginBottom: 16 }} />
        {feed.state === 'loading' && (
          <Center t={t} text="loading entries…" tight />
        )}
        {feed.state === 'error' && (
          <Center t={t} text={`error · ${feed.error}`} tight />
        )}
        {feed.state === 'loaded' && feed.entries.length === 0 && (
          <Center
            t={t}
            tight
            text={isSelf
              ? 'no public entries yet. toggle entries to "followers" when logging.'
              : 'no public entries yet.'}
          />
        )}
        {feed.entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {feed.entries.map(e => (
              <PublicEntryCard
                key={e.id}
                entry={e}
                film={films[e.filmId] || null}
                t={t}
                cryStyle={tweaks.cryStyle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FollowButton({
  id, isFollowing, t,
}: {
  id: string;
  isFollowing: boolean;
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const [busy, setBusy] = React.useState(false);
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    if (isFollowing) await unfollow(id);
    else await follow(id);
    setBusy(false);
  };
  return (
    <button onClick={toggle} disabled={busy} style={{
      display: 'block', width: '100%', marginTop: 18, padding: '14px 0',
      background: isFollowing ? 'transparent' : t.cream,
      color: isFollowing ? t.creamDim : t.bg,
      border: `1px solid ${isFollowing ? t.line : t.cream}`,
      cursor: busy ? 'default' : 'pointer',
      fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.5,
      textTransform: 'uppercase', opacity: busy ? 0.6 : 1,
    }}>{isFollowing ? 'unfollow' : 'follow'}</button>
  );
}

function PublicEntryCard({
  entry, film, t, cryStyle,
}: {
  entry: LogEntry;
  film: Film | null;
  t: ReturnType<typeof useTweaks>['theme'];
  cryStyle: ReturnType<typeof useTweaks>['tweaks']['cryStyle'];
}) {
  const date = new Date(entry.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).toLowerCase();
  return (
    <article style={{ display: 'flex', gap: 14 }}>
      {film
        ? <Link href={`/films/${encodeURIComponent(film.id)}`}><Poster film={film} size="sm" t={t} /></Link>
        : <div style={{
            width: 72, height: 104, background: t.surfaceHi, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: LumiereType.mono, fontSize: 10, color: t.muted,
          }}>?</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 20, lineHeight: 1,
          color: t.cream, letterSpacing: -0.4,
        }}>{film?.title || 'unknown film'}</div>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.6,
          textTransform: 'uppercase', color: t.muted, marginTop: 6, marginBottom: 10,
        }}>{date} · cry {entry.cry}</div>
        <CryMeter value={entry.cry} t={t} style={cryStyle} />
        {entry.note && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
            color: t.creamDim, lineHeight: 1.4, marginTop: 10,
          }}>{entry.note}</div>
        )}
      </div>
    </article>
  );
}

function Center({
  t, text, tight,
}: {
  t: ReturnType<typeof useTweaks>['theme'];
  text: string;
  tight?: boolean;
}) {
  return (
    <div style={{
      padding: tight ? '24px 0' : '80px 20px', textAlign: 'center',
      fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: tight ? 15 : 18,
      color: t.creamDim,
    }}>{text}</div>
  );
}
