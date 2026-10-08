// pur-system/src/app/commons/mapper/datenmigration/pur-customer-unternehmer.mapper.ts

import { FIRESTORE_DOCUMENT_PATHS } from '../../constants/firebase.constants';
import { IDatenmigrationsproblem } from '../../models/domain/datenmigration';
import { IUnternehmerAdresse, IUnternehmerDokument } from '../../models/domain/unternehmer';
import { IPurCustomerEintrag } from '../../models/legacy/pur-customer';

// ===== Konstanten & Typen ===================

export type TUnternehmerMigrationDaten = Omit<
  IUnternehmerDokument,
  'erstelltAm' | 'aktualisiertAm'
>;

export type TUnternehmerMappingErgebnis =
  | { daten: TUnternehmerMigrationDaten; probleme: [] }
  | { daten: null; probleme: IDatenmigrationsproblem[] };

// ===== Mapper ===============================

/**
 * Validiert und überführt einen Legacy-Kunden in die neue Unternehmerstruktur.
 *
 * @param purCustomer - Legacy-Kunde mit Dokument-ID und unveränderten Quelldaten.
 * @param nummer - Neu vergebene oder bereits vorhandene Unternehmernummer.
 * @returns Gemappte Unternehmerdaten oder die festgestellten Validierungsprobleme.
 */
export function mapPurCustomerToUnternehmer(
  purCustomer: IPurCustomerEintrag,
  nummer: number,
): TUnternehmerMappingErgebnis {
  const quellPfad = FIRESTORE_DOCUMENT_PATHS.purCustomer({
    purCustomerId: purCustomer.id,
  });
  const daten = purCustomer.daten;
  const probleme: IDatenmigrationsproblem[] = [];
  const anzeigenameVorname = trimString(daten.firstName);
  const anzeigenameNachname = trimString(daten.lastName);
  const anzeigename = `${anzeigenameVorname} ${anzeigenameNachname}`.trim();
  const vorname = anzeigenameVorname;
  const nachname = anzeigenameNachname;
  const strassenwert = trimString(daten.address?.street);
  const postleitzahl = trimString(daten.address?.postcode);
  const ort = trimString(daten.address?.city);
  const strasse = splitStrasse(strassenwert);
  const adresse: IUnternehmerAdresse = {};

  if (strasse) {
    adresse.strasse = strasse.strasse;
    adresse.hausnummer = strasse.hausnummer;
  } else if (strassenwert) {
    adresse.strasse = strassenwert;
  }
  if (postleitzahl) adresse.postleitzahl = postleitzahl;
  if (ort) adresse.ort = ort;

  if (daten.id && daten.id !== purCustomer.id) {
    probleme.push(createProblem(quellPfad, 'Die eingebettete Kunden-ID weicht vom Quellpfad ab.'));
  }
  if (!anzeigenameVorname || !anzeigenameNachname) {
    probleme.push(createProblem(quellPfad, 'Der Anzeigename fehlt.'));
  }
  if (!vorname) probleme.push(createProblem(quellPfad, 'Der Vorname fehlt.'));
  if (!nachname) probleme.push(createProblem(quellPfad, 'Der Nachname fehlt.'));
  if (trimString(daten.address?.addressName)) {
    probleme.push(
      createProblem(
        quellPfad,
        'Der vorhandene Adresszusatz besitzt noch kein festgelegtes Zielfeld.',
      ),
    );
  }
  if (probleme.length > 0) return { daten: null, probleme };

  const email = trimString(daten.contact?.email);
  const telefon = trimString(daten.contact?.landline);
  const mobil = trimString(daten.contact?.mobile);
  const geburtstag = trimString(daten.person?.birthday);

  return {
    daten: {
      anzeigename,
      nummer,
      aktiv: true,
      person: {
        vorname,
        nachname,
        ...(Object.keys(adresse).length > 0 ? { adresse } : {}),
        kontakt: {
          ...(email ? { email } : {}),
          ...(telefon ? { telefon } : {}),
          ...(mobil ? { mobil } : {}),
        },
        ...(geburtstag ? { geburtstag } : {}),
        ...(daten.person?.gender ? { geschlecht: daten.person.gender } : {}),
      },
    },
    probleme: [],
  };
}

// ===== Interne Helfer =======================

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
