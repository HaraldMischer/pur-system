// pur-system/src/app/commons/utils/dienstplan/schicht-lokalzeit.ts

import { Timestamp } from 'firebase/firestore';

type TSchichtLokalzeiten = {
  readonly beginnLokalzeit: string;
  readonly endeLokalzeit: string;
  readonly endetAmFolgetag: boolean;
};

export interface ISchichtZeitstempel {
  readonly beginn: Timestamp;
  readonly ende: Timestamp;
}

/**
 * Wandelt eine lokale Uhrzeit in die seit Tagesbeginn vergangenen Minuten um.
 *
 * @param lokalzeit - Lokale Uhrzeit im Format `HH:mm`.
 * @returns Minuten seit Tagesbeginn oder `null` bei einer ungültigen Uhrzeit.
 */
export function getLokalzeitMinuten(lokalzeit: string): number | null {
  const treffer = /^(\d{2}):(\d{2})$/.exec(lokalzeit);
  if (!treffer) return null;
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  return stunden <= 23 && minuten <= 59 ? stunden * 60 + minuten : null;
}

/**
 * Verschiebt eine lokale Uhrzeit um eine Anzahl Minuten und formatiert sie wieder als `HH:mm`.
 *
 * @param lokalzeit - Lokale Uhrzeit im Format `HH:mm`.
 * @param versatzMinuten - Positiver oder negativer Minutenversatz.
 * @returns Verschobene Uhrzeit oder `null` bei einer ungültigen Uhrzeit beziehungsweise mehr als einem Tagesversatz.
 */
export function addLokalzeitMinuten(lokalzeit: string, versatzMinuten: number): string | null {
  const minuten = getLokalzeitMinuten(lokalzeit);
  const ergebnis = minuten === null ? null : minuten + versatzMinuten;
  if (ergebnis === null || !Number.isInteger(versatzMinuten) || ergebnis < 0 || ergebnis >= 2880) {
    return null;
  }
  const minutenImTag = ergebnis % 1440;
  return `${String(Math.floor(minutenImTag / 60)).padStart(2, '0')}:${String(minutenImTag % 60).padStart(2, '0')}`;
}

/**
 * Berechnet die Dauer zwischen zwei lokalen Schichtzeiten.
 *
 * Ein Ende vor dem Beginn wird als Ende am Folgetag behandelt.
 *
 * @param beginn - Lokale Beginnzeit im Format `HH:mm`.
 * @param ende - Lokale Endzeit im Format `HH:mm`.
 * @returns Schichtdauer in Minuten oder `null` bei ungültigen beziehungsweise gleichen Zeiten.
 */
export function calculateSchichtdauerMinuten(beginn: string, ende: string): number | null {
  const beginnMinuten = getLokalzeitMinuten(beginn);
  const endeMinuten = getLokalzeitMinuten(ende);
  if (beginnMinuten === null || endeMinuten === null || beginnMinuten === endeMinuten) return null;
  return endeMinuten + (endeMinuten < beginnMinuten ? 24 * 60 : 0) - beginnMinuten;
}

/**
 * Erzeugt absolute Zeitpunkte aus einem Datum und lokalen Schichtzeiten.
 *
 * @param datum - Lokales Schichtdatum im Format `YYYY-MM-DD`.
 * @param lokalzeiten - Beginn, Ende und Folgetagsangabe der Modellschicht.
 * @param zeitzone - IANA-Zeitzone des Dienstplans.
 * @returns Absolute Zeitstempel für Beginn und Ende.
 */
export function createSchichtZeitstempelAusLokalzeiten(
  datum: string,
  lokalzeiten: TSchichtLokalzeiten,
  zeitzone: string,
): ISchichtZeitstempel {
  const endeDatum = lokalzeiten.endetAmFolgetag ? addKalendertag(datum) : datum;
  return {
    beginn: createSchichtZeitstempel(datum, lokalzeiten.beginnLokalzeit, zeitzone),
    ende: createSchichtZeitstempel(endeDatum, lokalzeiten.endeLokalzeit, zeitzone),
  };
}

export function createSchichtZeitstempel(
  datum: string,
  uhrzeit: string,
  zeitzone: string,
): Timestamp {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum);
  const zeitMatch = /^(\d{2}):(\d{2})$/.exec(uhrzeit);
  if (!match || !zeitMatch) throw new Error('Datum oder Uhrzeit ist ungültig.');
  const ziel = Date.UTC(+match[1], +match[2] - 1, +match[3], +zeitMatch[1], +zeitMatch[2]);
  let millis = ziel;
  for (let index = 0; index < 3; index += 1) {
    const teile = getLokaleTeile(new Date(millis), zeitzone);
    const lokalAlsUtc = Date.UTC(
      teile.jahr,
      teile.monat - 1,
      teile.tag,
      teile.stunde,
      teile.minute,
    );
    millis += ziel - lokalAlsUtc;
  }
  const ergebnis = getLokaleTeile(new Date(millis), zeitzone);
  if (
    ergebnis.jahr !== +match[1] ||
    ergebnis.monat !== +match[2] ||
    ergebnis.tag !== +match[3] ||
    ergebnis.stunde !== +zeitMatch[1] ||
    ergebnis.minute !== +zeitMatch[2]
  ) {
    throw new Error('Die lokale Uhrzeit existiert in der gewählten Zeitzone nicht.');
  }
  return Timestamp.fromMillis(millis);
}

export function formatSchichtDatum(timestamp: Timestamp, zeitzone: string): string {
  const teile = getLokaleTeile(timestamp.toDate(), zeitzone);
  return `${teile.jahr}-${String(teile.monat).padStart(2, '0')}-${String(teile.tag).padStart(2, '0')}`;
}

export function formatSchichtUhrzeit(timestamp: Timestamp, zeitzone: string): string {
  const teile = getLokaleTeile(timestamp.toDate(), zeitzone);
  return `${String(teile.stunde).padStart(2, '0')}:${String(teile.minute).padStart(2, '0')}`;
}

export function addKalendertag(datum: string): string {
  const wert = new Date(`${datum}T12:00:00Z`);
  wert.setUTCDate(wert.getUTCDate() + 1);
  return wert.toISOString().slice(0, 10);
}

function getLokaleTeile(datum: Date, zeitzone: string) {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: zeitzone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(datum);
  const wert = (typ: Intl.DateTimeFormatPartTypes): number => {
    return Number(teile.find((teil) => teil.type === typ)?.value);
  };
  return {
    jahr: wert('year'),
    monat: wert('month'),
    tag: wert('day'),
    stunde: wert('hour'),
    minute: wert('minute'),
  };
}
