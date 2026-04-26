'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { useMyProfile } from '@/app/components/lib/profileStore';
import { usePublicEntriesByUser } from '@/app/components/lib/feedStore';
import { useFilmsForEntries } from '@/app/components/lib/useFilms';
import { useFilmOverrides, applyOverride } from '@/app/components/lib/filmOverrides';
import { useReactions, toggleReaction } from '@/app/components/lib/reactionStore';
import type { Film, LogEntry } from '@/app/components/lib/types';
import { Avatar, avatarFor, Eyebrow, ReactionButton } from '@/app/components/ui/Primitives';
import { CryMeter } from '@/app/components/ui/CryMeter';
import { Poster } from '@/app/components/ui/Poster';

export default function ProfilePage() {
  const { theme: t, tweaks } = useTweaks();
  const auth = useAuth();
  const { profile, state } = useMyProfile();

  const userId = profile?.id ?? '';
  const feed = usePublicEntriesByUser(userId, 40);
  const reactions = useReactions(feed.entries.map(e => e.id));
  const rawFilms = useFilmsForEntries(feed.entries);
  const overrides = useFilmOverrides();
  const films = React.useMemo<Record<string, Film>>(() => {
    const out: Record<string, Film> = {};
    for (const [id, f] of Object.entries(rawFilms)) {
      out[id] = overrides[id] ? applyOverride(f, overrides[id]) : f;
    }
    return out;
  }, [rawFilms, overrides]);

  const showHeaderRow = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 16,
    }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
        textTransform: 'uppercase', color: t.muted,
      }}>§ self</div>
      <SettingsLink t={t} />
    </div>
  );

  if (auth.status === 'init') {
    return (
      <div style={{ padding: '20px' }}>
        {showHeaderRow}
        <Center t={t} text="connecting…" />
      </div>
    );
  }

  if (auth.status === 'disabled' || auth.status === 'error') {
    return (
      <div style={{ padding: '20px' }}>
        {showHeaderRow}
        <EmptyClaim t={t} text="set up an identity in the workshop." />
      </div>
    );
  }

  if (!profile) {
    if (state !== 'loaded' && state !== 'missing') {
      return (
        <div style={{ padding: '20px' }}>
          {showHeaderRow}
          <Center t={t} text="loading profile…" />
        </div>
      );
    }
    return (
      <div style={{ padding: '20px' }}>
        {showHeaderRow}
        <EmptyClaim t={t} text="you haven't claimed a handle yet." />
      </div>
    );
  }

  const avatar = avatarFor(profile.id, profile.handle);

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
            textTransform: 'uppercase', color: t.muted,
          }}>§ self</div>
          <SettingsLink t={t} />
        </div>

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

        <div style={{
          marginTop: 16, padding: '10px 12px', border: `1px dashed ${t.line}`,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
          textTransform: 'uppercase', color: t.muted, textAlign: 'center',
        }}>this is your public page</div>
      </div>

      <div style={{ padding: '20px' }}>
        <Eyebrow num="§" label="your public log" t={t} style={{ marginBottom: 16 }} />
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
            text='no public entries yet. toggle entries to "followers" when logging.'
          />
        )}
        {feed.entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {feed.entries.map(e => (
              <PublicEntryCard
                key={e.id}
                entry={e}
                film={films[e.filmId] || null}
                reaction={reactions[e.id] ?? { count: 0, mine: false }}
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

function SettingsLink({ t }: { t: Theme }) {
  return (
    <Link href="/profile/settings" aria-label="settings" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 36, height: 36, border: `1px solid ${t.line}`,
      color: t.creamDim, textDecoration: 'none',
    }}>
      <GearIcon c={t.creamDim} />
    </Link>
  );
}

function GearIcon({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="2.2" stroke={c} fill="none" strokeWidth="1" />
      <g stroke={c} strokeWidth="1" strokeLinecap="square">
        <line x1="8" y1="1.5" x2="8" y2="3.5" />
        <line x1="8" y1="12.5" x2="8" y2="14.5" />
        <line x1="1.5" y1="8" x2="3.5" y2="8" />
        <line x1="12.5" y1="8" x2="14.5" y2="8" />
        <line x1="3.4" y1="3.4" x2="4.8" y2="4.8" />
        <line x1="11.2" y1="11.2" x2="12.6" y2="12.6" />
        <line x1="12.6" y1="3.4" x2="11.2" y2="4.8" />
        <line x1="4.8" y1="11.2" x2="3.4" y2="12.6" />
      </g>
    </svg>
  );
}

function EmptyClaim({ t, text }: { t: Theme; text: string }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center',
      border: `1px dashed ${t.line}`,
    }}>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 16,
        color: t.creamDim, lineHeight: 1.45, marginBottom: 16,
      }}>{text}</div>
      <Link href="/profile/settings" style={{
        display: 'inline-block', padding: '10px 18px',
        background: t.cream, color: t.bg, textDecoration: 'none',
        fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
        textTransform: 'uppercase',
      }}>open workshop →</Link>
    </div>
  );
}

function PublicEntryCard({
  entry, film, reaction, t, cryStyle,
}: {
  entry: LogEntry;
  film: Film | null;
  reaction: { count: number; mine: boolean };
  t: Theme;
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
        <div style={{ marginTop: 10 }}>
          <ReactionButton
            count={reaction.count}
            mine={reaction.mine}
            t={t}
            onToggle={() => void toggleReaction(entry.id)}
          />
        </div>
      </div>
    </article>
  );
}

function Center({
  t, text, tight,
}: {
  t: Theme;
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
