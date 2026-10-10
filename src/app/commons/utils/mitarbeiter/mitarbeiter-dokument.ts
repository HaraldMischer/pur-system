// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-dokument.ts

import { IMitarbeiterEintrag, TMitarbeiterRolle } from '../../models/domain/mitarbeiter';
import { EGender, IPerson } from '../../models/domain/person';
import { asRecord, getOptionalString, getString } from '../firestore/firestore-dokumentwerte';

const MITARBEITER_ROLLEN: readonly TMitarbeiterRolle[] = [
  'filialkasse',
  'servicekraft',
  'administrator',
  'kassierer',
  'techniker',
  'dienstplaner',
];
const LEGACY_ROLLEN: Readonly<Record<string, TMitarbeiterRolle>> = {
  service: 'servicekraft',
  kasse: 'filialkasse',
  admin: 'administrator',
};

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
  const farbkennung = getOptionalString(daten['farbkennung']);

  return {
    id,
    unternehmerId,
    firmaId,
    person,
    rollen: mapRollen(daten['rollen'], daten['rolle']),
    filialIds: getDokumentIds(daten['filialIds']),
    aktiv: daten['aktiv'] === true,
    ...(farbkennung ? { farbkennung } : {}),
  };
}

/**
 * Erstellt den Anzeigenamen eines Mitarbeiters aus seinen Personendaten.
 *
 * @param person - Personendaten des Mitarbeiters.
 * @returns Der bereinigte Anzeigename.
 */
export function createAnzeigename(person: IPerson): string {
  return `${person.vorname.trim()} ${person.nachname.trim()}`.trim();
}

/**
 * Begrenzt Personendaten auf die im Mitarbeiterdokument gespeicherte Struktur.
 *
 * @param person - Zu speichernde Personendaten.
 * @returns Die bereinigten Personendaten ohne nicht unterstützte Felder.
 */
export function createMitarbeiterPerson(person: IPerson): IPerson {
  return {
    vorname: person.vorname,
    nachname: person.nachname,
    adresse: person.adresse,
    kontakt: person.kontakt,
    ...(person.geburtstag ? { geburtstag: person.geburtstag } : {}),
    ...(person.geschlecht ? { geschlecht: person.geschlecht } : {}),
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

function mapPerson(value: unknown): IPerson {
  const person = asRecord(value);
  const adresse = asRecord(person['adresse']);
  const kontakt = asRecord(person['kontakt']);
  const geburtstag = getOptionalString(person['geburtstag']);
  const geschlecht = Object.values(EGender).find((wert) => wert === person['geschlecht']);
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
    ...(geschlecht ? { geschlecht } : {}),
  };
}

function getDokumentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((eintrag) => getString(eintrag)).filter(Boolean))];
}

function mapRollen(rollen: unknown, legacyRolle: unknown): TMitarbeiterRolle[] {
  if (Array.isArray(rollen)) {
    const gueltigeRollen = rollen.filter((rolle): rolle is TMitarbeiterRolle => {
      return typeof rolle === 'string' && MITARBEITER_ROLLEN.includes(rolle as TMitarbeiterRolle);
    });
    if (gueltigeRollen.length > 0) return [...new Set(gueltigeRollen)];
  }

  if (typeof legacyRolle === 'string') {
    if (MITARBEITER_ROLLEN.includes(legacyRolle as TMitarbeiterRolle)) {
      return [legacyRolle as TMitarbeiterRolle];
    }
    const rolle = LEGACY_ROLLEN[legacyRolle];
    if (rolle) return [rolle];
  }

  return ['servicekraft'];
}
