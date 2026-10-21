// app/api/films/search/route.ts — proxy to TMDB, keeps token server-side
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/api/_lib/requireUser';
import { searchMulti } from '@/app/components/lib/tmdb';

export async function GET(req: NextRequest) {
  const denied = await requireUser(req);
  if (denied) return denied;
  const q = req.nextUrl.searchParams.get('q') || '';
  try {
    const results = await searchMulti(q);
    return NextResponse.json({ results });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
