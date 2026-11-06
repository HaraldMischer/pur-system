// pur-system/src/app/commons/validators/schicht-tagesmodell.validator.ts

import { MAX_RANDMINUTEN } from '../constants/schichtmodell.constants';
import type { IGeoeffneteOeffnungsregel } from '../models/domain/filialeinstellung';
import type {
  ITagesvorlagenschichtSchreibdaten,
  ITagesvorlagenschichtZeitgrenze,
  TTagesvorlageTyp,
} from '../models/domain/schicht-tagesmodell';

const MINUTEN_PRO_TAG = 24 * 60;
const LOKALZEIT_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Prüft beide Vorlagen eines Schicht-Tagesmodells einschließlich ihrer Öffnungsgrenzen.
 *
 * @param schichten - Sämtliche Schichten der Wochentags- und Sonntagsvorlage.
 * @param oeffnungen - Maßgebliche Öffnung je Tagesvorlage.
 */
export function assertGueltigeTagesvorlagenschichten(
  schichten: readonly ITagesvorlagenschichtSchreibdaten[],
  oeffnungen: Readonly<Record<TTagesvorlageTyp, IGeoeffneteOeffnungsregel>>,
): void {
  (['wochentag', 'sonntag'] as const).forEach((vorlage) => {
    const vorlagenschichten = schichten
      .filter((schicht) => schicht.vorlage === vorlage)
      .sort((a, b) => a.reihenfolge - b.reihenfolge);
    if (vorlagenschichten.length === 0) {
      throw new Error(
        vorlage === 'wochentag'
          ? 'Die Wochentagsvorlage benötigt mindestens eine Schicht.'
          : 'Die Sonntagsvorlage benötigt mindestens eine Schicht.',
      );
    }
    assertVorlage(vorlagenschichten, oeffnungen[vorlage]);
  });
}

/**
 * Prüft eine konkrete Tagesstruktur gegen ihre wirksame Öffnung.
 *
 * @param schichten - Schichten des konkreten Tages.
 * @param oeffnung - Wirksame Öffnung des konkreten Tages.
 */
export function assertGueltigeTagesstruktur(
  schichten: readonly Omit<ITagesvorlagenschichtSchreibdaten, 'vorlage'>[],
  oeffnung: IGeoeffneteOeffnungsregel,
): void {
  if (schichten.length === 0) {
    throw new Error('Ein geöffneter Tag benötigt mindestens eine Schicht.');
  }
  assertVorlage(
    schichten.map((schicht) => ({ ...schicht, vorlage: 'wochentag' as const })),
    oeffnung,
  );
}

function assertVorlage(
  schichten: readonly ITagesvorlagenschichtSchreibdaten[],
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

function parseZeitgrenze(zeitgrenze: ITagesvorlagenschichtZeitgrenze): number {
  if (zeitgrenze.tag !== 'starttag' && zeitgrenze.tag !== 'folgetag') {
    throw new Error('Die Tagesschicht enthält eine ungültige Tageszuordnung.');
  }
  return (
    parseLokalzeit(zeitgrenze.lokalzeit) + (zeitgrenze.tag === 'folgetag' ? MINUTEN_PRO_TAG : 0)
  );
}

function parseLokalzeit(lokalzeit: string): number {
  if (!LOKALZEIT_PATTERN.test(lokalzeit)) {
    throw new Error('Die Tagesschicht enthält eine ungültige Lokalzeit.');
  }
  const [stunden, minuten] = lokalzeit.split(':').map(Number);
  return stunden * 60 + minuten;
}

function assertRandminuten(minuten: number): void {
  if (!Number.isInteger(minuten) || minuten < 0 || minuten > MAX_RANDMINUTEN) {
    throw new Error('Vor- und Nachbereitungsminuten müssen ganze Zahlen von 0 bis 999 sein.');
  }
}
