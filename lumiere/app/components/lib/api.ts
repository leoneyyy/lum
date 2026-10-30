// lib/api.ts — client-side fetchers (hit our own API, never TMDB directly)
import type { Film } from './types';
import type { ImageCatalog, SeasonSummary, EpisodeSummary, Person, PersonCredit } from './tmdb';
import { getSupabase } from './supabase';

// Our API routes only answer callers with a Supabase session JWT
// (see app/api/_lib/requireUser.ts).
async function accessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.access_token;
  // first load: AuthProvider may still be signing in anonymously
  return new Promise(resolve => {
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
      resolve(session.access_token);
    });
    const timer = setTimeout(() => {
      sub.subscription.unsubscribe();
      resolve(null);
    }, 8000);
  });
}

const MAX_RATE_RETRIES = 2;
const MAX_RATE_WAIT_MS = 10_000;

async function apiFetch(path: string): Promise<Response> {
  let token = await accessToken();
  const send = () => fetch(path, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

  let r = await send();
  if (r.status === 401 && token) {
    // token went stale between reading and the server checking it: refresh once
    const { data } = await getSupabase()!.auth.refreshSession();
    if (!data.session) return r;
    token = data.session.access_token;
    r = await send();
  }
  // over the per-user limit (big imports, long grids): wait it out instead of failing
  for (let i = 0; r.status === 429 && i < MAX_RATE_RETRIES; i++) {
    const seconds = Number(r.headers.get('Retry-After')) || 5;
    await new Promise(res => setTimeout(res, Math.min(seconds * 1000, MAX_RATE_WAIT_MS)));
    r = await send();
  }
  return r;
}

export async function searchFilms(q: string): Promise<Film[]> {
  if (!q.trim()) return [];
  const r = await apiFetch(`/api/films/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('search failed');
  const j = await r.json();
  return j.results || [];
}

export async function getFilm(id: string): Promise<Film | null> {
  const r = await apiFetch(`/api/films/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.film || null;
}

export const FILMS_BATCH_MAX = 50;

/** Up to FILMS_BATCH_MAX films in one request; null if the request failed. */
export async function getFilmsBatch(ids: string[]): Promise<Record<string, Film> | null> {
  if (ids.length === 0) return {};
  const r = await apiFetch(`/api/films?ids=${ids.map(encodeURIComponent).join(',')}`);
  if (!r.ok) return null;
  const j = await r.json();
  return (j.films ?? {}) as Record<string, Film>;
}

export async function getFilmImages(id: string): Promise<ImageCatalog> {
  const r = await apiFetch(`/api/films/${encodeURIComponent(id)}/images`);
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
  const r = await apiFetch(url);
  if (!r.ok) throw new Error('episodes failed');
  return r.json();
}

export async function searchPeople(q: string): Promise<Person[]> {
  if (!q.trim()) return [];
  const r = await apiFetch(`/api/people/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('person search failed');
  const j = await r.json();
  return j.results || [];
}

export async function getPersonCredits(id: string): Promise<{ person: Person; credits: PersonCredit[] } | null> {
  const r = await apiFetch(`/api/people/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  return r.json();
}
