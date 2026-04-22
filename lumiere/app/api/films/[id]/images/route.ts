// app/api/films/[id]/images/route.ts — list alternate posters + backdrops
import { NextRequest, NextResponse } from 'next/server';
import { getFilmImages } from '@/app/components/lib/tmdb';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return NextResponse.json(await getFilmImages(id));
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed' },
      { status: 500 },
    );
  }
}
