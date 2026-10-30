// app/api/films/route.ts — many films in one request: /api/films?ids=a,b,c
// Pages with long logs (home, orbit) used to fire one request per film.
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/api/_lib/requireUser';
import { getFilmsByIds } from '@/app/components/lib/tmdb';

const MAX_IDS = 50;
const ID_RE = /^tmdb_(m_\d+|t_\d+(_s\d+(_e\d+)?)?)$/;

export async function GET(req: NextRequest) {
  const denied = await requireUser(req);
  if (denied) return denied;
  const ids = Array.from(new Set(
    (req.nextUrl.searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(s => ID_RE.test(s)),
  ));
  if (ids.length === 0) return NextResponse.json({ error: 'no valid ids' }, { status: 400 });
  if (ids.length > MAX_IDS) return NextResponse.json({ error: `at most ${MAX_IDS} ids` }, { status: 400 });
  try {
    return NextResponse.json({ films: await getFilmsByIds(ids) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'load failed' }, { status: 500 });
  }
}
