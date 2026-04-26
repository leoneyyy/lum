// app/api/films/[id]/episodes/route.ts — list seasons + episodes for a series id
import { NextRequest, NextResponse } from 'next/server';
import { getSeasons, getSeasonEpisodes } from '@/app/components/lib/tmdb';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mTv = id.match(/^tmdb_t_(\d+)(?:_s(\d+)_e(\d+))?$/);
  if (!mTv) {
    return NextResponse.json({ error: 'not a series id' }, { status: 400 });
  }
  const tvId = +mTv[1];
  const seasonParam = req.nextUrl.searchParams.get('season');
  try {
    const seasons = await getSeasons(tvId);
    if (seasonParam !== null) {
      const n = Number(seasonParam);
      if (!Number.isFinite(n)) {
        return NextResponse.json({ error: 'bad season' }, { status: 400 });
      }
      const episodes = await getSeasonEpisodes(tvId, n);
      return NextResponse.json({ seasons, episodes });
    }
    return NextResponse.json({ seasons });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'load failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
