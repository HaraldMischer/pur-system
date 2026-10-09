// pur-system/src/app/commons/utils/dienstplan/dienstplan-zeitraum.ts

import { IDienstplanAnlage } from '../../models/domain/dienstplan';

const MONAT_FORMAT = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * Erstellt den vollständigen lokalen Kalendermonat eines Dienstplans.
 *
 * @param monat - Monat im Format `YYYY-MM`.
 * @returns Zeitraum mit erstem und letztem Kalendertag in der verbindlichen Zeitzone.
 * @throws Wenn der Monatsbezeichner ungültig ist.
 */
export function createDienstplanZeitraum(monat: string): IDienstplanAnlage {
  const treffer = MONAT_FORMAT.exec(monat);
  if (!treffer) {
    throw new Error('Der Dienstplanmonat muss dem Format YYYY-MM entsprechen.');
  }

  const jahr = Number(treffer[1]);
  const monatsnummer = Number(treffer[2]);
  const letzterTag = getLetzterTag(jahr, monatsnummer);
  return {
    zeitraumStart: `${monat}-01`,
    zeitraumEnde: `${monat}-${String(letzterTag).padStart(2, '0')}`,
    zeitzone: 'Europe/Berlin',
  };
}

function getLetzterTag(jahr: number, monatsnummer: number): number {
  if (monatsnummer === 2) {
    const istSchaltjahr = jahr % 4 === 0 && (jahr % 100 !== 0 || jahr % 400 === 0);
    return istSchaltjahr ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(monatsnummer) ? 30 : 31;
}
