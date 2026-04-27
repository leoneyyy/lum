// lib/tmdb.ts — server-side TMDB helpers. NEVER import from client components.
import type { Film } from './types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

function authHeaders() {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error('TMDB_READ_TOKEN not set');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function posterUrl(path: string | null | undefined, size: 'w342' | 'w500' | 'original' = 'w500') {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}

export function mapMovie(r: any): Film {
  return {
    id: `tmdb_m_${r.id}`,
    tmdbId: r.id,
    title: r.title || r.original_title,
    year: +(r.release_date || '').slice(0, 4) || 0,
    kind: 'film',
    posterUrl: posterUrl(r.poster_path),
    backdropUrl: posterUrl(r.backdrop_path, 'original'),
    synopsis: r.overview,
    runtime: r.runtime,
    poster: '#3a3a4a', // neutral fallback
    posterAccent: '#ebe6d8',
  };
}

export function mapTv(r: any): Film {
  return {
    id: `tmdb_t_${r.id}`,
    tmdbId: r.id,
    title: r.name || r.original_name,
    year: +(r.first_air_date || '').slice(0, 4) || 0,
    kind: 'series',
    posterUrl: posterUrl(r.poster_path),
    backdropUrl: posterUrl(r.backdrop_path, 'original'),
    synopsis: r.overview,
    poster: '#3a3a4a',
    posterAccent: '#ebe6d8',
  };
}

export async function searchMulti(query: string): Promise<Film[]> {
  if (!query) return [];
  const url = `${TMDB_BASE}/search/multi?query=${encodeURIComponent(query)}&include_adult=false`;
  const r = await fetch(url, { headers: authHeaders(), next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`TMDB search failed: ${r.status}`);
  const json = await r.json();
  return (json.results || [])
    .filter((x: any) => x.media_type === 'movie' || x.media_type === 'tv')
    .map((x: any) => x.media_type === 'tv' ? mapTv(x) : mapMovie(x));
}

export async function getMovie(id: number): Promise<Film> {
  const url = `${TMDB_BASE}/movie/${id}?append_to_response=credits`;
  const r = await fetch(url, { headers: authHeaders(), next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`TMDB movie ${id} failed: ${r.status}`);
  const j = await r.json();
  const film = mapMovie(j);
  film.runtime = j.runtime;
  const director = (j.credits?.crew || []).find((c: any) => c.job === 'Director');
  film.dir = director?.name;
  film.dirId = director?.id;
  film.tags = (j.genres || []).map((g: any) => g.name.toLowerCase());
  return film;
}

export interface ImageCatalog {
  posters: { url: string; thumb: string }[];
  backdrops: { url: string; thumb: string }[];
}

interface TmdbImage { file_path?: string }

export async function getFilmImages(id: string): Promise<ImageCatalog> {
  const mMovie = id.match(/^tmdb_m_(\d+)$/);
  const mEp = id.match(/^tmdb_t_(\d+)_s(\d+)_e(\d+)$/);
  const mSeason = id.match(/^tmdb_t_(\d+)_s(\d+)$/);
  const mTv = id.match(/^tmdb_t_(\d+)$/);
  let url: string;
  if (mMovie) {
    url = `${TMDB_BASE}/movie/${mMovie[1]}/images?include_image_language=en,null`;
  } else if (mEp) {
    url = `${TMDB_BASE}/tv/${mEp[1]}/season/${mEp[2]}/episode/${mEp[3]}/images`;
  } else if (mSeason) {
    url = `${TMDB_BASE}/tv/${mSeason[1]}/season/${mSeason[2]}/images?include_image_language=en,null`;
  } else if (mTv) {
    url = `${TMDB_BASE}/tv/${mTv[1]}/images?include_image_language=en,null`;
  } else {
    throw new Error('bad id');
  }
  const r = await fetch(url, { headers: authHeaders(), next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`TMDB images failed: ${r.status}`);
  const j = await r.json();
  const paths = (xs: TmdbImage[] | undefined) => (xs || []).map(x => x.file_path).filter(Boolean) as string[];
  const posterSrc = paths(j.posters).concat(paths(j.stills));
  const backdropSrc = paths(j.backdrops);
  return {
    posters: posterSrc.map(p => ({ url: `${IMG_BASE}/w500${p}`, thumb: `${IMG_BASE}/w185${p}` })),
    backdrops: backdropSrc.map(p => ({ url: `${IMG_BASE}/original${p}`, thumb: `${IMG_BASE}/w300${p}` })),
  };
}

export async function getSeries(tvId: number): Promise<Film> {
  const url = `${TMDB_BASE}/tv/${tvId}?append_to_response=credits`;
  const r = await fetch(url, { headers: authHeaders(), next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`TMDB series ${tvId} failed: ${r.status}`);
  const j = await r.json();
  const film = mapTv(j);
  const creator = (j.created_by || [])[0];
  film.dir = creator?.name;
  film.runtime = Array.isArray(j.episode_run_time) ? j.episode_run_time[0] : undefined;
  film.tags = (j.genres || []).map((g: any) => g.name.toLowerCase());
  return film;
}

export interface SeasonSummary {
  number: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterUrl: string | null;
  overview: string;
}

export interface EpisodeSummary {
  number: number;
  name: string;
  runtime: number | null;
  airDate: string | null;
  stillUrl: string | null;
  overview: string;
}

export async function getSeasons(tvId: number): Promise<SeasonSummary[]> {
  const url = `${TMDB_BASE}/tv/${tvId}`;
  const r = await fetch(url, { headers: authHeaders(), next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`TMDB seasons ${tvId} failed: ${r.status}`);
  const j = await r.json();
  return ((j.seasons || []) as Array<Record<string, unknown>>)
    .filter(s => Number(s.season_number) >= 0)
    .map((s): SeasonSummary => ({
      number: Number(s.season_number),
      name: String(s.name ?? `Season ${s.season_number}`),
      episodeCount: Number(s.episode_count ?? 0),
      airDate: (s.air_date as string | null) ?? null,
      posterUrl: posterUrl(s.poster_path as string | null | undefined),
      overview: String(s.overview ?? ''),
    }));
}

export async function getSeasonEpisodes(tvId: number, season: number): Promise<EpisodeSummary[]> {
  const url = `${TMDB_BASE}/tv/${tvId}/season/${season}`;
  const r = await fetch(url, { headers: authHeaders(), next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`TMDB season ${tvId}/${season} failed: ${r.status}`);
  const j = await r.json();
  return ((j.episodes || []) as Array<Record<string, unknown>>).map((e): EpisodeSummary => ({
    number: Number(e.episode_number),
    name: String(e.name ?? `Episode ${e.episode_number}`),
    runtime: typeof e.runtime === 'number' ? e.runtime : null,
    airDate: (e.air_date as string | null) ?? null,
    stillUrl: posterUrl(e.still_path as string | null | undefined, 'w500'),
    overview: String(e.overview ?? ''),
  }));
}

export async function getSeason(tvId: number, season: number): Promise<Film> {
  const tvUrl = `${TMDB_BASE}/tv/${tvId}`;
  const sUrl = `${TMDB_BASE}/tv/${tvId}/season/${season}`;
  const [tvR, sR] = await Promise.all([
    fetch(tvUrl, { headers: authHeaders(), next: { revalidate: 3600 } }),
    fetch(sUrl, { headers: authHeaders(), next: { revalidate: 3600 } }),
  ]);
  if (!tvR.ok || !sR.ok) throw new Error('TMDB season failed');
  const tv = await tvR.json();
  const s = await sR.json();
  return {
    id: `tmdb_t_${tvId}_s${season}`,
    tmdbId: tvId,
    title: tv.name,
    year: +(s.air_date || tv.first_air_date || '').slice(0, 4) || 0,
    kind: 'series',
    season,
    epTitle: s.name || `Season ${season}`,
    posterUrl: s.poster_path
      ? `${IMG_BASE}/w500${s.poster_path}`
      : posterUrl(tv.poster_path),
    backdropUrl: posterUrl(tv.backdrop_path, 'original'),
    synopsis: s.overview || tv.overview,
    tags: (tv.genres || []).map((g: any) => g.name.toLowerCase()),
    poster: '#3a3a4a',
    posterAccent: '#ebe6d8',
  };
}

export async function getEpisode(tvId: number, season: number, episode: number): Promise<Film> {
  const tvUrl = `${TMDB_BASE}/tv/${tvId}`;
  const epUrl = `${TMDB_BASE}/tv/${tvId}/season/${season}/episode/${episode}`;
  const [tvR, epR] = await Promise.all([
    fetch(tvUrl, { headers: authHeaders(), next: { revalidate: 3600 } }),
    fetch(epUrl, { headers: authHeaders(), next: { revalidate: 3600 } }),
  ]);
  if (!tvR.ok || !epR.ok) throw new Error('TMDB episode failed');
  const tv = await tvR.json();
  const ep = await epR.json();
  return {
    id: `tmdb_t_${tvId}_s${season}_e${episode}`,
    tmdbId: tvId,
    title: tv.name,
    year: +(tv.first_air_date || '').slice(0, 4) || 0,
    kind: 'series',
    season, episode,
    epTitle: ep.name,
    runtime: ep.runtime,
    posterUrl: ep.still_path ? `${IMG_BASE}/w500${ep.still_path}` : posterUrl(tv.poster_path),
    synopsis: ep.overview || tv.overview,
    tags: (tv.genres || []).map((g: any) => g.name.toLowerCase()),
    poster: '#3a3a4a',
    posterAccent: '#ebe6d8',
  };
}

// ── people ─────────────────────────────────────────────────────────

export interface Person {
  id: string;            // `tmdb_p_${tmdbId}`
  tmdbId: number;
  name: string;
  profileUrl: string | null;
  knownForDept?: string;
  knownFor: Array<{ id: string; title: string; year: number; kind: 'film' | 'series'; posterUrl: string | null }>;
}

function mapPersonSearchResult(r: any): Person {
  const knownFor = (r.known_for || [])
    .filter((k: any) => k.media_type === 'movie' || k.media_type === 'tv')
    .map((k: any) => k.media_type === 'tv' ? mapTv(k) : mapMovie(k))
    .map((f: Film) => ({ id: f.id, title: f.title, year: f.year, kind: f.kind, posterUrl: f.posterUrl ?? null }));
  return {
    id: `tmdb_p_${r.id}`,
    tmdbId: r.id,
    name: r.name || '',
    profileUrl: r.profile_path ? `${IMG_BASE}/w185${r.profile_path}` : null,
    knownForDept: r.known_for_department,
    knownFor,
  };
}

export async function searchPeople(query: string): Promise<Person[]> {
  if (!query) return [];
  const url = `${TMDB_BASE}/search/person?query=${encodeURIComponent(query)}&include_adult=false`;
  const r = await fetch(url, { headers: authHeaders(), next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`TMDB person search failed: ${r.status}`);
  const json = await r.json();
  return (json.results || []).map(mapPersonSearchResult);
}

export interface PersonCredit {
  id: string;
  title: string;
  year: number;
  kind: 'film' | 'series';
  posterUrl: string | null;
  character?: string;
  department?: string;
  job?: string;
}

export async function getPersonCredits(tmdbId: number): Promise<{ person: Person; credits: PersonCredit[] }> {
  const personUrl = `${TMDB_BASE}/person/${tmdbId}?append_to_response=combined_credits`;
  const r = await fetch(personUrl, { headers: authHeaders(), next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`TMDB person ${tmdbId} failed: ${r.status}`);
  const j = await r.json();
  const person: Person = {
    id: `tmdb_p_${j.id}`,
    tmdbId: j.id,
    name: j.name || '',
    profileUrl: j.profile_path ? `${IMG_BASE}/w185${j.profile_path}` : null,
    knownForDept: j.known_for_department,
    knownFor: [],
  };
  const cast = (j.combined_credits?.cast || []).map((c: any) => mapCredit(c, c.character, undefined, undefined));
  const crew = (j.combined_credits?.crew || []).map((c: any) => mapCredit(c, undefined, c.department, c.job));
  // dedupe by id, keep cast over crew when both
  const seen = new Map<string, PersonCredit>();
  for (const c of [...cast, ...crew]) {
    if (!seen.has(c.id)) seen.set(c.id, c);
  }
  const credits = Array.from(seen.values()).sort((a, b) => (b.year || 0) - (a.year || 0));
  return { person, credits };
}

function mapCredit(c: any, character?: string, department?: string, job?: string): PersonCredit {
  const isTv = c.media_type === 'tv';
  const id = isTv ? `tmdb_t_${c.id}` : `tmdb_m_${c.id}`;
  const title = isTv ? (c.name || c.original_name) : (c.title || c.original_title);
  const dateStr = isTv ? (c.first_air_date || '') : (c.release_date || '');
  return {
    id,
    title: title || '',
    year: +(dateStr || '').slice(0, 4) || 0,
    kind: isTv ? 'series' : 'film',
    posterUrl: c.poster_path ? `${IMG_BASE}/w500${c.poster_path}` : null,
    character: character || undefined,
    department: department || undefined,
    job: job || undefined,
  };
}
