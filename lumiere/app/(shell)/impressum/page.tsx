import type { Metadata } from 'next';
import { LegalPage } from '@/app/components/ui/LegalPage';
import { getOperator, missingOperatorFields } from '@/app/components/lib/legal';

export const metadata: Metadata = { title: 'Impressum · Lumière' };

export default function ImpressumPage() {
  const op = getOperator();
  return (
    <LegalPage eyebrow="§ rechtliches" title="Impressum" missing={missingOperatorFields(op)}>
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        {op.name || '[Vor- und Nachname]'}<br />
        {op.street || '[Straße und Hausnummer]'}<br />
        {op.city || '[PLZ und Ort]'}
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail:{' '}
        {op.email ? <a href={`mailto:${op.email}`}>{op.email}</a> : '[E-Mail-Adresse]'}
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        {op.name || '[Vor- und Nachname]'}, Anschrift wie oben.
      </p>

      <h2>Inhalte von Nutzerinnen und Nutzern</h2>
      <p>
        Profile, Einträge, Notizen und Listen werden von den jeweiligen Nutzerinnen und Nutzern
        selbst erstellt. Wenn dir rechtswidrige Inhalte auffallen, schreib an die oben genannte
        E-Mail-Adresse. Sie werden nach Kenntnis zeitnah entfernt.
      </p>

      <h2>Filmdaten</h2>
      <p>
        Titel, Poster, Bilder und weitere Filmdaten stammen von The Movie Database (TMDB).
        Diese App nutzt die TMDB-API, wird aber von TMDB weder unterstützt noch zertifiziert.
      </p>
    </LegalPage>
  );
}
