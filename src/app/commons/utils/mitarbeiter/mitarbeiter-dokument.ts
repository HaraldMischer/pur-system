// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-dokument.ts

import {
  IMitarbeiterEintrag,
  TMitarbeiterPerson,
  TMitarbeiterRolle,
} from '../../models/domain/mitarbeiter';
import { asRecord, getOptionalString, getString } from '../firestore/firestore-dokumentwerte';

const MITARBEITER_ROLLEN: readonly TMitarbeiterRolle[] = ['service', 'kasse', 'admin'];

/**
 * Bildet unveränderte Firestore-Daten als fachlichen Mitarbeitereintrag ab.
 *
 * @param unternehmerId - Dokument-ID des übergeordneten Unternehmers.
 * @param firmaId - Dokument-ID der übergeordneten Firma.
 * @param id - Dokument-ID des Mitarbeiters.
 * @param daten - Unveränderte Firestore-Daten des Mitarbeiters.
 * @returns Der normalisierte fachliche Mitarbeitereintrag.
 */
export function mapMitarbeiterEintrag(
  unternehmerId: string,
  firmaId: string,
  id: string,
  daten: Record<string, unknown>,
): IMitarbeiterEintrag {
  const person = mapPerson(daten['person']);
  const rolle = daten['rolle'];

  return {
    id,
    unternehmerId,
    firmaId,
    person,
    rolle: isMitarbeiterRolle(rolle) ? rolle : 'service',
    filialIds: getDokumentIds(daten['filialIds']),
    aktiv: daten['aktiv'] === true,
  };
}

/**
 * Erstellt den Anzeigenamen eines Mitarbeiters aus seinen Personendaten.
 *
 * @param person - Personendaten des Mitarbeiters.
 * @returns Der bereinigte Anzeigename.
 */
export function createAnzeigename(person: TMitarbeiterPerson): string {
  return `${person.vorname.trim()} ${person.nachname.trim()}`.trim();
}

/**
 * Begrenzt Personendaten auf die im Mitarbeiterdokument gespeicherte Struktur.
 *
 * @param person - Zu speichernde Personendaten.
 * @returns Die bereinigten Personendaten ohne nicht unterstützte Felder.
 */
export function createMitarbeiterPerson(person: TMitarbeiterPerson): TMitarbeiterPerson {
  return {
    vorname: person.vorname,
    nachname: person.nachname,
    adresse: person.adresse,
    kontakt: person.kontakt,
    ...(person.geburtstag ? { geburtstag: person.geburtstag } : {}),
  };
}

/**
 * Sortiert Mitarbeiter nach Nachname und anschließend nach Vorname.
 *
 * @param mitarbeiter - Zu sortierende Mitarbeitereinträge.
 * @returns Eine neue sortierte Mitarbeiterliste.
 */
export function sortMitarbeiter(
  mitarbeiter: readonly IMitarbeiterEintrag[],
): IMitarbeiterEintrag[] {
  return [...mitarbeiter].sort((a, b) => {
    const nachname = a.person.nachname.localeCompare(b.person.nachname, 'de');
    return nachname || a.person.vorname.localeCompare(b.person.vorname, 'de');
  });
}

function mapPerson(value: unknown): TMitarbeiterPerson {
  const person = asRecord(value);
  const adresse = asRecord(person['adresse']);
  const kontakt = asRecord(person['kontakt']);
  const geburtstag = getOptionalString(person['geburtstag']);
  const email = getOptionalString(kontakt['email']);
  const telefon = getOptionalString(kontakt['telefon']);
  const mobil = getOptionalString(kontakt['mobil']);
  const webseite = getOptionalString(kontakt['webseite']);

  return {
    vorname: getString(person['vorname']),
    nachname: getString(person['nachname']),
    adresse: {
      strasse: getString(adresse['strasse']),
      hausnummer: getString(adresse['hausnummer']),
      postleitzahl: getString(adresse['postleitzahl']),
      ort: getString(adresse['ort']),
    },
    kontakt: {
      ...(email ? { email } : {}),
      ...(telefon ? { telefon } : {}),
      ...(mobil ? { mobil } : {}),
      ...(webseite ? { webseite } : {}),
    },
    ...(geburtstag ? { geburtstag } : {}),
  };
}

function getDokumentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((eintrag) => getString(eintrag)).filter(Boolean))];
}

function isMitarbeiterRolle(value: unknown): value is TMitarbeiterRolle {
  return typeof value === 'string' && MITARBEITER_ROLLEN.includes(value as TMitarbeiterRolle);
}
