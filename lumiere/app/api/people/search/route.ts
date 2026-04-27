import { NextRequest, NextResponse } from 'next/server';
import { searchPeople } from '@/app/components/lib/tmdb';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  try {
    const results = await searchPeople(q);
    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
