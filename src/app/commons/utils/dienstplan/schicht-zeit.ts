// pur-system/src/app/commons/utils/dienstplan/schicht-zeit.ts

import { ISchichtAnlage } from '../../models/domain/schicht';

/**
 * Berechnet die anrechenbare Arbeitszeit einer strukturell gültigen Schicht.
 *
 * @param schicht - Beginn, Ende und Pause der Schicht.
 * @returns Anrechenbare Arbeitszeit in ganzen Minuten.
 * @throws Wenn Zeitwerte oder Pause keine gültige Schicht ergeben.
 */
export function calculateSchichtArbeitszeitMinuten(schicht: ISchichtAnlage): number {
  const dauerMillisekunden = schicht.ende.toMillis() - schicht.beginn.toMillis();
  const dauerMinuten = dauerMillisekunden / 60_000;
  if (
    dauerMillisekunden <= 0 ||
    !Number.isInteger(dauerMinuten) ||
    !Number.isInteger(schicht.pauseMinuten) ||
    schicht.pauseMinuten < 0 ||
    schicht.pauseMinuten >= dauerMinuten
  ) {
    throw new Error('Beginn, Ende und Pause ergeben keine gültige Schicht.');
  }
  return dauerMinuten - schicht.pauseMinuten;
}
