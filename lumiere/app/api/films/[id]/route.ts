// app/api/films/[id]/route.ts — fetch one film/episode by our id format
import { NextRequest, NextResponse } from 'next/server';
import { getMovie, getEpisode, getSeason, getSeries } from '@/app/components/lib/tmdb';

// id format:
//   tmdb_m_<movieId>
//   tmdb_t_<tvId>              (whole show)
//   tmdb_t_<tvId>_s<s>          (season)
//   tmdb_t_<tvId>_s<s>_e<e>     (episode)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const mMovie = id.match(/^tmdb_m_(\d+)$/);
    if (mMovie) {
      return NextResponse.json({ film: await getMovie(+mMovie[1]) });
    }
    const mEp = id.match(/^tmdb_t_(\d+)_s(\d+)_e(\d+)$/);
    if (mEp) {
      return NextResponse.json({
        film: await getEpisode(+mEp[1], +mEp[2], +mEp[3]),
      });
    }
    const mSeason = id.match(/^tmdb_t_(\d+)_s(\d+)$/);
    if (mSeason) {
      return NextResponse.json({
        film: await getSeason(+mSeason[1], +mSeason[2]),
      });
    }
    const mTv = id.match(/^tmdb_t_(\d+)$/);
    if (mTv) {
      return NextResponse.json({ film: await getSeries(+mTv[1]) });
    }
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'load failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}