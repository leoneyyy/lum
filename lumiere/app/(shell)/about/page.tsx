import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, TmdbLogo } from '@/app/components/ui/LegalPage';

export const metadata: Metadata = { title: 'About · Lumière' };

export default function AboutPage() {
  return (
    <LegalPage eyebrow="§ colophon" title="about">
      <p>
        lumière is a field guide to what you watched: a diary for the nights a film got to you,
        measured in tears as much as stars.
      </p>

      <h2>film data</h2>
      <div style={{ margin: '4px 0 12px' }}>
        <TmdbLogo />
      </div>
      <p>
        <strong>This product uses the TMDB API but is not endorsed or certified by TMDB.</strong>{' '}
        Titles, posters, backdrops, title logos, cast and crew come from{' '}
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">The Movie Database</a>.
      </p>

      <h2>type</h2>
      <p>
        DM Serif Display, Cormorant Garamond and JetBrains Mono, all under the SIL Open Font
        License.
      </p>

      <h2>legal</h2>
      <p>
        <Link href="/impressum">Impressum</Link> · <Link href="/datenschutz">Datenschutz</Link>
      </p>
    </LegalPage>
  );
}
