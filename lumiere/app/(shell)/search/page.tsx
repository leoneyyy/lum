'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { searchFilms, searchPeople } from '@/app/components/lib/api';
import { searchProfiles } from '@/app/components/lib/profileStore';
import { Poster } from '@/app/components/ui/Poster';
import { Avatar, avatarFor, Eyebrow } from '@/app/components/ui/Primitives';
import type { Film, Profile } from '@/app/components/lib/types';
import type { Person } from '@/app/components/lib/tmdb';

type Mode = 'all' | 'film' | 'series' | 'people' | 'friends';
const MODES: { id: Mode; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'film', label: 'films' },
  { id: 'series', label: 'series' },
  { id: 'people', label: 'people' },
  { id: 'friends', label: 'friends' },
];

export default function SearchPage() {
  const { theme: t } = useTweaks();
  const [q, setQ] = React.useState('');
  const [mode, setMode] = React.useState<Mode>('all');
  const [films, setFilms] = React.useState<Film[]>([]);
  const [people, setPeople] = React.useState<Person[]>([]);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const term = q.trim();
    if (!term) { setFilms([]); setPeople([]); setProfiles([]); return; }
    let cancelled = false;
    const id = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      setErr(null);
      try {
        const needFilms = mode === 'all' || mode === 'film' || mode === 'series';
        const needPeople = mode === 'all' || mode === 'people';
        const needProfiles = mode === 'all' || mode === 'friends';
        const [f, p, pr] = await Promise.all([
          needFilms ? searchFilms(term) : Promise.resolve([] as Film[]),
          needPeople ? searchPeople(term) : Promise.resolve([] as Person[]),
          needProfiles ? searchProfiles(term.replace(/^@/, '')) : Promise.resolve([] as Profile[]),
        ]);
        if (cancelled) return;
        setFilms(f);
        setPeople(p);
        setProfiles(pr);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [q, mode]);

  const filteredFilms = React.useMemo(() => {
    if (mode === 'film') return films.filter(f => f.kind === 'film');
    if (mode === 'series') return films.filter(f => f.kind === 'series');
    if (mode === 'all') return films;
    return [];
  }, [films, mode]);

  const showPeople = mode === 'all' || mode === 'people';
  const showProfiles = mode === 'all' || mode === 'friends';
  const totalCount = filteredFilms.length
    + (showPeople ? people.length : 0)
    + (showProfiles ? profiles.length : 0);

  return (
    <div>
      <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>§ find</div>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={mode === 'friends' ? '@handle…' : 'title, actor, director, @friend…'}
          style={{
            width: '100%', padding: '10px 0', border: 'none', outline: 'none',
            borderBottom: `1px solid ${t.line}`, background: 'transparent',
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 22,
            color: t.cream,
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {MODES.map(m => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  padding: '5px 12px', cursor: 'pointer',
                  background: active ? t.cream : 'transparent',
                  color: active ? t.bg : t.creamDim,
                  border: `1px solid ${active ? t.cream : t.line}`,
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >{m.label}</button>
            );
          })}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 10,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
          textTransform: 'uppercase', color: t.muted,
        }}>
          <span>{loading ? 'searching…' : err ? `error · ${err}` : q.trim() ? `${totalCount} result${totalCount === 1 ? '' : 's'}` : 'awaiting input'}</span>
          <span>archive · tmdb</span>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {!q.trim() && <EmptyHint t={t} />}

        {q.trim() && !loading && !err && totalCount === 0 && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
            color: t.creamDim, padding: '20px 0',
          }}>nothing found. try a different angle.</div>
        )}

        {showProfiles && profiles.length > 0 && (
          <>
            <Eyebrow num="◉" label="friends on lumière" t={t} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 26 }}>
              {profiles.map(p => <ProfileRow key={p.id} profile={p} t={t} />)}
            </div>
          </>
        )}

        {showPeople && people.length > 0 && (
          <>
            <Eyebrow num="◐" label="people" t={t} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 26 }}>
              {people.map(p => <PersonRow key={p.id} person={p} t={t} />)}
            </div>
          </>
        )}

        {filteredFilms.length > 0 && (
          <>
            <Eyebrow num="◑" label={mode === 'series' ? 'series' : mode === 'film' ? 'films' : 'titles'} t={t} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredFilms.map(f => <FilmRow key={f.id} film={f} t={t} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyHint({ t }: { t: Theme }) {
  const hints = ['citizen kane', 'wong kar-wai', 'tilda swinton', 'in the mood for love'];
  const card: React.CSSProperties = {
    flex: 1, padding: '14px', border: `1px solid ${t.line}`, background: t.surface,
    textDecoration: 'none', color: 'inherit',
  };
  return (
    <div>
      <Eyebrow num="◎" label="explore" t={t} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 26 }}>
        <Link href="/charts" style={card}>
          <div style={{ fontFamily: LumiereType.display, fontSize: 20, color: t.cream, letterSpacing: -0.4 }}>the top 500</div>
          <div style={{ fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4, textTransform: 'uppercase', color: t.muted, marginTop: 6 }}>charts by everyone →</div>
        </Link>
        <Link href="/friends" style={card}>
          <div style={{ fontFamily: LumiereType.display, fontSize: 20, color: t.cream, letterSpacing: -0.4 }}>people to follow</div>
          <div style={{ fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4, textTransform: 'uppercase', color: t.muted, marginTop: 6 }}>suggested for you →</div>
        </Link>
      </div>
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

function FilmRow({ film, t }: { film: Film; t: Theme }) {
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

function PersonRow({ person, t }: { person: Person; t: Theme }) {
  return (
    <Link
      href={`/people/${encodeURIComponent(person.id)}`}
      style={{
        display: 'flex', gap: 14, alignItems: 'center', textDecoration: 'none',
        color: 'inherit', borderBottom: `1px solid ${t.lineSoft}`, paddingBottom: 14,
      }}
    >
      {person.profileUrl ? (
        <img src={person.profileUrl} alt="" style={{
          width: 56, height: 56, borderRadius: '50%', objectFit: 'cover',
          flexShrink: 0,
        }} />
      ) : (
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: t.surfaceHi,
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: LumiereType.mono, fontSize: 12, color: t.muted,
        }}>{person.name.slice(0, 2).toUpperCase()}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 20, lineHeight: 1.05,
          color: t.cream, letterSpacing: -0.4,
        }}>{person.name}</div>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
          textTransform: 'uppercase', color: t.muted, marginTop: 4,
        }}>
          {person.knownForDept || 'person'}
          {person.knownFor.length > 0 && ` · known for: ${person.knownFor.slice(0, 3).map(k => k.title).join(' · ')}`}
        </div>
      </div>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 14, color: t.creamDim,
        marginLeft: 8,
      }}>›</div>
    </Link>
  );
}

function ProfileRow({ profile, t }: { profile: Profile; t: Theme }) {
  const avatar = avatarFor(profile.id, profile.handle, profile.avatarUrl);
  return (
    <Link
      href={`/u/${encodeURIComponent(profile.handle)}`}
      style={{
        display: 'flex', gap: 12, alignItems: 'center',
        padding: '8px 0', borderBottom: `1px solid ${t.lineSoft}`,
        textDecoration: 'none', color: 'inherit',
      }}
    >
      <Avatar friend={avatar} size={44} t={t} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 12, letterSpacing: 1.2,
          color: t.cream,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>@{profile.handle}</div>
        {profile.name && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
            color: t.creamDim, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{profile.name}</div>
        )}
      </div>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 14, color: t.creamDim,
        marginLeft: 8,
      }}>›</div>
    </Link>
  );
}
