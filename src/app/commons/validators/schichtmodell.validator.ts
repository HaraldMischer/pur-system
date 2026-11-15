// pur-system/src/app/commons/validators/schichtmodell.validator.ts

import { MAX_RANDMINUTEN } from '../constants/schicht.constants';
import { ZEITRASTER_MINUTEN } from '../constants/zeit.constants';
import type { IGeoeffneteOeffnungsregel } from '../models/domain/filialeinstellung';
import type {
  ISchichtmodellBestand,
  ISchichtmodellRandzeiten,
  ITagesvorlagenschichtSchreibdaten,
  ITagesvorlagenschichtZeitgrenze,
  TTagesstrukturSchichtSchreibdaten,
} from '../models/domain/schichtmodell';
import { resolveTagesvorlagenschichten } from '../utils/dienstplan/tagesvorlagenschichten';
import { getLokalzeitMinuten } from '../utils/dienstplan/schicht-lokalzeit';
import type { ISchichtmodellVorlage } from '../utils/dienstplan/schichtmodell-vorlagen';

const MINUTEN_PRO_TAG = 24 * 60;

/**
 * Prüft alle erforderlichen Vorlagen eines Schichtmodells einschließlich ihrer Öffnungsgrenzen.
 *
 * @param schichten - Sämtliche Schichten der Modellvorlagen.
 * @param vorlagen - Aktuell erforderliche Vorlagen mit ihrer maßgeblichen Öffnung.
 * @param randzeiten - Modellweit gültige Vor- und Nachbereitungsminuten.
 */
export function assertGueltigeTagesvorlagenschichten(
  schichten: readonly ITagesvorlagenschichtSchreibdaten[],
  vorlagen: readonly ISchichtmodellVorlage[],
  randzeiten: ISchichtmodellRandzeiten,
): void {
  assertRandminuten(randzeiten.vorbereitungsminuten);
  assertRandminuten(randzeiten.nachbereitungsminuten);
  const erforderlicheVorlagen = new Set(vorlagen.map((vorlage) => vorlage.vorlage));
  if (schichten.some((schicht) => !erforderlicheVorlagen.has(schicht.vorlage))) {
    throw new Error('Das Schichtmodell enthält eine nicht mehr erforderliche Tagesvorlage.');
  }
  vorlagen.forEach((definition) => {
    const vorlage = definition.vorlage;
    const vorlagenschichten = schichten
      .filter((schicht) => schicht.vorlage === vorlage)
      .sort((a, b) => a.reihenfolge - b.reihenfolge);
    if (vorlagenschichten.length === 0) {
      throw new Error(
        `Die Tagesvorlage „${definition.bezeichnung}“ benötigt mindestens eine Schicht.`,
      );
    }
    assertVorlagengrenzen(vorlagenschichten);
    const aufgeloesteSchichten = resolveTagesvorlagenschichten(
      vorlagenschichten,
      definition.oeffnung,
      randzeiten,
    );
    assertTagesstruktur(aufgeloesteSchichten, definition.oeffnung);
  });
}

/**
 * Prüft, ob ein gespeichertes Schichtmodell für alle aktuell erforderlichen Vorlagen verwendbar ist.
 */
