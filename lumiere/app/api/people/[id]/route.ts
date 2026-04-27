import { NextRequest, NextResponse } from 'next/server';
import { getPersonCredits } from '@/app/components/lib/tmdb';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const m = id.match(/^tmdb_p_(\d+)$/);
  if (!m) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  try {
    const out = await getPersonCredits(+m[1]);
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
