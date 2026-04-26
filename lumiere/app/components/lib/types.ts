// lib/types.ts — shared domain types

export type MediaKind = 'film' | 'series';

export interface Film {
  id: string;              // `tmdb_${tmdbId}` or `tmdb_${tvId}_s${s}_e${e}` for episodes
  tmdbId: number;
  title: string;
  year: number;
  kind: MediaKind;
  season?: number;
  episode?: number;
  epTitle?: string;
  dir?: string;
  runtime?: number;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  synopsis?: string;
  tags?: string[];
  // local-only rendering helpers (kept for backwards compat with prototype Poster)
  poster?: string;          // fallback tint color if no posterUrl
  posterAccent?: string;
}

export interface RatingMap {
  plot?: number; characters?: number; visuals?: number; score?: number;
  pacing?: number; originality?: number; dialogue?: number; vibe?: number;
  rewatch?: number; ending?: number;
}

export type Visibility = 'private' | 'public';

export interface LogEntry {
  id: string;
  userId: string;
  filmId: string;
  cry: number;           // 0..100
  ratings: RatingMap;
  note?: string;
  createdAt: string;
  visibility: Visibility;
}

export interface Profile {
  id: string;
  handle: string;
  name?: string;
  bio?: string;
  avatarUrl?: string | null;
  createdAt: string;
  topFilms: string[];
  topSeries: string[];
}

export interface Friend {
  id: string;
  handle: string;
  name: string;
  initials: string;
  tint: string;
}

export interface User {
  id: string;
  handle: string;
  name: string;
  initials: string;
  email?: string;
  joined?: string;
  birthDate?: string;
  birthTime?: string;
  calibrationFilm?: string;
}
