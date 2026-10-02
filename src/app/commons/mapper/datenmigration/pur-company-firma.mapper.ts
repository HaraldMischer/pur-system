// pur-system/src/app/commons/mapper/datenmigration/pur-company-firma.mapper.ts

import { FIRESTORE_DOCUMENT_PATHS } from '../../constants/firebase.constants';
import { IDatenmigrationsproblem } from '../../models/domain/datenmigration';
import { IFirmaAdresse, IFirmaDokument } from '../../models/domain/firma';
import { IPurCompanyEintrag } from '../../models/legacy/pur-company';

// ===== Konstanten & Typen ===================

export type TFirmaMigrationDaten = Omit<IFirmaDokument, 'erstelltAm' | 'aktualisiertAm'>;

export type TFirmaMappingErgebnis =
  | { daten: TFirmaMigrationDaten; probleme: [] }
  | { daten: null; probleme: IDatenmigrationsproblem[] };

// ===== Mapper ===============================

/**
 * Validiert und überführt eine Legacy-Firma in die neue Firmenstruktur.
 *
 * @param purCustomerId - Dokument-ID des übergeordneten Legacy-Kunden.
 * @param purCompany - Legacy-Firma mit Dokument-ID und unveränderten Quelldaten.
 * @param ersatzNummer - Nächste freie Firmennummer, falls die Legacy-Nummer ungültig ist.
 * @returns Gemappte Firmendaten oder die festgestellten Validierungsprobleme.
 */
export function mapPurCompanyToFirma(
  purCustomerId: string,
  purCompany: IPurCompanyEintrag,
  ersatzNummer?: number,
): TFirmaMappingErgebnis {
  const quellPfad = FIRESTORE_DOCUMENT_PATHS.purCompany(purCustomerId, purCompany.id);
  const daten = purCompany.daten;
  const probleme: IDatenmigrationsproblem[] = [];
  const firmenname = trimString(daten.companyName);
  const legacyNummer = daten.companyNumber;
  const nummer =
    Number.isInteger(legacyNummer) && Number(legacyNummer) > 0
      ? Number(legacyNummer)
      : ersatzNummer;
  const adresse = mapAdresse(daten.address);

  if (daten.company_ID && daten.company_ID !== purCompany.id) {
    probleme.push(createProblem(quellPfad, 'Die eingebettete Firmen-ID weicht vom Quellpfad ab.'));
  }
  if (!firmenname) probleme.push(createProblem(quellPfad, 'Der Firmenname fehlt.'));
  if (!Number.isInteger(nummer) || Number(nummer) <= 0) {
    probleme.push(createProblem(quellPfad, 'Die Firmennummer fehlt oder ist ungültig.'));
  }
  if (typeof daten.active !== 'boolean') {
    probleme.push(createProblem(quellPfad, 'Der Aktivstatus fehlt oder ist ungültig.'));
  }
  if (probleme.length > 0) return { daten: null, probleme };

  const email = trimString(daten.email);
  const telefon = trimString(daten.phone?.fixedLineNumber);
  const mobil = trimString(daten.phone?.mobile);

  return {
    daten: {
      anzeigename: firmenname,
      firmenname,
      nummer: Number(nummer),
      aktiv: daten.active as boolean,
      ...(Object.keys(adresse).length > 0 ? { adresse } : {}),
      kontakt: {
        ...(email ? { email } : {}),
        ...(telefon ? { telefon } : {}),
        ...(mobil ? { mobil } : {}),
      },
    },
    probleme: [],
  };
}

/**
 * Prüft, ob ein vorhandenes Firmendokument dem Migrationsergebnis entspricht.
 *
 * @param vorhanden - Bereits gespeicherte Firmendaten.
 * @param erwartet - Aus der Legacy-Firma gemappte Firmendaten.
 * @returns `true`, wenn alle migrationsrelevanten Firmendaten übereinstimmen.
 */
export function entsprichtFirmaMigration(
  vorhanden: Record<string, unknown>,
  erwartet: TFirmaMigrationDaten,
): boolean {
  return sindGleich(erwartet, {
    anzeigename: vorhanden['anzeigename'],
    firmenname: vorhanden['firmenname'],
    nummer: vorhanden['nummer'],
    aktiv: vorhanden['aktiv'],
    ...(vorhanden['adresse'] ? { adresse: vorhanden['adresse'] } : {}),
    kontakt: vorhanden['kontakt'],
  });
}

// ===== Interne Helfer =======================

function mapAdresse(adresse: IPurCompanyEintrag['daten']['address']): IFirmaAdresse {
  const strassenwert = trimString(adresse?.street);
  const geteilteStrasse = splitStrasse(strassenwert);
  const postleitzahl = normalizePostleitzahl(adresse?.postcode);
  const ort = trimString(adresse?.city);
  const ergebnis: IFirmaAdresse = {};

  if (geteilteStrasse) {
    ergebnis.strasse = geteilteStrasse.strasse;
    ergebnis.hausnummer = geteilteStrasse.hausnummer;
  } else if (strassenwert) {
    ergebnis.strasse = strassenwert;
  }
  if (postleitzahl) ergebnis.postleitzahl = postleitzahl;
  if (ort) ergebnis.ort = ort;
  return ergebnis;
}

function normalizePostleitzahl(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return trimString(value);
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function splitStrasse(value: unknown): { strasse: string; hausnummer: string } | null {
  const adresse = trimString(value);
  const match = /^(.+?)\s+(\d+\s*[a-zA-Z]?(?:\s*[-/]\s*\d+\s*[a-zA-Z]?)?)$/u.exec(adresse);
  if (!match) return null;

  return {
    strasse: match[1].trim(),
    hausnummer: match[2].replace(/\s+/g, ''),
  };
}

function createProblem(quellPfad: string, ursache: string): IDatenmigrationsproblem {
  return {
    typ: 'fehler',
    quellPfad,
    ursache,
  };
}

function sindGleich(erwartet: unknown, vorhanden: unknown): boolean {
  if (Object.is(erwartet, vorhanden)) return true;
  if (Array.isArray(erwartet) || Array.isArray(vorhanden)) {
    if (!Array.isArray(erwartet) || !Array.isArray(vorhanden)) return false;
    return (
      erwartet.length === vorhanden.length &&
      erwartet.every((wert, index) => sindGleich(wert, vorhanden[index]))
    );
  }
  if (
    typeof erwartet !== 'object' ||
    erwartet === null ||
    typeof vorhanden !== 'object' ||
    vorhanden === null
  ) {
    return false;
  }

  const erwarteteEintraege = Object.entries(erwartet);
  const vorhandeneEintraege = Object.entries(vorhanden);
  return (
    erwarteteEintraege.length === vorhandeneEintraege.length &&
    erwarteteEintraege.every(([key, wert]) => {
      return sindGleich(wert, (vorhanden as Record<string, unknown>)[key]);
    })
  );
}
