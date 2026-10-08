// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-namensaehnlichkeit.ts

import { IPerson } from '../../models/domain/person';

const MINDEST_AEHNLICHKEIT_VOLLSTAENDIGER_NAME = 0.7;
const MINDEST_AEHNLICHKEIT_VORNAME = 0.5;
const MINDEST_AEHNLICHKEIT_NACHNAME = 0.6;
const MINDEST_AEHNLICHKEIT_EINZELNER_NAME = 0.9;

type TMitarbeiterName = Pick<IPerson, 'vorname' | 'nachname'>;

/**
 * Prüft, ob zwei Mitarbeiternamen ähnlich genug für eine mögliche Zusammenführung sind.
 *
 * @param quelle - Name des als Duplikat betrachteten Mitarbeiters.
 * @param ziel - Name eines möglichen Zielmitarbeiters.
 * @returns `true`, wenn die vergleichbaren Namensbestandteile den Grenzwert erreichen.
 */
export function istAehnlicherMitarbeiterName(
  quelle: TMitarbeiterName,
  ziel: TMitarbeiterName,
): boolean {
  const quellVorname = normalizeName(quelle.vorname);
  const zielVorname = normalizeName(ziel.vorname);
  const quellNachname = normalizeName(quelle.nachname);
  const zielNachname = normalizeName(ziel.nachname);
  const vornameAehnlichkeit =
    quellVorname && zielVorname ? getTextAehnlichkeit(quellVorname, zielVorname) : null;
  const nachnameAehnlichkeit =
    quellNachname && zielNachname ? getTextAehnlichkeit(quellNachname, zielNachname) : null;

  if (vornameAehnlichkeit !== null && nachnameAehnlichkeit !== null) {
    const durchschnitt = (vornameAehnlichkeit + nachnameAehnlichkeit) / 2;
    return (
      vornameAehnlichkeit >= MINDEST_AEHNLICHKEIT_VORNAME &&
      nachnameAehnlichkeit >= MINDEST_AEHNLICHKEIT_NACHNAME &&
      durchschnitt >= MINDEST_AEHNLICHKEIT_VOLLSTAENDIGER_NAME
    );
  }
  const einzelneAehnlichkeit = vornameAehnlichkeit ?? nachnameAehnlichkeit;
  return (
    einzelneAehnlichkeit !== null && einzelneAehnlichkeit >= MINDEST_AEHNLICHKEIT_EINZELNER_NAME
  );
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase('de')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function getTextAehnlichkeit(quelle: string, ziel: string): number {
  if (quelle === ziel) return 1;
  const laengsteLaenge = Math.max(quelle.length, ziel.length);
  if (laengsteLaenge === 0) return 1;
  return 1 - getLevenshteinDistanz(quelle, ziel) / laengsteLaenge;
}

function getLevenshteinDistanz(quelle: string, ziel: string): number {
  let vorherigeZeile = Array.from({ length: ziel.length + 1 }, (_, index) => {
    return index;
  });

  for (let quellIndex = 1; quellIndex <= quelle.length; quellIndex += 1) {
    const aktuelleZeile = [quellIndex];
    for (let zielIndex = 1; zielIndex <= ziel.length; zielIndex += 1) {
      const ersetzungskosten = quelle[quellIndex - 1] === ziel[zielIndex - 1] ? 0 : 1;
      aktuelleZeile[zielIndex] = Math.min(
        aktuelleZeile[zielIndex - 1] + 1,
        vorherigeZeile[zielIndex] + 1,
        vorherigeZeile[zielIndex - 1] + ersetzungskosten,
      );
    }
    vorherigeZeile = aktuelleZeile;
  }

  return vorherigeZeile[ziel.length];
}
