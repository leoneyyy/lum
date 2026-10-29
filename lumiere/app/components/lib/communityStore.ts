'use client';
import { getSupabase } from './supabase';

// Aggregates across everyone, computed in Postgres (see the community
// migration): these functions never return individual entries.

export interface CommunityStats {
  raters: number;            // 0 means "not enough people yet" (< 3)
  avgCry: number | null;     // 0..100
  buckets: number[];         // people per band: 0-19, 20-39, 40-59, 60-79, 80-100
  dims: Record<string, number>;
}

export async function fetchFilmCommunityStats(filmId: string): Promise<CommunityStats | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('film_community_stats', { p_film_id: filmId });
  if (error) {
    console.error('[lumiere] community stats failed', error.message);
    return null;
  }
  const row = (data as { raters: number; avg_cry: number | null; buckets: number[] | null; dims: Record<string, number> | null }[])?.[0];
  if (!row) return { raters: 0, avgCry: null, buckets: [], dims: {} };
  return { raters: row.raters, avgCry: row.avg_cry, buckets: row.buckets ?? [], dims: row.dims ?? {} };
}

export type ChartOrder = 'rating' | 'popular';

export interface ChartRow {
  rank: number;
  filmId: string;
  raters: number;
  avgCry: number;
}

export const CHART_MAX = 500;

export async function fetchLeaderboard(order: ChartOrder, limit: number, offset: number): Promise<ChartRow[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('film_leaderboard', { p_order: order, p_limit: limit, p_offset: offset });
  if (error) {
    console.error('[lumiere] leaderboard failed', error.message);
    return null;
  }
  return ((data ?? []) as { rank: number; film_id: string; raters: number; avg_cry: number }[])
    .map(r => ({ rank: r.rank, filmId: r.film_id, raters: r.raters, avgCry: r.avg_cry }));
}

export interface SuggestedProfile {
  id: string;
  handle: string;
  name?: string;
  avatarUrl: string | null;
  shared: number;     // films they show publicly that you've logged or watched
  followers: number;
}

export async function fetchSuggestedProfiles(limit = 12): Promise<SuggestedProfile[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('suggested_profiles', { p_limit: limit });
  if (error) {
    console.error('[lumiere] suggestions failed', error.message);
    return [];
  }
  return ((data ?? []) as { id: string; handle: string; name: string | null; avatar_url: string | null; shared: number; followers: number }[])
    .map(r => ({
      id: r.id, handle: r.handle, name: r.name ?? undefined, avatarUrl: r.avatar_url,
      shared: r.shared, followers: r.followers,
    }));
}
