import type { Metadata } from 'next';
import { LegalPage } from '@/app/components/ui/LegalPage';
import { getOperator, getSupabaseRegion, missingOperatorFields } from '@/app/components/lib/legal';

export const metadata: Metadata = { title: 'Datenschutz · Lumière' };

// Template written against what the app actually stores (see
// supabase/migrations). Not legal advice: have it checked before launch, and
// update it whenever a new kind of data or a new service is added.
export default function DatenschutzPage() {
  const op = getOperator();
  const region = getSupabaseRegion();
  const missing = missingOperatorFields(op);
  if (!region) missing.push('SUPABASE_REGION');
  const contact = op.email ? <a href={`mailto:${op.email}`}>{op.email}</a> : '[E-Mail-Adresse]';

  return (
    <LegalPage eyebrow="§ rechtliches" title="Datenschutz" missing={missing}>
      <h2>1. Verantwortlich</h2>
      <p>
        {op.name || '[Vor- und Nachname]'}, {op.street || '[Straße und Hausnummer]'},{' '}
        {op.city || '[PLZ und Ort]'}. E-Mail: {contact}
      </p>

      <h2>2. Kurz gesagt</h2>
      <p>
        Lumière ist ein Filmtagebuch. Wir speichern nur, was du selbst einträgst, und was nötig
        ist, damit dein Konto funktioniert. Es gibt keine Werbung, kein Tracking und keine
        Analyse-Cookies.
      </p>

      <h2>3. Hosting</h2>
      <p>
        Die App wird bei Vercel Inc. (USA) gehostet. Beim Aufruf verarbeitet Vercel technisch
        notwendige Daten wie IP-Adresse, Zeitpunkt, aufgerufene Adresse und Browser-Kennung, um die
        Seite auszuliefern und vor Missbrauch zu schützen (Art. 6 Abs. 1 lit. f DSGVO). Die
        Übermittlung in die USA erfolgt auf Grundlage des EU-US Data Privacy Framework bzw. von
        Standardvertragsklauseln.
      </p>

      <h2>4. Dein Konto und deine Einträge</h2>
      <p>
        Beim ersten Besuch wird automatisch ein anonymes Konto mit einer zufälligen Kennung angelegt.
        Optional kannst du eine E-Mail-Adresse verbinden, um dich per Login-Link auf anderen Geräten
        anzumelden. Gespeichert werden bei Supabase Inc. (Serverstandort:{' '}
        {region || '[Region eintragen]'}):
      </p>
      <ul>
        <li>Konto: zufällige Kennung, ggf. E-Mail-Adresse</li>
        <li>Profil: Handle, Name, Bio, Profilbild, Top-Filme, Profil-Theme</li>
        <li>Einträge: gesehene Filme mit Datum, Cry-Wert, Bewertungen, Notizen, Sichtbarkeit</li>
        <li>Watched, Watchlist, eigene Listen und selbst gewählte Poster</li>
        <li>wem du folgst und welche Einträge du mit „felt this“ markierst</li>
        <li>
          ein Zähler deiner Anfragen pro Minute an die Filmsuche, um Missbrauch zu begrenzen
          (wird laufend überschrieben)
        </li>
      </ul>
      <p>
        Rechtsgrundlage ist die Bereitstellung der App (Art. 6 Abs. 1 lit. b DSGVO). Die Übermittlung
        in die USA erfolgt auf Grundlage von Standardvertragsklauseln.
      </p>

      <h2>5. Was andere sehen</h2>
      <p>
        Öffentlich sichtbar sind dein Profil (Handle, Name, Bio, Profilbild, Top-Filme), Einträge,
        die du auf „followers“ stellst, Listen, die du auf „public“ stellst, und deine Watched-Liste
        nur, wenn du sie in den Einstellungen freigibst. Alles andere ist nur für dich sichtbar.
      </p>

      <h2>6. Speicherung im Browser</h2>
      <p>
        Im lokalen Speicher deines Browsers (localStorage) liegen deine Anmeldesitzung, deine
        Darstellungs-Einstellungen und, ohne Konto, deine Einträge. Das ist technisch notwendig
        (§ 25 Abs. 2 Nr. 2 TDDDG). Cookies zu Tracking- oder Werbezwecken setzen wir nicht.
      </p>

      <h2>7. Filmdaten und Bilder (TMDB)</h2>
      <p>
        Filmdaten kommen von The Movie Database (TMDB, USA). Suchanfragen leiten wir über unseren
        Server weiter, ohne Angaben zu deiner Person. Poster und Bilder lädt dein Browser direkt von
        TMDB; dabei erhält TMDB deine IP-Adresse (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h2>8. Schriftarten</h2>
      <p>Die Schriften werden von unserem eigenen Server ausgeliefert. Es besteht keine Verbindung zu Google.</p>

      <h2>9. Login-E-Mails</h2>
      <p>
        Wenn du dich per E-Mail anmeldest, verschickt Supabase bzw. ein von uns beauftragter
        E-Mail-Dienstleister den Login-Link an deine Adresse.
      </p>

      <h2>10. Speicherdauer und Löschung</h2>
      <p>
        Deine Daten bleiben gespeichert, bis du dein Konto löschen lässt. Schreib dafür an {contact};
        wir löschen dann dein Konto mit allen Einträgen, Listen und deinem Profilbild.
      </p>

      <h2>11. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO). Wende dich dafür an {contact}. Du
        kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren.
      </p>

      <p style={{ marginTop: 24 }}>Stand: Oktober 2026</p>
    </LegalPage>
  );
}
