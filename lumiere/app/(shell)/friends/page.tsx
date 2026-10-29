'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { useMyProfile } from '@/app/components/lib/profileStore';
import {
  searchProfiles, useProfiles,
} from '@/app/components/lib/profileStore';
import {
  useFollowing, follow, unfollow,
} from '@/app/components/lib/followStore';
import type { Profile } from '@/app/components/lib/types';
import { Avatar, avatarFor, Eyebrow } from '@/app/components/ui/Primitives';
import { fetchSuggestedProfiles } from '@/app/components/lib/communityStore';
import type { SuggestedProfile } from '@/app/components/lib/communityStore';

export default function FriendsPage() {
  const { theme: t } = useTweaks();
  const auth = useAuth();
  const { profile: myProfile } = useMyProfile();
  const { ids: followingIds, state: followState } = useFollowing();
  const followingProfiles = useProfiles(Array.from(followingIds));

  if (auth.status === 'disabled') {
    return <Blocked t={t} text="sign-in disabled · supabase not configured." />;
  }
  if (auth.status === 'init') {
    return <Blocked t={t} text="connecting…" />;
  }
  if (!myProfile) {
    return (
      <Blocked
        t={t}
        text="claim a handle first · you need one to follow others."
        cta={{ href: '/profile', label: 'open profile →' }}
      />
    );
  }

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 14,
        }}>§ the circle</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 44, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1.2,
        }}>
          <span style={{ fontStyle: 'italic', color: t.signal }}>
            {followingIds.length.toString().padStart(3, '0')}
          </span>{' '}
          {followingIds.length === 1 ? 'witness' : 'witnesses'}
        </div>
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
          color: t.creamDim, marginTop: 10,
        }}>people whose public entries feed your circle.</div>
      </div>

      <div style={{ padding: '24px 20px 12px' }}>
        <Eyebrow num="00" label="find someone" t={t} style={{ marginBottom: 10 }} />
        <SearchBlock t={t} excludeIds={new Set([myProfile.id, ...followingIds])} />
      </div>

      <SuggestionsBlock t={t} followingIds={followingIds} />

      <div style={{ padding: '24px 20px 40px' }}>
        <Eyebrow num="02" label="following" t={t} style={{ marginBottom: 14 }} />
        {followState !== 'loaded' ? (
          <div style={{
            padding: '12px 0', fontFamily: LumiereType.body, fontStyle: 'italic',
            fontSize: 15, color: t.creamDim,
          }}>loading…</div>
        ) : followingIds.length === 0 ? (
          <div style={{
            padding: '12px 0', fontFamily: LumiereType.body, fontStyle: 'italic',
            fontSize: 15, color: t.creamDim,
          }}>nobody yet. find someone above.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from(followingIds).map(id => {
              const p = followingProfiles[id];
              return <FollowRow key={id} id={id} profile={p} t={t} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchBlock({
  t, excludeIds,
}: {
  t: ReturnType<typeof useTweaks>['theme'];
  excludeIds: Set<string>;
}) {
  const [q, setQ] = React.useState('');
  const [result, setResult] = React.useState<{ term: string; profiles: Profile[] } | null>(null);

  const term = q.trim();

  React.useEffect(() => {
    if (!term) return;
    let cancel = false;
    const handle = setTimeout(() => {
      void searchProfiles(term).then(rs => {
        if (cancel) return;
        setResult({ term, profiles: rs });
      });
    }, 220);
    return () => { cancel = true; clearTimeout(handle); };
  }, [term]);

  const state: 'idle' | 'searching' | 'done' =
    !term ? 'idle' : result?.term === term ? 'done' : 'searching';
  const results = state === 'done' && result ? result.profiles : [];
  const filtered = results.filter(p => !excludeIds.has(p.id));

  return (
    <div>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="@handle"
        autoCapitalize="off"
        autoCorrect="off"
        style={{
          width: '100%', padding: '12px 14px',
          background: t.surface, color: t.cream,
          border: `1px solid ${t.line}`, outline: 'none',
          fontFamily: LumiereType.mono, fontSize: 12, letterSpacing: 0.5,
        }}
      />
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {state === 'searching' && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
            color: t.muted,
          }}>searching…</div>
        )}
        {state === 'done' && filtered.length === 0 && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
            color: t.muted,
          }}>no one matches.</div>
        )}
        {filtered.map(p => <FollowRow key={p.id} id={p.id} profile={p} t={t} />)}
      </div>
    </div>
  );
}

