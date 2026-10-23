// pur-system/src/app/commons/utils/dienstplan/modellschicht-sortierung.ts

import { IModellschichtDaten } from '../../models/domain/schichtmodell';

type TSortierbareModellschicht = Pick<IModellschichtDaten, 'bezeichnung' | 'reihenfolge'> & {
  readonly id?: string;
};

/**
 * Vergleicht Modellschichten nach ihrer ausdrücklich gespeicherten Reihenfolge.
 *
 * Gleiche Reihenfolgen werden stabil nach Bezeichnung und optionaler ID geordnet.
 *
 * @param a - Erste zu vergleichende Modellschicht.
 * @param b - Zweite zu vergleichende Modellschicht.
 * @returns Negativer, positiver oder neutraler Sortierwert.
 */
export function compareModellschichtenNachReihenfolge(
  a: TSortierbareModellschicht,
  b: TSortierbareModellschicht,
): number {
  return (
    a.reihenfolge - b.reihenfolge ||
    a.bezeichnung.localeCompare(b.bezeichnung, 'de') ||
    (a.id ?? '').localeCompare(b.id ?? '')
  );
}
