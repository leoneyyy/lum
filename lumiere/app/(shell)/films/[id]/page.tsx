'use client';
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType, DEFAULT_DIMS, LumiereVoice } from '@/app/components/lib/tokens';
import type { DimKey } from '@/app/components/lib/tokens';
import { getFilm, getSeriesEpisodes } from '@/app/components/lib/api';
import type { SeasonSummary, EpisodeSummary } from '@/app/components/lib/tmdb';
import type { Film, LogEntry, Profile, RatingMap, Visibility } from '@/app/components/lib/types';
import { Poster } from '@/app/components/ui/Poster';
import { CryMeter } from '@/app/components/ui/CryMeter';
import { RatingRow, Eyebrow, Avatar, avatarFor, ReactionButton } from '@/app/components/ui/Primitives';
import { saveEntry, useFilmEntries, deleteEntry, updateEntry } from '@/app/components/lib/logStore';
import {
  useFilmOverride, setFilmOverride, applyOverride,
} from '@/app/components/lib/filmOverrides';
import type { FilmOverride } from '@/app/components/lib/filmOverrides';
import { ImagePicker } from '@/app/components/ui/ImagePicker';
import { useCircleEntriesForFilm } from '@/app/components/lib/feedStore';
import { useProfiles } from '@/app/components/lib/profileStore';
import { useFollowing } from '@/app/components/lib/followStore';
import { useReactions, toggleReaction } from '@/app/components/lib/reactionStore';

