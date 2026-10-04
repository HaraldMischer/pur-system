// pur-system/src/app/commons/mapper/datenmigration/pur-branch-filiale.mapper.ts

import { FIRESTORE_DOCUMENT_PATHS } from '../../constants/firebase.constants';
import { IDatenmigrationsproblem } from '../../models/domain/datenmigration';
import { IFilialeAdresse, IFilialeDokument } from '../../models/domain/filiale';
import { IPurBranchEintrag } from '../../models/legacy/pur-branch';

// ===== Konstanten & Typen ===================

export type TFilialeMigrationDaten = Omit<IFilialeDokument, 'erstelltAm' | 'aktualisiertAm'>;

export type TFilialeMappingErgebnis =
  | { daten: TFilialeMigrationDaten; probleme: [] }
  | { daten: null; probleme: IDatenmigrationsproblem[] };

// ===== Mapper ===============================

/**
 * Validiert und überführt eine Legacy-Filiale in die neue Filialstruktur.
 *
 * @param purCustomerId - Dokument-ID des übergeordneten Legacy-Kunden.
 * @param purBranch - Legacy-Filiale mit übergeordneter Firmen-ID und Quelldaten.
 * @param ersatzNummer - Nächste freie Filialnummer, falls die Legacy-Nummer ungültig ist.
 * @returns Gemappte Filialdaten oder die festgestellten Validierungsprobleme.
 */
export function mapPurBranchToFiliale(
  purCustomerId: string,
  purBranch: IPurBranchEintrag,
  ersatzNummer?: number,
): TFilialeMappingErgebnis {
  const quellPfad = FIRESTORE_DOCUMENT_PATHS.purBranch(
    purCustomerId,
    purBranch.purCompanyId,
    purBranch.id,
  );
  const daten = purBranch.daten;
  const probleme: IDatenmigrationsproblem[] = [];
  const branchName = trimString(daten.branchName);
  const addressName = trimString(daten.addressName);
  const anzeigename = branchName || addressName;
  const filialname = addressName || branchName;
  const legacyNummer = daten.branchNumber;
  const nummer =
    Number.isInteger(legacyNummer) && Number(legacyNummer) > 0
      ? Number(legacyNummer)
      : ersatzNummer;
  const adresse = mapAdresse(daten.address);

  if (!anzeigename) probleme.push(createProblem(quellPfad, 'Der Anzeigename fehlt.'));
  if (!filialname) probleme.push(createProblem(quellPfad, 'Der Filialname fehlt.'));
  if (!Number.isInteger(nummer) || Number(nummer) <= 0) {
    probleme.push(createProblem(quellPfad, 'Die Filialnummer fehlt oder ist ungültig.'));
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
      anzeigename,
      filialname,
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

// ===== Interne Helfer =======================

function mapAdresse(adresse: IPurBranchEintrag['daten']['address']): IFilialeAdresse {
  const strassenwert = trimString(adresse?.street);
  const geteilteStrasse = splitStrasse(strassenwert);
  const postleitzahl = normalizePostleitzahl(adresse?.postcode);
  const ort = trimString(adresse?.city);
  const ergebnis: IFilialeAdresse = {};

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
  return { typ: 'fehler', quellPfad, ursache };
}
