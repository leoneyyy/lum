// app/api/films/[id]/route.ts — fetch one film/season/episode by our id format
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/api/_lib/requireUser';
import { getFilmById } from '@/app/components/lib/tmdb';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    const film = await getFilmById(id);
    if (!film) return NextResponse.json({ error: 'bad id' }, { status: 400 });
    return NextResponse.json({ film });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'load failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
