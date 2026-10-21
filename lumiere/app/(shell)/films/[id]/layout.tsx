import type { Metadata } from 'next';
import { getFilmById } from '@/app/components/lib/tmdb';

// Share preview for film links. The page is a client component, so the
// metadata lives in this server layout.
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id: raw } = await params;
  let film = null;
  try {
    film = await getFilmById(decodeURIComponent(raw));
  } catch {
    // TMDB unreachable: fall back to the site defaults
  }
  if (!film) return {};

  const sub = film.season != null
    ? (film.episode != null ? ` s${film.season}e${film.episode}` : ` · season ${film.season}`)
    : '';
  const title = `${film.title}${sub}${film.year ? ` (${film.year})` : ''} · Lumière`;
  const description = film.synopsis?.trim().slice(0, 200) || 'A field guide to what you watched.';
  const images = film.backdropUrl
    ? [{ url: film.backdropUrl, width: 1280, height: 720, alt: film.title }]
    : film.posterUrl
      ? [{ url: film.posterUrl, alt: film.title }]
      : [{ url: '/og.png', width: 1200, height: 630, alt: 'lumière' }];

  return {
    title,
    description,
    openGraph: { siteName: 'Lumière', type: 'video.movie', title, description, images },
    twitter: { card: film.backdropUrl ? 'summary_large_image' : 'summary', title, description },
  };
}

export default function FilmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
