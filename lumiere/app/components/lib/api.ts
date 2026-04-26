// lib/api.ts — client-side fetchers (hit our own API, never TMDB directly)
import type { Film } from './types';
import type { ImageCatalog, SeasonSummary, EpisodeSummary } from './tmdb';

export async function searchFilms(q: string): Promise<Film[]> {
  if (!q.trim()) return [];
  const r = await fetch(`/api/films/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('search failed');
  const j = await r.json();
  return j.results || [];
}

export async function getFilm(id: string): Promise<Film | null> {
  const r = await fetch(`/api/films/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.film || null;
}

export async function getFilmImages(id: string): Promise<ImageCatalog> {
  const r = await fetch(`/api/films/${encodeURIComponent(id)}/images`);
  if (!r.ok) throw new Error('images failed');
  return r.json();
}

export async function getSeriesEpisodes(
  id: string,
  season?: number,
): Promise<{ seasons: SeasonSummary[]; episodes?: EpisodeSummary[] }> {
  const url = season != null
    ? `/api/films/${encodeURIComponent(id)}/episodes?season=${season}`
    : `/api/films/${encodeURIComponent(id)}/episodes`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('episodes failed');
  return r.json();
}
