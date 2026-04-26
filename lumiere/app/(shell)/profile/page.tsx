'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { useMyProfile, saveMyProfile } from '@/app/components/lib/profileStore';
import { usePublicEntriesByUser } from '@/app/components/lib/feedStore';
import { useFilmsForEntries, useFilmsByIds } from '@/app/components/lib/useFilms';
import { useFilmOverrides, applyOverride } from '@/app/components/lib/filmOverrides';
import { useReactions, toggleReaction } from '@/app/components/lib/reactionStore';
import type { Film, LogEntry } from '@/app/components/lib/types';
import { Avatar, avatarFor, Eyebrow, ReactionButton } from '@/app/components/ui/Primitives';
import { TopPicksGrid } from '@/app/components/ui/TopPicks';
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
  const pickIds = React.useMemo(
    () => [...(profile?.topFilms ?? []), ...(profile?.topSeries ?? [])],
    [profile?.topFilms, profile?.topSeries],
  );
  const pickFilms = useFilmsByIds(pickIds);
  const overrides = useFilmOverrides();
  const films = React.useMemo<Record<string, Film>>(() => {
    const out: Record<string, Film> = {};
    for (const [id, f] of Object.entries(pickFilms)) {
      out[id] = overrides[id] ? applyOverride(f, overrides[id]) : f;
    }
    for (const [id, f] of Object.entries(rawFilms)) {
      out[id] = overrides[id] ? applyOverride(f, overrides[id]) : f;
    }
    return out;
  }, [rawFilms, overrides, pickFilms]);

  const headerRow = (
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
        {headerRow}
        <Center t={t} text="connecting…" />
      </div>
    );
  }

  if (auth.status === 'disabled') {
    return (
      <div style={{ padding: '20px' }}>
        {headerRow}
        <EmptyClaim t={t} text="local mode · sync is off. you can still log films, but there's no public profile to claim." />
      </div>
    );
  }

  if (auth.status === 'error') {
    return (
      <div style={{ padding: '20px' }}>
        {headerRow}
        <EmptyClaim t={t} text={`auth error · ${auth.error ?? 'unknown'}. open the workshop to retry.`} />
      </div>
    );
  }

  if (!profile) {
    if (state !== 'loaded' && state !== 'missing') {
      return (
        <div style={{ padding: '20px' }}>
          {headerRow}
          <Center t={t} text="loading profile…" />
        </div>
      );
    }
    return (
      <div style={{ padding: '20px' }}>
        {headerRow}
        <OnboardingCard t={t} isAnon={auth.status === 'anon'} />
      </div>
    );
  }

  const avatar = avatarFor(profile.id, profile.handle, profile.avatarUrl);

  const heroBackdrop = (() => {
    for (const id of [...profile.topFilms, ...profile.topSeries]) {
      const f = films[id];
      if (f?.backdropUrl) return f.backdropUrl;
    }
    return null;
  })();

  return (
    <div>
      {heroBackdrop && (
        <div style={{
          position: 'relative', height: 220, overflow: 'hidden',
          borderBottom: `1px solid ${t.line}`,
        }}>
          <img src={heroBackdrop} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'brightness(0.5) saturate(0.85)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, transparent 30%, ${t.bg})`,
          }} />
          <div style={{
            position: 'absolute', top: 14, right: 18,
          }}>
            <SettingsLink t={t} dark />
          </div>
        </div>
      )}

      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        {!heroBackdrop && headerRow}

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

      {(profile.topFilms.length > 0 || profile.topSeries.length > 0) && (
        <div style={{ padding: '20px', borderBottom: `1px solid ${t.line}` }}>
          <Eyebrow num="◆" label="canon" t={t} style={{ marginBottom: 14 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {profile.topFilms.length > 0 && (
              <TopPicksGrid picks={profile.topFilms} films={films} t={t} label="top films" />
            )}
            {profile.topSeries.length > 0 && (
              <TopPicksGrid picks={profile.topSeries} films={films} t={t} label="top series" />
            )}
          </div>
        </div>
      )}

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

function SettingsLink({ t, dark }: { t: Theme; dark?: boolean }) {
  const color = dark ? t.cream : t.creamDim;
  const bg = dark ? 'rgba(0,0,0,0.45)' : 'transparent';
  return (
    <Link href="/profile/settings" aria-label="settings" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 36, height: 36, border: `1px solid ${t.line}`,
      color, background: bg, textDecoration: 'none',
    }}>
      <GearIcon c={color} />
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

function OnboardingCard({ t, isAnon }: { t: Theme; isAnon: boolean }) {
  const [handle, setHandle] = React.useState('');
  const [name, setName] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const claim = async () => {
    setSaving(true);
    setMsg(null);
    const err = await saveMyProfile({ handle, name, bio });
    setSaving(false);
    if (err) setMsg(err);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        fontFamily: LumiereType.display, fontSize: 36, lineHeight: 0.95,
        color: t.cream, letterSpacing: -1, marginTop: 8,
      }}>claim a<br/><span style={{ fontStyle: 'italic', color: t.signal }}>handle</span></div>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
        color: t.creamDim, lineHeight: 1.45,
      }}>name yourself so others can find you. you can change it later.</div>

      <div style={{
        border: `1px solid ${t.line}`, padding: 14, background: t.surface,
        display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4,
      }}>
        <OnboardField label="handle" t={t}>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="yourname"
            autoCapitalize="off"
            autoCorrect="off"
            style={onboardInputStyle(t)}
          />
        </OnboardField>
        <OnboardField label="name (optional)" t={t}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="display name"
            style={onboardInputStyle(t)}
          />
        </OnboardField>
        <OnboardField label="bio (optional)" t={t}>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="one line about you"
            rows={2}
            style={{ ...onboardInputStyle(t), resize: 'vertical' }}
          />
        </OnboardField>
        {msg && (
          <div style={{
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
            textTransform: 'uppercase', color: t.danger,
          }}>{msg}</div>
        )}
        <button onClick={claim} disabled={saving || !handle.trim()} style={{
          padding: '12px 0', background: t.cream, color: t.bg,
          border: 'none', cursor: saving ? 'default' : 'pointer',
          opacity: saving || !handle.trim() ? 0.6 : 1,
          fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase', marginTop: 4,
        }}>{saving ? 'claiming…' : 'claim handle'}</button>
      </div>

      {isAnon && (
        <Link href="/profile/settings" style={{
          padding: '12px 14px', border: `1px dashed ${t.line}`,
          textDecoration: 'none', color: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
              textTransform: 'uppercase', color: t.muted, marginBottom: 4,
            }}>tip</div>
            <div style={{
              fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
              color: t.creamDim,
            }}>attach an email so this account survives a browser wipe.</div>
          </div>
          <div style={{
            fontFamily: LumiereType.mono, fontSize: 18, color: t.creamDim,
            marginLeft: 12,
          }}>→</div>
        </Link>
      )}
    </div>
  );
}

function OnboardField({ label, t, children }: {
  label: string; t: Theme; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted, marginBottom: 4,
      }}>{label}</div>
      {children}
    </div>
  );
}

function onboardInputStyle(t: Theme): React.CSSProperties {
  return {
    width: '100%', padding: 10,
    background: t.bg, color: t.cream,
    border: `1px solid ${t.line}`, outline: 'none',
    fontFamily: LumiereType.mono, fontSize: 12, letterSpacing: 0.5,
  };
}
