// pur-system/src/app/commons/utils/filialeinstellung/schliesszeitraum.ts

import {
  IGeoeffneteOeffnungsregel,
  ISchliesszeitraum,
  TOeffnungsregel,
} from '../../models/domain/filialeinstellung';

// ===== Konstanten & Typen ===================

const LOKALZEIT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MINUTEN_PRO_TAG = 24 * 60;

// ===== Öffentliche Aktionen =================

/**
 * Prüft die vollständige Zeitfolge eines täglich geltenden Schließzeitraums.
 */
export function isGueltigerSchliesszeitraum(
  schliesszeitraum: ISchliesszeitraum | null | undefined,
): schliesszeitraum is ISchliesszeitraum {
  return (
    schliesszeitraum !== null &&
    schliesszeitraum !== undefined &&
    isGueltigeZeitfolge(schliesszeitraum)
  );
}

/**
 * Leitet den größtmöglichen täglichen Öffnungsrahmen als Komplement des Schließzeitraums ab.
 */
export function getMaximalerOeffnungsrahmen(
  schliesszeitraum: ISchliesszeitraum,
): IGeoeffneteOeffnungsregel {
  if (!isGueltigerSchliesszeitraum(schliesszeitraum)) {
    throw new Error('Der Schließzeitraum enthält keine gültige Zeitfolge.');
  }
  return {
    geoeffnet: true,
    beginnLokalzeit: schliesszeitraum.endeLokalzeit,
    endeLokalzeit: schliesszeitraum.beginnLokalzeit,
    endetAmFolgetag: !schliesszeitraum.endetAmFolgetag,
  };
}

/**
 * Prüft, ob eine geöffnete Regel vollständig im maximalen Öffnungsrahmen liegt.
 */
export function isOeffnungsregelInnerhalbOeffnungsrahmen(
  oeffnungsregel: TOeffnungsregel,
  schliesszeitraum: ISchliesszeitraum,
): boolean {
  if (!oeffnungsregel.geoeffnet) return true;
  if (!isGueltigeZeitfolge(oeffnungsregel)) return false;
  const oeffnungsrahmen = getMaximalerOeffnungsrahmen(schliesszeitraum);
  const rahmenBeginn = getMinuten(oeffnungsrahmen.beginnLokalzeit);
  const rahmenEnde = getAbsolutesEnde(oeffnungsrahmen, rahmenBeginn);
  const regelBeginn = getMinuten(oeffnungsregel.beginnLokalzeit);
  const regelEnde = getAbsolutesEnde(oeffnungsregel, regelBeginn);
  return regelBeginn >= rahmenBeginn && regelEnde <= rahmenEnde;
}

// ===== Interne Helfer =======================

interface IZeitfolge {
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
}

function isGueltigeZeitfolge(zeitfolge: IZeitfolge): boolean {
  return (
    LOKALZEIT_PATTERN.test(zeitfolge.beginnLokalzeit) &&
    LOKALZEIT_PATTERN.test(zeitfolge.endeLokalzeit) &&
    zeitfolge.beginnLokalzeit !== zeitfolge.endeLokalzeit &&
    zeitfolge.endetAmFolgetag === zeitfolge.endeLokalzeit < zeitfolge.beginnLokalzeit
  );
}

function getMinuten(lokalzeit: string): number {
  const [stunden, minuten] = lokalzeit.split(':').map(Number);
  return stunden * 60 + minuten;
}

function getAbsolutesEnde(zeitfolge: IZeitfolge, beginn: number): number {
  const ende = getMinuten(zeitfolge.endeLokalzeit);
  if (zeitfolge.endetAmFolgetag) return ende + MINUTEN_PRO_TAG;
  return Math.max(ende, beginn);
}
