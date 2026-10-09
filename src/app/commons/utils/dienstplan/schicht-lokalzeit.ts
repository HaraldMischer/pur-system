// pur-system/src/app/commons/utils/dienstplan/schicht-lokalzeit.ts

import { Timestamp } from 'firebase/firestore';

import { ISchichtvorlageAnlage } from '../../models/domain/schichtvorlage';

export interface ISchichtZeitstempel {
  readonly beginn: Timestamp;
  readonly ende: Timestamp;
}

/**
 * Erzeugt die absoluten Zeitpunkte einer Schicht aus Datum und Vorlagenzeiten.
 *
 * @param datum - Lokales Schichtdatum im Format `YYYY-MM-DD`.
 * @param vorlage - Beginn, Ende und Folgetagsangabe der Schichtvorlage.
 * @param zeitzone - IANA-Zeitzone des Dienstplans.
 * @returns Absolute Zeitstempel für Beginn und Ende.
 */
export function createSchichtZeitstempelAusVorlage(
  datum: string,
  vorlage: Pick<ISchichtvorlageAnlage, 'beginnLokalzeit' | 'endeLokalzeit' | 'endetAmFolgetag'>,
  zeitzone: string,
): ISchichtZeitstempel {
  const endeDatum = vorlage.endetAmFolgetag ? addKalendertag(datum) : datum;
  return {
    beginn: createSchichtZeitstempel(datum, vorlage.beginnLokalzeit, zeitzone),
    ende: createSchichtZeitstempel(endeDatum, vorlage.endeLokalzeit, zeitzone),
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
