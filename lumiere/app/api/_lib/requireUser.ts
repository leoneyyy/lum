// Gate for our TMDB proxy routes: only callers holding a valid Supabase
// session JWT (anonymous sessions count) get through, so the routes can't be
// hammered with a bare curl and burn the TMDB quota.
import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const MAX_CACHE_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 2000;

// token -> ms timestamp until which we trust it without asking Supabase again
const verified = new Map<string, number>();
let client: SupabaseClient | null = null;

function supabase(url: string, anon: string): SupabaseClient {
  client ??= createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

function expiryMs(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function unauthorized(reason: string) {
  return NextResponse.json({ error: `unauthorized · ${reason}` }, { status: 401 });
}

/** Returns a 401 response to send back, or null when the caller is allowed. */
export async function requireUser(req: NextRequest): Promise<NextResponse | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // local mode: there's no auth backend to check against
  if (!url || !anon) return null;

  const match = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return unauthorized('missing token');
  const token = match[1];

  const now = Date.now();
  if ((verified.get(token) ?? 0) > now) return null;

  const { data, error } = await supabase(url, anon).auth.getUser(token);
  if (error || !data.user) {
    verified.delete(token);
    return unauthorized('invalid token');
  }

  if (verified.size >= MAX_CACHE_ENTRIES) {
    for (const [t, until] of verified) if (until <= now) verified.delete(t);
    if (verified.size >= MAX_CACHE_ENTRIES) verified.clear();
  }
  verified.set(token, Math.min(now + MAX_CACHE_MS, expiryMs(token) || now));
  return null;
}
