// app/api/films/[id]/route.ts — fetch one film/episode by our id format
import { NextRequest, NextResponse } from 'next/server';
import { getMovie, getEpisode } from '@/app/components/lib/tmdb';

// id format:
//   tmdb_m_<movieId>
//   tmdb_t_<tvId>              (whole show — treat as movie-ish for now)
//   tmdb_t_<tvId>_s<s>_e<e>    (episode)
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
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}