'use client';
import React from 'react';
import { getSupabase } from './supabase';

type LoadState = 'idle' | 'loading' | 'loaded';

let followerId: string | null = null;
let following: Set<string> = new Set();
let state: LoadState = 'idle';
let cachedSnapshot: { ids: readonly string[]; state: LoadState } = { ids: [], state: 'idle' };
let cachedVersion = -1;
let version = 0;
const listeners = new Set<() => void>();
const notify = () => { version++; for (const cb of listeners) cb(); };

async function load() {
  const sb = getSupabase();
  if (!sb || !followerId) return;
  state = 'loading';
  notify();
  const { data, error } = await sb
    .from('follows')
    .select('followee_id')
    .eq('follower_id', followerId);
  if (error) {
    console.error('[lumiere] follows fetch failed', error.message);
    state = 'loaded';
    following = new Set();
    notify();
    return;
  }
  following = new Set((data ?? []).map((r: { followee_id: string }) => r.followee_id));
  state = 'loaded';
  notify();
}

export function setFollowUser(userId: string | null) {
  if (followerId === userId) return;
  followerId = userId;
  following = new Set();
  state = 'idle';
  notify();
  if (userId) void load();
}

const EMPTY_IDS: readonly string[] = [];
const EMPTY_VIEW = { ids: EMPTY_IDS, state: 'idle' as const };

function snapshot(): { ids: readonly string[]; state: LoadState } {
  if (cachedVersion !== version) {
    cachedVersion = version;
    cachedSnapshot = {
      ids: Array.from(following).sort(),
      state,
    };
  }
  return cachedSnapshot;
}
function serverSnapshot() { return EMPTY_VIEW; }
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useFollowing(): { ids: readonly string[]; state: 'idle' | 'loading' | 'loaded' } {
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useIsFollowing(id: string): boolean {
  const { ids } = useFollowing();
  return ids.includes(id);
}

export async function follow(followeeId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !followerId) return 'not signed in';
  if (followeeId === followerId) return 'cannot follow yourself';
  if (following.has(followeeId)) return null;
  following = new Set(following);
  following.add(followeeId);
  notify();
  const { error } = await sb.from('follows').insert({
    follower_id: followerId,
    followee_id: followeeId,
  });
  if (error && error.code !== '23505') {
    console.error('[lumiere] follow failed', error.message);
    following = new Set(following);
    following.delete(followeeId);
    notify();
    return error.message;
  }
  return null;
}

export async function unfollow(followeeId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !followerId) return 'not signed in';
  if (!following.has(followeeId)) return null;
  following = new Set(following);
  following.delete(followeeId);
  notify();
  const { error } = await sb
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId);
  if (error) {
    console.error('[lumiere] unfollow failed', error.message);
    following = new Set(following);
    following.add(followeeId);
    notify();
    return error.message;
  }
  return null;
}