export default function FilmDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);
  const { theme: t, tweaks } = useTweaks();
  const [loaded, setLoaded] = React.useState<{ id: string; film: Film | null; err: string | null } | null>(null);
  const entries = useFilmEntries(id);

  React.useEffect(() => {
    let cancel = false;
    getFilm(id)
      .then(f => { if (!cancel) setLoaded({ id, film: f, err: f ? null : 'not found' }); })
      .catch(e => { if (!cancel) setLoaded({ id, film: null, err: e instanceof Error ? e.message : 'load failed' }); });
    return () => { cancel = true; };
  }, [id]);

  const loading = loaded?.id !== id;
  const rawFilm = loading ? null : loaded?.film ?? null;
  const err = loading ? null : loaded?.err ?? null;

  const override = useFilmOverride(id);
  const film = rawFilm ? applyOverride(rawFilm, override) : null;
  const defaults = React.useMemo<FilmOverride>(() => ({
    posterUrl: rawFilm?.posterUrl ?? undefined,
    backdropUrl: rawFilm?.backdropUrl ?? undefined,
  }), [rawFilm?.posterUrl, rawFilm?.backdropUrl]);

  const [picker, setPicker] = React.useState<null | 'poster' | 'backdrop'>(null);
  type FormMode = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; entryId: string };
  const [mode, setMode] = React.useState<FormMode>({ kind: 'closed' });
  const [cry, setCry] = React.useState(0);
  const [ratings, setRatings] = React.useState<RatingMap>({});
  const [note, setNote] = React.useState('');
  const [visibility, setVisibility] = React.useState<Visibility>('private');

  const searchParams = useSearchParams();
  const editParam = searchParams?.get('edit') ?? null;
  const consumedEditRef = React.useRef<string | null>(null);

  const activeDims = React.useMemo(
    () => DEFAULT_DIMS.filter(d => tweaks.dims.includes(d.key as DimKey)),
    [tweaks.dims],
  );

  const startNew = () => {
    setMode({ kind: 'new' });
    setCry(0); setRatings({}); setNote(''); setVisibility('private');
  };
  const startEdit = (entryId: string) => {
    const target = entries.find(e => e.id === entryId);
    if (!target) return;
    setMode({ kind: 'edit', entryId });
    setCry(target.cry);
    setRatings(target.ratings);
    setNote(target.note ?? '');
    setVisibility(target.visibility);
  };
  const closeForm = () => {
    setMode({ kind: 'closed' });
    setCry(0); setRatings({}); setNote(''); setVisibility('private');
  };

  React.useEffect(() => {
    if (!editParam || consumedEditRef.current === editParam) return;
    const target = entries.find(e => e.id === editParam);
    if (!target) return;
    consumedEditRef.current = editParam;
    /* eslint-disable react-hooks/set-state-in-effect */
    setMode({ kind: 'edit', entryId: editParam });
    setCry(target.cry);
    setRatings(target.ratings);
    setNote(target.note ?? '');
    setVisibility(target.visibility);
    /* eslint-enable react-hooks/set-state-in-effect */
    router.replace(`/films/${encodeURIComponent(id)}`);
  }, [editParam, entries, router, id]);

  const submit = () => {
    if (!film) return;
    if (mode.kind === 'new') {
      saveEntry({ filmId: film.id, cry, ratings, note, visibility });
    } else if (mode.kind === 'edit') {
      updateEntry(mode.entryId, { cry, ratings, note, visibility });
    }
    closeForm();
  };

  if (loading) return <CenterNote t={t} text="loading…" />;
  if (err || !film) return <CenterNote t={t} text={err || 'not found'} />;

  return (
    <div>
      {film.backdropUrl && (
        <div style={{
          position: 'relative', height: 220, overflow: 'hidden',
          borderBottom: `1px solid ${t.line}`,
        }}>
          <img src={film.backdropUrl} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'brightness(0.55) saturate(0.85)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, transparent 40%, ${t.bg})`,
          }} />
          <button onClick={() => setPicker('backdrop')} style={{
            position: 'absolute', top: 12, right: 12,
            padding: '6px 10px', cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)', color: t.cream,
            border: `1px solid ${t.line}`,
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}>change backdrop</button>
        </div>
      )}
      {!film.backdropUrl && (
        <div style={{ padding: '14px 20px 0' }}>
          <button onClick={() => setPicker('backdrop')} style={{
            padding: '8px 12px', cursor: 'pointer', background: 'transparent',
            color: t.creamDim, border: `1px solid ${t.line}`,
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}>+ add backdrop</button>
        </div>
      )}

      <div style={{ padding: '20px 20px 12px' }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 14,
        }}>← back</button>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Poster film={film} size="md" t={t} />
            <button onClick={() => setPicker('poster')} style={{
              padding: '6px 0', cursor: 'pointer', background: 'transparent',
              color: t.creamDim, border: `1px solid ${t.line}`,
              fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
              textTransform: 'uppercase', textAlign: 'center',
            }}>change</button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: LumiereType.display, fontSize: 32, lineHeight: 1,
              color: t.cream, letterSpacing: -0.8, marginBottom: 10,
            }}>{film.title}</div>
            <MetaRow t={t} items={[
              film.year ? String(film.year) : null,
              film.dir ? `dir. ${film.dir}` : null,
              film.runtime ? `${film.runtime}m` : null,
              film.kind,
            ].filter(Boolean) as string[]} />
            {film.tags?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {film.tags.slice(0, 6).map(tag => (
                  <div key={tag} style={{
                    padding: '3px 8px', border: `1px solid ${t.line}`,
                    fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
                    textTransform: 'uppercase', color: t.creamDim,
                  }}>{tag}</div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {film.synopsis && (
          <div style={{
            fontFamily: LumiereType.body, fontSize: 16, lineHeight: 1.5,
            color: t.creamDim, fontStyle: 'italic', marginTop: 20,
          }}>{film.synopsis}</div>
        )}
      </div>

      <div style={{ padding: '8px 20px 20px' }}>
        {mode.kind === 'closed' ? (
          <button onClick={startNew} style={{
            display: 'block', width: '100%', padding: '16px 0',
            background: t.cream, color: t.bg, border: 'none', cursor: 'pointer',
            fontFamily: LumiereType.mono, fontSize: 11, letterSpacing: 3,
            textTransform: 'uppercase',
          }}>log this →</button>
        ) : (
          <div style={{
            border: `1px solid ${t.line}`, padding: 18, marginTop: 4,
            background: t.surface,
          }}>
            {mode.kind === 'edit' && (
              <div style={{
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                textTransform: 'uppercase', color: t.signal, marginBottom: 14,
              }}>§ editing entry</div>
            )}
            <Eyebrow num="◐" label="cry meter" t={t} style={{ marginBottom: 12 }} />
            <CryMeter
              value={cry}
              t={t}
              style={tweaks.cryStyle}
              large
              interactive
              onChange={setCry}
            />
            <div style={{ height: 18 }} />

            <Eyebrow num="◑" label="dimensions" t={t} style={{ marginBottom: 6 }} />
            <div>
              {activeDims.map(d => (
                <RatingRow
                  key={d.key}
                  label={d.label}
                  value={ratings[d.key as keyof RatingMap] || 0}
                  t={t}
                  interactive
                  onChange={v => setRatings(r => ({ ...r, [d.key]: v }))}
                />
              ))}
            </div>

            <div style={{ height: 12 }} />
            <Eyebrow num="◒" label="note" t={t} style={{ marginBottom: 8 }} />
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={LumiereVoice[tweaks.voice].greeting[0]}
              rows={3}
              style={{
                width: '100%', padding: 10, resize: 'vertical',
                border: `1px solid ${t.line}`, outline: 'none', background: t.bg,
                color: t.cream, fontFamily: LumiereType.body, fontStyle: 'italic',
                fontSize: 15, lineHeight: 1.4,
              }}
            />

            <div style={{ height: 14 }} />
            <Eyebrow num="◓" label="visibility" t={t} style={{ marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {(['private', 'public'] as Visibility[]).map(v => {
                const active = visibility === v;
                return (
                  <button key={v} onClick={() => setVisibility(v)} style={{
                    flex: 1, padding: '10px 0', cursor: 'pointer',
                    background: active ? t.cream : 'transparent',
                    color: active ? t.bg : t.creamDim,
                    border: `1px solid ${active ? t.cream : t.line}`,
                    fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                    textTransform: 'uppercase',
                  }}>{v === 'private' ? 'just me' : 'followers'}</button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={closeForm} style={{
                flex: 1, padding: '12px 0', background: 'transparent',
                border: `1px solid ${t.line}`, color: t.creamDim, cursor: 'pointer',
                fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase',
              }}>cancel</button>
              <button onClick={submit} style={{
                flex: 2, padding: '12px 0', background: t.cream, color: t.bg,
                border: 'none', cursor: 'pointer',
                fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase',
              }}>{mode.kind === 'edit' ? 'save changes' : 'commit entry'}</button>
            </div>
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div style={{ padding: '8px 20px 40px' }}>
          <Eyebrow num={String(entries.length).padStart(2, '0')} label="your log" t={t} style={{ marginBottom: 14 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {entries.map(e => (
              <div key={e.id} style={{
                borderLeft: `2px solid ${t.accent}`, paddingLeft: 12,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 6, gap: 10,
                }}>
                  <div style={{
                    flex: 1, minWidth: 0,
                    fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                    textTransform: 'uppercase', color: t.muted,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{new Date(e.createdAt).toLocaleDateString()} · cry {e.cry} · {e.visibility === 'public' ? 'public' : 'private'}</div>
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                    <button onClick={() => startEdit(e.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                      textTransform: 'uppercase', color: t.creamDim, padding: 0,
                    }}>edit</button>
                    <button onClick={() => deleteEntry(e.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                      textTransform: 'uppercase', color: t.muted, padding: 0,
                    }}>erase</button>
                  </div>
                </div>
                {e.note && (
                  <div style={{
                    fontFamily: LumiereType.body, fontStyle: 'italic',
                    fontSize: 15, color: t.cream, lineHeight: 1.4,
                  }}>{e.note}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {film.kind === 'series' && film.season == null && (
        <EpisodesSection seriesId={id} t={t} />
      )}

      <CircleForFilm filmId={id} t={t} />

      {picker && (
        <ImagePicker
          filmId={id}
          kind={picker}
          current={picker === 'poster' ? film.posterUrl : film.backdropUrl}
          defaultUrl={picker === 'poster' ? defaults.posterUrl : defaults.backdropUrl}
          t={t}
          onPick={url => {
            const key = picker === 'poster' ? 'posterUrl' : 'backdropUrl';
            if (url === null) setFilmOverride(id, { [key]: undefined });
            else setFilmOverride(id, { [key]: url });
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function MetaRow({ t, items }: { t: ReturnType<typeof useTweaks>['theme']; items: string[] }) {
  return (
    <div style={{
      fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
      textTransform: 'uppercase', color: t.muted,
    }}>{items.join(' · ')}</div>
  );
}

function EpisodesSection({
  seriesId, t,
}: {
  seriesId: string;
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  type Loaded = {
    seasons: SeasonSummary[];
    selected: number | null;
    episodes: Record<number, EpisodeSummary[]>;
  };
  const [data, setData] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loadingEpisodes, setLoadingEpisodes] = React.useState(false);

  React.useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const seasonsRes = await getSeriesEpisodes(seriesId);
        if (cancel) return;
        const seasons = seasonsRes.seasons.filter(s => s.episodeCount > 0);
        const first = seasons.find(s => s.number > 0) ?? seasons[0] ?? null;
        if (!first) {
          setData({ seasons, selected: null, episodes: {} });
          return;
        }
        const epRes = await getSeriesEpisodes(seriesId, first.number);
        if (cancel) return;
        setData({
          seasons,
          selected: first.number,
          episodes: epRes.episodes ? { [first.number]: epRes.episodes } : {},
        });
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : 'failed');
      }
    })();
    return () => { cancel = true; };
  }, [seriesId]);

  const selectSeason = (n: number) => {
    if (!data) return;
    if (data.episodes[n]) {
      setData({ ...data, selected: n });
      return;
    }
    setData({ ...data, selected: n });
    setLoadingEpisodes(true);
    void getSeriesEpisodes(seriesId, n)
      .then(res => {
        if (!res.episodes) return;
        setData(prev => prev && {
          ...prev,
          episodes: { ...prev.episodes, [n]: res.episodes! },
        });
      })
      .catch(e => setError(e instanceof Error ? e.message : 'failed'))
      .finally(() => setLoadingEpisodes(false));
  };

  if (error) return (
    <div style={{ padding: '20px', borderTop: `1px solid ${t.line}` }}>
      <Eyebrow num="◯" label="episodes" t={t} style={{ margin: '12px 0 14px' }} />
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
        color: t.danger,
      }}>error · {error}</div>
    </div>
  );

  if (!data) return (
    <div style={{ padding: '20px', borderTop: `1px solid ${t.line}` }}>
      <Eyebrow num="◯" label="episodes" t={t} style={{ margin: '12px 0 14px' }} />
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
        color: t.creamDim,
      }}>loading episodes…</div>
    </div>
  );

  if (data.seasons.length === 0) return null;

  const eps = data.selected != null ? data.episodes[data.selected] : null;

  return (
    <div style={{ padding: '20px', borderTop: `1px solid ${t.line}` }}>
      <Eyebrow
        num={String(data.seasons.length).padStart(2, '0')}
        label={data.seasons.length === 1 ? 'season' : 'seasons'}
        t={t}
        style={{ margin: '12px 0 14px' }}
      />
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8,
        marginBottom: 14, borderBottom: `1px solid ${t.lineSoft}`,
      }}>
        {data.seasons.map(s => {
          const active = data.selected === s.number;
          const label = s.number === 0 ? 'specials' : `s${String(s.number).padStart(2, '0')}`;
          return (
            <button key={s.number} onClick={() => selectSeason(s.number)} style={{
              padding: '8px 12px', cursor: 'pointer', flexShrink: 0,
              background: active ? t.cream : 'transparent',
              color: active ? t.bg : t.creamDim,
              border: `1px solid ${active ? t.cream : t.line}`,
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}>
              {label}
              <span style={{ opacity: 0.6, marginLeft: 6 }}>{s.episodeCount}</span>
            </button>
          );
        })}
      </div>

      {!eps ? (
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
          color: t.creamDim,
        }}>{loadingEpisodes ? 'loading episodes…' : 'pick a season.'}</div>
      ) : eps.length === 0 ? (
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
          color: t.creamDim,
        }}>no episodes listed.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {eps.map(ep => (
            <Link
              key={ep.number}
              href={`/films/${encodeURIComponent(`${seriesId}_s${data.selected}_e${ep.number}`)}`}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '8px 0', borderBottom: `1px solid ${t.lineSoft}`,
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <div style={{
                width: 60, height: 34, flexShrink: 0,
                background: ep.stillUrl ? `url(${ep.stillUrl}) center/cover` : t.surfaceHi,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                  textTransform: 'uppercase', color: t.muted, marginBottom: 2,
                }}>
                  e{String(ep.number).padStart(2, '0')}
                  {ep.runtime ? ` · ${ep.runtime}m` : ''}
                  {ep.airDate ? ` · ${ep.airDate.slice(0, 4)}` : ''}
                </div>
                <div style={{
                  fontFamily: LumiereType.display, fontSize: 16, lineHeight: 1.1,
                  color: t.cream, letterSpacing: -0.3,
                }}>{ep.name}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CircleForFilm({ filmId, t }: {
  filmId: string;
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const { ids: followingIds, state: followState } = useFollowing();
  const feed = useCircleEntriesForFilm(filmId, 10);
  const authors = useProfiles(feed.entries.map(e => e.userId));

  if (followState !== 'loaded' || followingIds.length === 0) return null;
  if (feed.state === 'loading') return null;
  if (feed.state === 'error') return null;

  return (
    <div style={{
      padding: '8px 20px 40px', borderTop: `1px solid ${t.line}`,
      marginTop: 8,
    }}>
      <Eyebrow
        num={String(feed.entries.length).padStart(2, '0')}
        label="your circle on this"
        t={t}
        style={{ margin: '24px 0 14px' }}
      />
      {feed.entries.length === 0 ? (
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
          color: t.creamDim,
        }}>no one in your circle has logged this yet.</div>
      ) : (
        <CircleEntriesList entries={feed.entries} authors={authors} t={t} />
      )}
    </div>
  );
}

function CircleEntriesList({
  entries, authors, t,
}: {
  entries: LogEntry[];
  authors: Record<string, Profile>;
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const reactions = useReactions(entries.map(e => e.id));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {entries.map(e => (
        <CircleEntry
          key={e.id}
          entry={e}
          author={authors[e.userId]}
          reaction={reactions[e.id] ?? { count: 0, mine: false }}
          t={t}
        />
      ))}
    </div>
  );
}

function CircleEntry({ entry, author, reaction, t }: {
  entry: LogEntry;
  author: Profile | undefined;
  reaction: { count: number; mine: boolean };
  t: ReturnType<typeof useTweaks>['theme'];
}) {
  const date = new Date(entry.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  }).toLowerCase();
  const avatar = author
    ? avatarFor(author.id, author.handle)
    : avatarFor(entry.userId);

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <Avatar friend={avatar} size={28} t={t} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
          color: t.cream,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>@{author?.handle ?? '…'}</div>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
          textTransform: 'uppercase', color: t.muted, marginTop: 2,
        }}>{date} · cry {entry.cry}</div>
      </div>
    </div>
  );

  return (
    <article style={{
      borderLeft: `2px solid ${t.accent}`, paddingLeft: 12,
    }}>
      {author?.handle ? (
        <Link href={`/u/${encodeURIComponent(author.handle)}`} style={{
          display: 'block', color: 'inherit', textDecoration: 'none',
        }}>{header}</Link>
      ) : header}
      {entry.note && (
        <blockquote style={{
          margin: 0, padding: 0,
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
          lineHeight: 1.4, color: t.cream,
        }}>{entry.note}</blockquote>
      )}
      <div style={{ marginTop: 8 }}>
        <ReactionButton
          count={reaction.count}
          mine={reaction.mine}
          t={t}
          onToggle={() => void toggleReaction(entry.id)}
        />
      </div>
    </article>
  );
}

function CenterNote({ t, text }: { t: ReturnType<typeof useTweaks>['theme']; text: string }) {
  return (
    <div style={{
      padding: '80px 20px', textAlign: 'center',
      fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 18,
      color: t.creamDim,
    }}>{text}</div>
  );
}
