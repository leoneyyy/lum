import type { Metadata } from 'next';
import { getFilmById } from '@/app/components/lib/tmdb';

// Share preview for profile links (WhatsApp, iMessage, …). The page itself is
// a client component, so the metadata lives in this server layout.

type ProfileRow = {
  handle: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  top_films: string[] | null;
  top_series: string[] | null;
};

async function fetchProfile(handle: string): Promise<ProfileRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // handles are [a-z0-9_]{3,24}; anything else can't exist, don't query
  if (!url || !anon || !/^[a-z0-9_]{3,24}$/.test(handle)) return null;
  try {
    const r = await fetch(
      `${url}/rest/v1/profiles?handle=ilike.${handle}&select=handle,name,bio,avatar_url,top_films,top_series&limit=1`,
      { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, next: { revalidate: 300 } },
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as ProfileRow[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// First top pick with a backdrop makes the best 16:9 preview.
async function heroImage(p: ProfileRow): Promise<string | null> {
  for (const id of [...(p.top_films ?? []), ...(p.top_series ?? [])].slice(0, 3)) {
    try {
      const film = await getFilmById(id);
      if (film?.backdropUrl) return film.backdropUrl;
    } catch {
      // TMDB hiccup: try the next pick
    }
  }
  return null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> },
): Promise<Metadata> {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw).toLowerCase();
  const p = await fetchProfile(handle);
  if (!p) return { title: `@${handle} · Lumière` };

  const title = `@${p.handle} · Lumière`;
  const description = p.bio?.trim() || `${p.name?.trim() || `@${p.handle}`}'s film diary on lumière.`;
  const hero = await heroImage(p);
  const images = hero
    ? [{ url: hero, width: 1280, height: 720, alt: title }]
    : p.avatar_url
      ? [{ url: p.avatar_url, alt: title }]
      : [{ url: '/og.png', width: 1200, height: 630, alt: 'lumière' }];

  return {
    title,
    description,
    openGraph: { siteName: 'Lumière', type: 'profile', title, description, images },
    twitter: { card: hero ? 'summary_large_image' : 'summary', title, description },
  };
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return children;
}
