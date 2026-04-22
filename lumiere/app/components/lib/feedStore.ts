'use client';
import React from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { LogEntry, RatingMap, Visibility } from './types';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { useFollowing } from './followStore';

type Row = {
  id: string;
  user_id: string;
  film_id: string;
  cry: number;
  ratings: RatingMap | null;
  note: string | null;
  created_at: string;
  visibility: Visibility | null;
};

function rowToEntry(r: Row): LogEntry {
  return {
    id: r.id,
    userId: r.user_id,
    filmId: r.film_id,
    cry: r.cry,
    ratings: (r.ratings ?? {}) as RatingMap,
    note: r.note ?? undefined,
    createdAt: r.created_at,
    visibility: (r.visibility ?? 'public') as Visibility,
  };
}

// ── invalidation bus ──────────────────────────────────────────────
// Every log_entries INSERT/UPDATE/DELETE (that RLS lets us see) bumps a
// version counter. Feed hooks treat this as a dep so they refetch.

let feedUserId: string | null = null;
let feedChannel: RealtimeChannel | null = null;
let feedVersion = 0;
const feedListeners = new Set<() => void>();
const notifyFeed = () => { feedVersion++; for (const cb of feedListeners) cb(); };

function teardownFeedChannel() {
  const sb = getSupabase();
  if (feedChannel && sb) void sb.removeChannel(feedChannel);
  feedChannel = null;
}

function setupFeedChannel() {
  const sb = getSupabase();
  if (!sb || !feedUserId) return;
  feedChannel = sb.channel(`feed-invalidate:${feedUserId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'log_entries' },
      () => notifyFeed(),
    )
    .subscribe();
}

export function setFeedUser(id: string | null) {
  if (feedUserId === id) return;
  teardownFeedChannel();
  feedUserId = id;
  if (id) setupFeedChannel();
}

function useFeedVersion(): number {
  const [v, setV] = React.useState(feedVersion);
  React.useEffect(() => {
    const cb = () => setV(feedVersion);
    feedListeners.add(cb);
    return () => { feedListeners.delete(cb); };
  }, []);
  return v;
}

export interface FeedState {
  entries: LogEntry[];
  state: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
}

const EMPTY_LOADED: FeedState = { entries: [], state: 'loaded', error: null };
const LOADING: FeedState = { entries: [], state: 'loading', error: null };
const OFFLINE: FeedState = { entries: [], state: 'error', error: 'offline' };

type Result = { key: string; data: FeedState };

function useQueryFeed(key: string, limit: number, run: (key: string) => Promise<FeedState>): FeedState {
  const [result, setResult] = React.useState<Result | null>(null);
  const version = useFeedVersion();

  React.useEffect(() => {
    if (!key) return;
    if (!isSupabaseConfigured()) return;
    let cancel = false;
    void run(key).then(data => { if (!cancel) setResult({ key, data }); });
    return () => { cancel = true; };
  }, [key, limit, run, version]);

  if (!key) return EMPTY_LOADED;
  if (!isSupabaseConfigured()) return OFFLINE;
  if (result?.key === key) return result.data;
  return LOADING;
}

export function useCircleFeed(followeeIds: readonly string[], limit = 20): FeedState {
  const key = React.useMemo(
    () => Array.from(new Set(followeeIds)).sort().join('|'),
    [followeeIds],
  );
  const run = React.useCallback(async (k: string): Promise<FeedState> => {
    const sb = getSupabase();
    if (!sb) return OFFLINE;
    const ids = k.split('|').filter(Boolean);
    const { data, error } = await sb
      .from('log_entries')
      .select('*')
      .in('user_id', ids)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { entries: [], state: 'error', error: error.message };
    return {
      entries: (data as Row[]).map(rowToEntry),
      state: 'loaded',
      error: null,
    };
  }, [limit]);
  return useQueryFeed(key, limit, run);
}

export function useMyCircleFeed(limit = 20): FeedState {
  const { ids } = useFollowing();
  return useCircleFeed(ids, limit);
}

export function usePublicEntriesByUser(userId: string, limit = 40): FeedState {
  const run = React.useCallback(async (k: string): Promise<FeedState> => {
    const sb = getSupabase();
    if (!sb) return OFFLINE;
    const { data, error } = await sb
      .from('log_entries')
      .select('*')
      .eq('user_id', k)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { entries: [], state: 'error', error: error.message };
    return {
      entries: (data as Row[]).map(rowToEntry),
      state: 'loaded',
      error: null,
    };
  }, [limit]);
  return useQueryFeed(userId, limit, run);
}

export function useCircleEntriesForFilm(filmId: string, limit = 12): FeedState {
  const { ids: followingIds } = useFollowing();
  const key = React.useMemo(() => {
    if (!filmId || followingIds.length === 0) return '';
    return `${filmId}::${Array.from(followingIds).sort().join('|')}`;
  }, [filmId, followingIds]);

  const run = React.useCallback(async (k: string): Promise<FeedState> => {
    const sb = getSupabase();
    if (!sb) return OFFLINE;
    const [film, joined] = k.split('::');
    const ids = joined.split('|').filter(Boolean);
    if (!film || ids.length === 0) return { ...EMPTY_LOADED };
    const { data, error } = await sb
      .from('log_entries')
      .select('*')
      .eq('film_id', film)
      .eq('visibility', 'public')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { entries: [], state: 'error', error: error.message };
    return {
      entries: (data as Row[]).map(rowToEntry),
      state: 'loaded',
      error: null,
    };
  }, [limit]);
  return useQueryFeed(key, limit, run);
}