function FollowRow({
  id, profile, t,
}: {
  id: string;
  profile?: Profile;
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const { ids } = useFollowing();
  const isFollowing = ids.includes(id);
  const [busy, setBusy] = React.useState(false);
  const avatar = profile
    ? avatarFor(profile.id, profile.handle, profile.avatarUrl)
    : avatarFor(id);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    if (isFollowing) await unfollow(id);
    else await follow(id);
    setBusy(false);
  };

  const inner = (
    <>
      <Avatar friend={avatar} size={40} t={t} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 11, letterSpacing: 1.6,
          color: t.cream,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>@{profile?.handle ?? '…'}</div>
        {profile?.name && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 13,
            color: t.creamDim, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{profile.name}</div>
        )}
      </div>
      <button onClick={toggle} disabled={busy} style={{
        padding: '8px 12px', cursor: busy ? 'default' : 'pointer',
        background: isFollowing ? 'transparent' : t.cream,
        color: isFollowing ? t.creamDim : t.bg,
        border: `1px solid ${isFollowing ? t.line : t.cream}`,
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', opacity: busy ? 0.6 : 1,
      }}>{isFollowing ? 'unfollow' : 'follow'}</button>
    </>
  );

  if (profile?.handle) {
    return (
      <Link href={`/u/${encodeURIComponent(profile.handle)}`} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', border: `1px solid ${t.line}`, background: t.surface,
        textDecoration: 'none', color: 'inherit',
      }}>{inner}</Link>
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', border: `1px solid ${t.line}`, background: t.surface,
    }}>{inner}</div>
  );
}

function Blocked({
  t, text, cta,
}: {
  t: ReturnType<typeof useTweaks>['theme'];
  text: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 17,
        color: t.creamDim, marginBottom: cta ? 20 : 0,
      }}>{text}</div>
      {cta && (
        <Link href={cta.href} style={{
          display: 'inline-block', padding: '12px 18px',
          border: `1px solid ${t.cream}`, color: t.cream, textDecoration: 'none',
          fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase',
        }}>{cta.label}</Link>
      )}
    </div>
  );
}

function SuggestionsBlock({
  t, followingIds,
}: {
  t: ReturnType<typeof useTweaks>['theme'];
  followingIds: readonly string[];
}) {
  const [list, setList] = React.useState<SuggestedProfile[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;
    void fetchSuggestedProfiles(12).then(rs => { if (!cancel) setList(rs); });
    return () => { cancel = true; };
  }, []);

  // people you just followed drop out without a refetch
  const shown = (list ?? []).filter(p => !followingIds.includes(p.id));
  if (list === null || shown.length === 0) return null;

  const onFollow = async (id: string) => {
    setBusy(id);
    await follow(id);
    setBusy(null);
  };

  return (
    <div style={{ padding: '24px 20px 12px' }}>
      <Eyebrow num="01" label="suggested for you" t={t} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.map(p => {
          const why = [
            p.shared > 0 ? `${p.shared} film${p.shared === 1 ? '' : 's'} in common` : null,
            p.followers > 0 ? `${p.followers} follower${p.followers === 1 ? '' : 's'}` : null,
          ].filter(Boolean).join(' · ') || 'new here';
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', border: `1px solid ${t.line}`, background: t.surface,
            }}>
              <Link href={`/u/${encodeURIComponent(p.handle)}`} style={{
                display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0,
                textDecoration: 'none', color: 'inherit',
              }}>
                <Avatar friend={avatarFor(p.id, p.handle, p.avatarUrl)} size={40} t={t} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: LumiereType.mono, fontSize: 12, letterSpacing: 1.2, color: t.cream,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>@{p.handle}</div>
                  <div style={{
                    fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 13, color: t.creamDim, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name ? `${p.name} · ${why}` : why}</div>
                </div>
              </Link>
              <button onClick={() => void onFollow(p.id)} disabled={busy === p.id} style={{
                flexShrink: 0, padding: '7px 12px', cursor: busy === p.id ? 'default' : 'pointer',
                background: t.cream, color: t.bg, border: 'none', opacity: busy === p.id ? 0.6 : 1,
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase',
              }}>{busy === p.id ? '…' : 'follow'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
