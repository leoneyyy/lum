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
  const mTv = id.match(/^tmdb_t_(\d+)$/);
  let url: string;
  if (mMovie) {
    url = `${TMDB_BASE}/movie/${mMovie[1]}/images?include_image_language=en,null`;
  } else if (mEp) {
    url = `${TMDB_BASE}/tv/${mEp[1]}/season/${mEp[2]}/episode/${mEp[3]}/images`;
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
