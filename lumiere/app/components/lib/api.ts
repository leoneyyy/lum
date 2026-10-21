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

async function apiFetch(path: string): Promise<Response> {
  const token = await accessToken();
  const r = await fetch(path, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  if (r.status !== 401 || !token) return r;
  // token went stale between reading and the server checking it: refresh once
  const { data } = await getSupabase()!.auth.refreshSession();
  if (!data.session) return r;
  return fetch(path, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
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
