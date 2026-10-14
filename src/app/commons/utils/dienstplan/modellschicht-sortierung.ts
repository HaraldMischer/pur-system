// pur-system/src/app/commons/utils/dienstplan/modellschicht-sortierung.ts

import { IModellschichtDaten } from '../../models/domain/schichtmodell';

type TSortierbareModellschicht = Pick<
  IModellschichtDaten,
  'bezeichnung' | 'beginnLokalzeit' | 'endeLokalzeit'
> & {
  readonly id?: string;
};

/**
 * Vergleicht Modellschichten chronologisch nach ihrer lokalen Beginnzeit.
 *
 * Gleiche Beginnzeiten werden stabil nach Ende, Bezeichnung und optionaler ID geordnet.
 *
 * @param a - Erste zu vergleichende Modellschicht.
 * @param b - Zweite zu vergleichende Modellschicht.
 * @returns Negativer, positiver oder neutraler Sortierwert.
 */
export function compareModellschichtenNachBeginn(
  a: TSortierbareModellschicht,
  b: TSortierbareModellschicht,
): number {
  return (
    a.beginnLokalzeit.localeCompare(b.beginnLokalzeit) ||
    a.endeLokalzeit.localeCompare(b.endeLokalzeit) ||
    a.bezeichnung.localeCompare(b.bezeichnung, 'de') ||
    (a.id ?? '').localeCompare(b.id ?? '')
  );
}
