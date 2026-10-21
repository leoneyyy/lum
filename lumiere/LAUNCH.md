# Lumière veröffentlichen

Die Schritte, die nicht im Code stecken, sondern in Supabase und Vercel eingestellt werden. Am besten in dieser Reihenfolge, weil spätere Schritte auf früheren aufbauen.

## 1. Datenbank auf Stand bringen

Supabase → **SQL Editor**. Jede Migration aus `supabase/migrations/`, die noch nicht gelaufen ist, einzeln einfügen und ausführen: ganze Datei, **nichts markiert** (sonst führt Supabase nur die Markierung aus).

Zuletzt dazugekommen:
- `20261021000000_api_rate_limit.sql` (Anfragen-Limit)
- `20261021010000_public_shelves.sql` (Watched auf dem Profil zeigen)

Prüfen: Table Editor zeigt `api_rate_limits`, und `profiles` hat eine Spalte `show_watched`.

## 2. Umgebungsvariablen in Vercel

Vercel → Projekt → **Settings → Environment Variables**, jeweils für Production (und Preview, wenn du Previews nutzt):

| Variable | Wert |
| --- | --- |
| `TMDB_READ_TOKEN` | TMDB → Settings → API → „API Read Access Token" |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` |
| `IMPRESSUM_NAME` | Vor- und Nachname |
| `IMPRESSUM_STREET` | Straße und Hausnummer |
| `IMPRESSUM_CITY` | PLZ und Ort |
| `IMPRESSUM_EMAIL` | Kontakt-Adresse |
| `SUPABASE_REGION` | z. B. `Frankfurt (EU)`; steht in Supabase → Project Settings → General |
| `NEXT_PUBLIC_SITE_URL` | erst ab Schritt 4: `https://deine-domain.de` |

Danach **Deployments → ⋮ → Redeploy**. Die Variablen werden beim Build eingelesen.

Prüfen: `/impressum` und `/datenschutz` zeigen keinen roten Hinweis mehr.

## 3. Login-Links: Adressen in Supabase eintragen

Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://lum-theta.vercel.app` (später deine Domain)
- **Redirect URLs:** `https://lum-theta.vercel.app/**` und `http://localhost:3000/**` (zum Entwickeln), später zusätzlich `https://deine-domain.de/**`

Ohne das führen Login-Links aus den E-Mails ins Leere oder auf localhost. Das gilt auch für die Links zum Bestätigen eines neuen Kontos (`/account`) und zum Zurücksetzen des Passworts (`/account/reset`); die `/**`-Einträge decken beide ab.

Supabase → **Authentication → Sign In / Providers → Email**:
- **Email** aktiviert lassen (für Konten mit Passwort und für Login-Links).
- **Confirm email** an lassen: Neue Konten müssen ihre Adresse bestätigen.
- **Minimum password length** auf `8` setzen, passend zur App.
- **Allow anonymous sign-ins** muss an bleiben: Jeder Besuch startet anonym, ein Konto wertet diese Sitzung nur auf.

## 4. Eigene Domain (optional, aber empfohlen)

1. Domain kaufen (z. B. INWX, Namecheap oder direkt bei Vercel).
2. Vercel → Projekt → **Settings → Domains** → Domain hinzufügen, die angezeigten DNS-Einträge beim Anbieter setzen.
3. `NEXT_PUBLIC_SITE_URL` setzen (Schritt 2), Supabase-Adressen ergänzen (Schritt 3), redeployen.

## 5. Eigener E-Mail-Versand für Login-Links

Der eingebaute Versand von Supabase schickt nur sehr wenige Mails pro Stunde und ist zum Testen gedacht. Für echte Nutzer:

1. Konto bei einem Versanddienst anlegen, z. B. [Resend](https://resend.com) (kostenloser Plan reicht für den Anfang).
2. Dort deine Domain verifizieren (DNS-Einträge, braucht Schritt 4) und einen API-Key erstellen.
3. Supabase → **Authentication → Emails → SMTP Settings** aktivieren und die SMTP-Zugangsdaten des Dienstes eintragen (bei Resend stehen sie in der Doku unter „SMTP"). Absender z. B. `login@deine-domain.de`.
4. Unter **Authentication → Rate Limits** das E-Mail-Limit an dein erwartetes Volumen anpassen.

Prüfen: In der App unter Einstellungen → identity eine E-Mail verbinden; der Link kommt an und meldet dich an.

## 6. Supabase-Projekt nicht einschlafen lassen

Kostenlose Supabase-Projekte werden nach einer Woche ohne Aktivität pausiert. Mit regelmäßigen Nutzern passiert das nicht. In der Testphase: im Dashboard wieder aufwecken, oder auf den Pro-Plan wechseln, sobald es ernst wird.

## 7. Schutz vor Fake-Accounts

Anonyme Anmeldungen begrenzt Supabase pro IP schon von selbst (siehe Authentication → Rate Limits). Ein Captcha (Cloudflare Turnstile) wäre der nächste Schritt.

> **Achtung:** Das Captcha **nicht** einfach in Supabase einschalten. Die App muss dann bei jeder Anmeldung ein Captcha-Token mitschicken, sonst schlägt die anonyme Anmeldung fehl und niemand kommt mehr rein. Das braucht erst eine Code-Änderung.

## 8. Rechtliches

- Impressum und Datenschutzerklärung sind Vorlagen, abgestimmt auf das, was die App speichert. Sie ersetzen keine Rechtsberatung. Vor dem Start prüfen lassen und bei neuen Funktionen oder Diensten anpassen.
- **Konto löschen** gibt es noch nicht in der App; die Datenschutzerklärung verweist auf die Kontakt-E-Mail. Löschen von Hand: Supabase → Authentication → Users → Nutzer löschen (Einträge, Listen usw. werden über `on delete cascade` mitgelöscht), dann unter Storage → `avatars` den Ordner mit der User-ID löschen.

## 9. Letzter Check

- [ ] Suche und Film-Seiten laden auf der Live-Seite
- [ ] Login per E-Mail funktioniert
- [ ] App lässt sich auf dem Handy zum Homescreen hinzufügen
- [ ] Profil-Link in WhatsApp oder auf [opengraph.xyz](https://www.opengraph.xyz) zeigt eine Vorschau
- [ ] `/impressum`, `/datenschutz`, `/about` sind ausgefüllt und unten auf jeder Seite verlinkt
