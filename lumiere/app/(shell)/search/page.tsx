'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { searchFilms, searchPeople, getPersonCredits } from '@/app/components/lib/api';
import { Poster } from '@/app/components/ui/Poster';
import { Eyebrow } from '@/app/components/ui/Primitives';
import type { Film } from '@/app/components/lib/types';
import type { Person, PersonCredit } from '@/app/components/lib/tmdb';

type Mode = 'all' | 'film' | 'series' | 'people';
const MODES: { id: Mode; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'film', label: 'films' },
  { id: 'series', label: 'series' },
  { id: 'people', label: 'people' },
];

export default function SearchPage() {
  const { theme: t } = useTweaks();
  const [q, setQ] = React.useState('');
  const [mode, setMode] = React.useState<Mode>('all');
  const [films, setFilms] = React.useState<Film[]>([]);
  const [people, setPeople] = React.useState<Person[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const term = q.trim();
    if (!term) { setFilms([]); setPeople([]); return; }
    let cancelled = false;
    const id = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      setErr(null);
      try {
        const needFilms = mode !== 'people';
        const needPeople = mode === 'all' || mode === 'people';
        const [f, p] = await Promise.all([
          needFilms ? searchFilms(term) : Promise.resolve([] as Film[]),
          needPeople ? searchPeople(term) : Promise.resolve([] as Person[]),
        ]);
        if (cancelled) return;
        setFilms(f);
        setPeople(p);
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
  const totalCount = filteredFilms.length + (showPeople ? people.length : 0);

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
          placeholder="title, actor, director…"
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
  const [open, setOpen] = React.useState(false);
  const [credits, setCredits] = React.useState<PersonCredit[] | null>(null);
  const [loadingCredits, setLoadingCredits] = React.useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !credits) {
      setLoadingCredits(true);
      try {
        const out = await getPersonCredits(person.id);
        setCredits(out?.credits ?? []);
      } finally {
        setLoadingCredits(false);
      }
    }
  };

  return (
    <div style={{ borderBottom: `1px solid ${t.lineSoft}`, paddingBottom: 14 }}>
      <button
        onClick={toggle}
        style={{
          display: 'flex', gap: 14, alignItems: 'center', width: '100%',
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          color: 'inherit', textAlign: 'left',
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
          marginLeft: 8, transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s',
        }}>›</div>
      </button>

      {open && (
        <div style={{ marginTop: 14, marginLeft: 70 }}>
          {loadingCredits && (
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
              textTransform: 'uppercase', color: t.muted,
            }}>loading filmography…</div>
          )}
          {credits && credits.length === 0 && (
            <div style={{
              fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
              color: t.creamDim,
            }}>no credits found.</div>
          )}
          {credits && credits.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
              gap: 8,
            }}>
              {credits.slice(0, 30).map(c => (
                <Link
                  key={c.id}
                  href={`/films/${encodeURIComponent(c.id)}`}
                  style={{
                    display: 'block', textDecoration: 'none', color: 'inherit',
                  }}
                  title={`${c.title} (${c.year || '—'})${c.character ? ` · ${c.character}` : c.job ? ` · ${c.job}` : ''}`}
                >
                  {c.posterUrl ? (
                    <img src={c.posterUrl} alt="" style={{
                      width: '100%', aspectRatio: '2/3', objectFit: 'cover',
                      background: t.surfaceHi, display: 'block',
                    }} />
                  ) : (
                    <div style={{
                      width: '100%', aspectRatio: '2/3', background: t.surfaceHi,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: LumiereType.mono, fontSize: 9, color: t.muted,
                      padding: 4, textAlign: 'center', lineHeight: 1.2,
                    }}>{c.title.slice(0, 24)}</div>
                  )}
                  <div style={{
                    fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1,
                    color: t.muted, marginTop: 4, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{c.year || '—'}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
