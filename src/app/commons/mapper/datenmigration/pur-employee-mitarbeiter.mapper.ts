// pur-system/src/app/commons/mapper/datenmigration/pur-employee-mitarbeiter.mapper.ts

import { FIRESTORE_DOCUMENT_PATHS } from '../../constants/firebase.constants';
import { IDatenmigrationsproblem } from '../../models/domain/datenmigration';
import { IMitarbeiterDokument, TMitarbeiterRolle } from '../../models/domain/mitarbeiter';
import { IPurEmployeeEintrag } from '../../models/legacy/pur-employee';

// ===== Konstanten & Typen ===================

export type TMitarbeiterMigrationDaten = Omit<
  IMitarbeiterDokument,
  'erstelltAm' | 'aktualisiertAm'
>;

export type TMitarbeiterMappingErgebnis =
  | { daten: TMitarbeiterMigrationDaten; probleme: [] }
  | { daten: null; probleme: IDatenmigrationsproblem[] };

// ===== Mapper ===============================

/**
 * Validiert und überführt einen Legacy-Filialmitarbeiter in die neue Mitarbeiterstruktur.
 *
 * @param purCustomerId - Dokument-ID des übergeordneten Legacy-Kunden.
 * @param purEmployee - Legacy-Mitarbeiter mit Firmen-, Filial- und Dokument-ID.
 * @param filialId - Zugeordnete Dokument-ID der neuen Filiale.
 * @returns Gemappte Mitarbeiterdaten oder die festgestellten Validierungsprobleme.
 */
export function mapPurEmployeeToMitarbeiter(
  purCustomerId: string,
  purEmployee: IPurEmployeeEintrag,
  filialId: string,
): TMitarbeiterMappingErgebnis {
  const quellPfad = FIRESTORE_DOCUMENT_PATHS.purEmployee(
    purCustomerId,
    purEmployee.purCompanyId,
    purEmployee.purBranchId,
    purEmployee.id,
  );
  const daten = purEmployee.daten;
  const probleme: IDatenmigrationsproblem[] = [];
  const vorname = trimString(daten.firstName);
  const nachname = trimString(daten.lastName);
  const anzeigename = `${vorname} ${nachname}`.trim();
  const rolle = mapRolle(daten.role);
  const aktiv = mapAktiv(daten.active);

  if (!vorname) probleme.push(createProblem(quellPfad, 'Der Vorname fehlt.'));
  if (!nachname) probleme.push(createProblem(quellPfad, 'Der Nachname fehlt.'));
  if (!rolle)
    probleme.push(createProblem(quellPfad, 'Die Mitarbeiterrolle fehlt oder ist unbekannt.'));
  if (aktiv === null) {
    probleme.push(createProblem(quellPfad, 'Der Aktivstatus fehlt oder ist ungültig.'));
  }
  if (probleme.length > 0) return { daten: null, probleme };

  const email = trimString(daten.email);
  const telefon = trimString(daten.phone?.fixedLineNumber);
  const mobil = trimString(daten.phone?.mobile);
  const geburtstag = trimString(daten.birthday);

  return {
    daten: {
      anzeigename,
      person: {
        vorname,
        nachname,
        adresse: mapAdresse(daten.address),
        kontakt: {
          ...(email ? { email } : {}),
          ...(telefon ? { telefon } : {}),
          ...(mobil ? { mobil } : {}),
        },
        ...(geburtstag ? { geburtstag } : {}),
      },
      rolle: rolle as TMitarbeiterRolle,
      filialIds: [filialId],
      aktiv: aktiv === true && daten.deleted !== true,
    },
    probleme: [],
  };
}

// ===== Interne Helfer =======================

function mapAdresse(adresse: IPurEmployeeEintrag['daten']['address']) {
  const strassenwert = trimString(adresse?.street);
  const geteilteStrasse = splitStrasse(strassenwert);

  return {
    strasse: geteilteStrasse?.strasse ?? strassenwert,
    hausnummer: geteilteStrasse?.hausnummer ?? '',
    postleitzahl: normalizePostleitzahl(adresse?.postcode),
    ort: trimString(adresse?.city),
  };
}

function mapRolle(value: unknown): TMitarbeiterRolle | null {
  const rolle = trimString(value).toLocaleLowerCase('de');
  if (rolle === 'service') return 'service';
  if (rolle === 'techniker' || rolle === 'kassierer' || rolle === 'administrator') {
    return 'admin';
  }
  return null;
}

function mapAktiv(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'boolean') {
    return value[0];
  }
  return null;
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
