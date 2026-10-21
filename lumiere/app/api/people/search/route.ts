import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/api/_lib/requireUser';
import { searchPeople } from '@/app/components/lib/tmdb';

export async function GET(req: NextRequest) {
  const denied = await requireUser(req);
  if (denied) return denied;
  const q = req.nextUrl.searchParams.get('q') || '';
  try {
    const results = await searchPeople(q);
    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
