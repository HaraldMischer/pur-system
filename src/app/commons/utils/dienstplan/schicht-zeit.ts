// pur-system/src/app/commons/utils/dienstplan/schicht-zeit.ts

import { ISchichtZeitdaten } from '../../models/domain/schicht';

export interface IArbeitsblock<TSchicht extends ISchichtZeitdaten = ISchichtZeitdaten> {
  schichten: readonly TSchicht[];
  beginn: TSchicht['beginn'];
  ende: TSchicht['ende'];
  arbeitszeitMinuten: number;
  pauseMinuten: number;
}

/**
 * Berechnet die Lohnzeit einer strukturell gültigen Schicht.
 *
 * @param schicht - Beginn und Ende der Schicht.
 * @returns Lohnzeit in ganzen Minuten.
 * @throws Wenn die Zeitwerte keine gültige Schicht ergeben.
 */
export function calculateSchichtLohnzeitMinuten(schicht: ISchichtZeitdaten): number {
  const dauerMillisekunden = schicht.ende.toMillis() - schicht.beginn.toMillis();
  const dauerMinuten = dauerMillisekunden / 60_000;
  if (dauerMillisekunden <= 0 || !Number.isInteger(dauerMinuten)) {
    throw new Error('Beginn und Ende ergeben keine gültige Schicht.');
  }
  return dauerMinuten;
}

/**
 * Gruppiert die Schichten eines Mitarbeiters und Dienstplantags in zusammenhängende Arbeitsblöcke.
 *
 * Direkt aufeinanderfolgende Schichten und Unterbrechungen unter 30 Minuten bilden einen Block.
 * Überschneidungen sind unzulässig. Lücken zählen nicht zur Arbeitszeit.
 *
 * @param schichten - Schichten eines Mitarbeiters am selben Dienstplantag.
 * @returns Chronologisch geordnete Arbeitsblöcke mit bezahlter Gesamtpause.
 */
export function calculateArbeitsbloecke<TSchicht extends ISchichtZeitdaten>(
  schichten: readonly TSchicht[],
): readonly IArbeitsblock<TSchicht>[] {
  const sortiert = [...schichten].sort((erste, zweite) => {
    return erste.beginn.toMillis() - zweite.beginn.toMillis();
  });
  const bloecke: IArbeitsblock<TSchicht>[] = [];
  for (const schicht of sortiert) {
    const dauerMinuten = calculateSchichtLohnzeitMinuten(schicht);
    const vorherigerBlock = bloecke.at(-1);
    if (!vorherigerBlock) {
      bloecke.push(createArbeitsblock(schicht, dauerMinuten));
      continue;
    }
    const lueckeMinuten = (schicht.beginn.toMillis() - vorherigerBlock.ende.toMillis()) / 60_000;
    if (lueckeMinuten < 0) {
      throw new Error('Schichten eines Mitarbeiters dürfen sich nicht überschneiden.');
    }
    if (lueckeMinuten >= 30) {
      bloecke.push(createArbeitsblock(schicht, dauerMinuten));
      continue;
    }
    const arbeitszeitMinuten = vorherigerBlock.arbeitszeitMinuten + dauerMinuten;
    bloecke[bloecke.length - 1] = {
      schichten: [...vorherigerBlock.schichten, schicht],
      beginn: vorherigerBlock.beginn,
      ende: schicht.ende,
      arbeitszeitMinuten,
      pauseMinuten: calculateArbeitsblockPauseMinuten(arbeitszeitMinuten),
    };
  }
  return bloecke;
}

function createArbeitsblock<TSchicht extends ISchichtZeitdaten>(
  schicht: TSchicht,
  arbeitszeitMinuten: number,
): IArbeitsblock<TSchicht> {
  return {
    schichten: [schicht],
    beginn: schicht.beginn,
    ende: schicht.ende,
    arbeitszeitMinuten,
    pauseMinuten: calculateArbeitsblockPauseMinuten(arbeitszeitMinuten),
  };
}

function calculateArbeitsblockPauseMinuten(arbeitszeitMinuten: number): number {
  if (arbeitszeitMinuten <= 6 * 60) return 0;
  return arbeitszeitMinuten <= 9 * 60 ? 30 : 45;
}
