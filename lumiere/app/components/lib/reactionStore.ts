'use client';
import React from 'react';
import { getSupabase } from './supabase';

export interface ReactionSummary {
  count: number;
  mine: boolean;
}

const EMPTY: ReactionSummary = { count: 0, mine: false };

let myUserId: string | null = null;
const cache = new Map<string, ReactionSummary>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => { for (const cb of listeners) cb(); };

export function setReactionUser(id: string | null) {
  if (myUserId === id) return;
  myUserId = id;
  cache.clear();
  notify();
}

async function fetchMissing(ids: string[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const needed = ids.filter(id => !cache.has(id) && !inflight.has(id));
  if (needed.length === 0) return;
  for (const id of needed) inflight.add(id);
  try {
    const { data, error } = await sb
      .from('reactions')
      .select('entry_id, user_id')
      .in('entry_id', needed);
    if (error) {
      console.error('[lumiere] reactions fetch failed', error.message);
      for (const id of needed) cache.set(id, { count: 0, mine: false });
      return;
    }
    const tallied = new Map<string, ReactionSummary>();
    for (const id of needed) tallied.set(id, { count: 0, mine: false });
    for (const r of (data ?? []) as { entry_id: string; user_id: string }[]) {
      const s = tallied.get(r.entry_id);
      if (!s) continue;
      s.count++;
      if (r.user_id === myUserId) s.mine = true;
    }
    for (const [id, s] of tallied) cache.set(id, s);
  } finally {
    for (const id of needed) inflight.delete(id);
    notify();
  }
}

export function useReactions(entryIds: readonly string[]): Record<string, ReactionSummary> {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const cb = () => setTick(t => t + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const key = React.useMemo(
    () => Array.from(new Set(entryIds)).sort().join('|'),
    [entryIds],
  );

  React.useEffect(() => {
    const ids = key.split('|').filter(Boolean);
    if (ids.length === 0) return;
    void fetchMissing(ids);
  }, [key]);

  const out: Record<string, ReactionSummary> = {};
  for (const id of key.split('|').filter(Boolean)) {
    out[id] = cache.get(id) ?? EMPTY;
  }
  return out;
}

export async function toggleReaction(entryId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb || !myUserId) return;

  const prev = cache.get(entryId) ?? EMPTY;
  const next: ReactionSummary = {
    count: Math.max(0, prev.count + (prev.mine ? -1 : 1)),
    mine: !prev.mine,
  };
  cache.set(entryId, next);
  notify();

  if (prev.mine) {
    const { error } = await sb
      .from('reactions')
      .delete()
      .eq('entry_id', entryId)
      .eq('user_id', myUserId)
      .eq('type', 'heart');
    if (error) {
      console.error('[lumiere] reaction delete failed', error.message);
      cache.set(entryId, prev);
      notify();
    }
  } else {
    const { error } = await sb
      .from('reactions')
      .insert({ entry_id: entryId, user_id: myUserId, type: 'heart' });
    if (error && error.code !== '23505') {
      console.error('[lumiere] reaction insert failed', error.message);
      cache.set(entryId, prev);
      notify();
    }
  }
}