export function isSchichtmodellGueltig(
  bestand: ISchichtmodellBestand,
  vorlagen: readonly ISchichtmodellVorlage[],
): boolean {
  try {
    assertGueltigeTagesvorlagenschichten(
      bestand.tagesvorlagenschichten,
      vorlagen,
      bestand.schichtmodell,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Prüft eine konkrete Tagesstruktur gegen ihre wirksame Öffnung.
 *
 * @param schichten - Schichten des konkreten Tages.
 * @param oeffnung - Wirksame Öffnung des konkreten Tages.
 */
export function assertGueltigeTagesstruktur(
  schichten: readonly TTagesstrukturSchichtSchreibdaten[],
  oeffnung: IGeoeffneteOeffnungsregel,
): void {
  if (schichten.length === 0) {
    throw new Error('Ein geöffneter Tag benötigt mindestens eine Schicht.');
  }
  assertTagesstruktur(schichten, oeffnung);
}

function assertTagesstruktur(
  schichten: readonly TTagesstrukturSchichtSchreibdaten[],
  oeffnung: IGeoeffneteOeffnungsregel,
): void {
  const oeffnungsbeginn = parseLokalzeit(oeffnung.beginnLokalzeit);
  const oeffnungsende =
    parseLokalzeit(oeffnung.endeLokalzeit) + (oeffnung.endetAmFolgetag ? MINUTEN_PRO_TAG : 0);
  const ids = new Set<string>();
  schichten.forEach((schicht, index) => {
    if (schicht.reihenfolge !== index) {
      throw new Error('Die Reihenfolge der Tagesschichten muss lückenlos sein.');
    }
    if (schicht.id && ids.has(schicht.id)) {
      throw new Error('Die IDs der Tagesschichten müssen eindeutig sein.');
    }
    if (schicht.id) ids.add(schicht.id);
    if (!schicht.bezeichnung.trim()) {
      throw new Error('Die Tagesschicht benötigt eine Bezeichnung.');
    }
    const beginn = parseZeitgrenze(schicht.beginn);
    const ende = parseZeitgrenze(schicht.ende);
    if (beginn < oeffnungsbeginn || ende > oeffnungsende || ende <= beginn) {
      throw new Error('Die Kernzeit der Tagesschicht muss innerhalb der Öffnung liegen.');
    }
    assertRandminuten(schicht.vorbereitungsminuten);
    assertRandminuten(schicht.nachbereitungsminuten);
    if (typeof schicht.mehrfachbelegungErlaubt !== 'boolean') {
      throw new Error('Die Mehrfachbelegung der Tagesschicht ist ungültig.');
    }
  });
}

function assertVorlagengrenzen(schichten: readonly ITagesvorlagenschichtSchreibdaten[]): void {
  const letzterIndex = schichten.length - 1;
  schichten.forEach((schicht, index) => {
    const istErsteSchicht = index === 0;
    const istLetzteSchicht = index === letzterIndex;
    if (istErsteSchicht === Boolean(schicht.beginn)) {
      throw new Error(
        istErsteSchicht
          ? 'Die erste Tagesschicht darf keinen festen Beginn enthalten.'
          : 'Die Tagesschicht benötigt einen festen Beginn.',
      );
    }
    if (istLetzteSchicht === Boolean(schicht.ende)) {
      throw new Error(
        istLetzteSchicht
          ? 'Die letzte Tagesschicht darf kein festes Ende enthalten.'
          : 'Die Tagesschicht benötigt ein festes Ende.',
      );
    }
  });
}

function parseZeitgrenze(zeitgrenze: ITagesvorlagenschichtZeitgrenze): number {
  if (zeitgrenze.tag !== 'starttag' && zeitgrenze.tag !== 'folgetag') {
    throw new Error('Die Tagesschicht enthält eine ungültige Tageszuordnung.');
  }
  return (
    parseLokalzeit(zeitgrenze.lokalzeit) + (zeitgrenze.tag === 'folgetag' ? MINUTEN_PRO_TAG : 0)
  );
}

function parseLokalzeit(lokalzeit: string): number {
  const minuten = getLokalzeitMinuten(lokalzeit);
  if (minuten === null) {
    throw new Error('Die Tagesschicht enthält eine ungültige Lokalzeit.');
  }
  if (minuten % ZEITRASTER_MINUTEN !== 0) {
    throw new Error('Die Lokalzeit der Tagesschicht muss im 15-Minuten-Raster liegen.');
  }
  return minuten;
}

function assertRandminuten(minuten: number): void {
  if (!Number.isInteger(minuten) || minuten < 0 || minuten > MAX_RANDMINUTEN) {
    throw new Error('Vor- und Nachbereitungsminuten müssen ganze Zahlen von 0 bis 999 sein.');
  }
}
