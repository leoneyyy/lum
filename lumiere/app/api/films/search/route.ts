// app/api/films/search/route.ts — proxy to TMDB, keeps token server-side
import { NextRequest, NextResponse } from 'next/server';
import { searchMulti } from '@/app/components/lib/tmdb';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  try {
    const results = await searchMulti(q);
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
