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

// Per-user limit on top of the JWT check. Generous on purpose: the watched
// grid loads up to 60 films at once and the letterboxd import does one
// search per row; normal use never gets near it, a script does.
const RATE_MAX_HITS = 600;
const RATE_WINDOW_SECONDS = 60;
let warnedMissingRateLimit = false;

// Counts this request against the caller's window via the
// hit_api_rate_limit() Postgres function (called with the caller's own JWT).
// Fails open: if the migration isn't applied or Supabase hiccups, the
// request goes through rather than taking the app down.
async function rateLimit(url: string, anon: string, token: string): Promise<NextResponse | null> {
  let r: Response;
  try {
    r = await fetch(`${url}/rest/v1/rpc/hit_api_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_hits: RATE_MAX_HITS, window_seconds: RATE_WINDOW_SECONDS }),
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[lumiere] rate limit check failed', e);
    return null;
  }
  if (r.status === 401) return unauthorized('invalid token');
  if (!r.ok) {
    if (r.status === 404 && !warnedMissingRateLimit) {
      warnedMissingRateLimit = true;
      console.warn('[lumiere] hit_api_rate_limit() missing; apply migration 20261021000000_api_rate_limit.sql');
    } else if (r.status !== 404) {
      console.error('[lumiere] rate limit check failed', r.status, await r.text().catch(() => ''));
    }
    return null;
  }
  const rows = await r.json().catch(() => null) as { allowed: boolean; retry_after: number }[] | null;
  const row = rows?.[0];
  if (!row || row.allowed) return null;
  const retryAfter = Math.max(1, row.retry_after || RATE_WINDOW_SECONDS);
  return NextResponse.json(
    { error: `rate limited · try again in ${retryAfter}s` },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

/** Returns a 401/429 response to send back, or null when the caller is allowed. */
export async function requireUser(req: NextRequest): Promise<NextResponse | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // local mode: there's no auth backend to check against
  if (!url || !anon) return null;

  const match = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return unauthorized('missing token');
  const token = match[1];

  const now = Date.now();
  if ((verified.get(token) ?? 0) > now) return rateLimit(url, anon, token);

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
  return rateLimit(url, anon, token);
}
