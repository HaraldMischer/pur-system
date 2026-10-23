// pur-system/src/app/commons/utils/dienstplan/mitarbeiterbelegung.ts

import { Timestamp } from 'firebase/firestore';

import type { IDienstplanVersionPfad } from '../../models/app/firestore-pfad.types';
import type { TDienstplanVersionStatus } from '../../models/domain/dienstplan';
import type {
  IMitarbeiterbelegungDokument,
  IMitarbeiterbelegungReferenz,
} from '../../models/domain/mitarbeiterbelegung';
import type { ISchichtDaten, ISchichtZeitdaten } from '../../models/domain/schicht';
import { addKalendertag, formatSchichtDatum } from './schicht-lokalzeit';
import { calculateArbeitsbloecke, calculateSchichtLohnzeitMinuten } from './schicht-zeit';

const DATUM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type TMitarbeiterbelegungKonfliktart =
  'ungueltige-zeitfolge' | 'ueberschneidung' | 'ungueltige-pause';

export interface IMitarbeiterbelegungKonflikt {
  readonly art: TMitarbeiterbelegungKonfliktart;
  readonly schwere: 'blockierend';
  readonly meldung: string;
  readonly belegungen: readonly IMitarbeiterbelegungReferenz[];
}

export interface IMitarbeiterbelegungPausenzuordnung {
  readonly belegung: IMitarbeiterbelegungReferenz;
  readonly pauseMinuten: number;
}

/**
 * Liefert die Kalendertage eines Planungszeitraums einschließlich eines angrenzenden Tages auf beiden Seiten.
 *
 * Dadurch stehen auch Belegungen bereit, die wegen Vor- oder Nachbereitung beziehungsweise eines Verlaufs über Mitternacht
 * eine Monatsgrenze berühren.
 *
 * @param zeitraumStart - Erster lokaler Kalendertag des Planungszeitraums.
 * @param zeitraumEnde - Letzter lokaler Kalendertag des Planungszeitraums.
 * @returns Chronologisch geordnete lokale Kalendertage einschließlich der beiden Randtage.
 */
export function getMitarbeiterbelegungZeitraumTage(
  zeitraumStart: string,
  zeitraumEnde: string,
): readonly string[] {
  if (!DATUM_PATTERN.test(zeitraumStart) || !DATUM_PATTERN.test(zeitraumEnde)) {
    throw new Error('Der Belegungszeitraum enthält kein gültiges Kalenderdatum.');
  }
  const ersterTag = verschiebeKalendertag(zeitraumStart, -1);
  const letzterTag = verschiebeKalendertag(zeitraumEnde, 1);
  if (ersterTag > letzterTag) {
    throw new Error('Der Belegungszeitraum besitzt keine gültige Datumsfolge.');
  }
  const tage: string[] = [];
  for (let datum = ersterTag; datum <= letzterTag; datum = addKalendertag(datum)) {
    tage.push(datum);
  }
  return tage;
}

/**
 * Erzeugt die deterministische Dokument-ID eines Mitarbeiters und Kalendertags.
 *
 * @param mitarbeiterId - ID des Mitarbeiters innerhalb der Firma.
 * @param datum - Lokales Kalenderdatum im Format `YYYY-MM-DD`.
 * @returns Dokument-ID des firmenweiten Belegungstags.
 */
export function createMitarbeiterbelegungId(mitarbeiterId: string, datum: string): string {
  if (!mitarbeiterId || mitarbeiterId.includes('/') || !DATUM_PATTERN.test(datum)) {
    throw new Error('Mitarbeiter oder Datum der Belegung sind ungültig.');
  }
  return `${mitarbeiterId}__${datum}`;
}

/**
 * Liefert alle lokalen Kalendertage, die eine Schicht zeitlich berührt.
 *
 * Das Schichtende wird exklusiv behandelt. Eine genau um Mitternacht endende Schicht erzeugt deshalb keinen zusätzlichen
 * Belegungstag.
 *
 * @param schicht - Absolute Beginn- und Endzeit der Schicht.
 * @param zeitzone - IANA-Zeitzone des Dienstplans.
 * @returns Chronologisch geordnete lokale Kalendertage.
 */
export function getMitarbeiterbelegungTage(
  schicht: ISchichtZeitdaten,
  zeitzone: string,
): readonly string[] {
  if (schicht.ende.toMillis() <= schicht.beginn.toMillis()) {
    throw new Error('Beginn und Ende ergeben keine gültige Schicht.');
  }
  const ersterTag = formatSchichtDatum(schicht.beginn, zeitzone);
  const letzterTag = formatSchichtDatum(
    Timestamp.fromMillis(schicht.ende.toMillis() - 1),
    zeitzone,
  );
  const tage: string[] = [];
  for (let datum = ersterTag; datum <= letzterTag; datum = addKalendertag(datum)) {
    tage.push(datum);
  }
  return tage;
}

/**
 * Erzeugt die auf eine konkrete Dienstplanschicht zurückführbare Indexreferenz.
 *
 * @param pfad - Vollständiger Pfad der Dienstplanversion.
 * @param schichtId - ID der konkreten Schicht.
 * @param status - Planungsstatus der Version.
 * @param schicht - Fachliche Daten der konkreten Schicht.
 * @returns Vollständige Belegungsreferenz für den Firmenindex.
 */
export function createMitarbeiterbelegungReferenz(
  pfad: IDienstplanVersionPfad,
  schichtId: string,
  status: TDienstplanVersionStatus,
  schicht: ISchichtDaten,
): IMitarbeiterbelegungReferenz {
  return {
    datum: schicht.datum,
    mitarbeiterId: schicht.mitarbeiterId,
    filialeId: pfad.filialeId,
    dienstplanId: pfad.dienstplanId,
    versionId: pfad.versionId,
    schichtId,
    status,
    beginn: schicht.beginn,
    ende: schicht.ende,
    pauseMinuten: schicht.pauseMinuten ?? 0,
  };
}

/**
 * Reduziert Indexreferenzen auf die für Planung und Konfliktprüfung relevanten Versionsstände.
 *
 * Archivierte Versionen werden ignoriert. Existiert für denselben Filialdienstplan ein Entwurf, ersetzt er dessen
 * veröffentlichten Stand in der Berechnung. Mehrfach indexierte Referenzen werden zusammengeführt.
 *
 * @param belegungen - Belegungsreferenzen aus einem oder mehreren Tagesdokumenten.
 * @returns Eindeutige, relevante Belegungsreferenzen.
 */
export function getRelevanteMitarbeiterbelegungen(
  belegungen: readonly IMitarbeiterbelegungReferenz[],
): readonly IMitarbeiterbelegungReferenz[] {
  const eindeutige = new Map<string, IMitarbeiterbelegungReferenz>();
  belegungen.forEach((belegung) => {
    if (belegung.status === 'archiviert') return;
    eindeutige.set(createMitarbeiterbelegungReferenzSchluessel(belegung), belegung);
  });
  const mitEntwurf = new Set(
    [...eindeutige.values()]
      .filter((belegung) => belegung.status === 'entwurf')
      .map((belegung) => createMitarbeiterbelegungPlanSchluessel(belegung)),
  );
  return [...eindeutige.values()].filter((belegung) => {
    return (
      belegung.status === 'entwurf' ||
      !mitEntwurf.has(createMitarbeiterbelegungPlanSchluessel(belegung))
    );
  });
}

/**
 * Ermittelt blockierende Zeitkonflikte in den relevanten Belegungen eines Mitarbeiters.
 *
 * @param belegungen - Belegungsreferenzen aus dem firmenweiten Index.
 * @returns Blockierende Konflikte mit den jeweils beteiligten Belegungen.
 */
export function getMitarbeiterbelegungKonflikte(
  belegungen: readonly IMitarbeiterbelegungReferenz[],
): readonly IMitarbeiterbelegungKonflikt[] {
  const relevanteBelegungen = getRelevanteMitarbeiterbelegungen(belegungen)
    .slice()
    .sort((erste, zweite) => {
      return erste.beginn.toMillis() - zweite.beginn.toMillis();
    });
  const konflikte: IMitarbeiterbelegungKonflikt[] = [];
  relevanteBelegungen.forEach((belegung) => {
    try {
      calculateSchichtLohnzeitMinuten(belegung);
    } catch {
      konflikte.push({
        art: 'ungueltige-zeitfolge',
        schwere: 'blockierend',
        meldung: 'Eine Mitarbeiterschicht besitzt keine gültige Zeitfolge.',
        belegungen: [belegung],
      });
    }
  });
  for (let ersterIndex = 0; ersterIndex < relevanteBelegungen.length; ersterIndex += 1) {
    const erste = relevanteBelegungen[ersterIndex];
    for (
      let zweiterIndex = ersterIndex + 1;
      zweiterIndex < relevanteBelegungen.length;
      zweiterIndex += 1
    ) {
      const zweite = relevanteBelegungen[zweiterIndex];
      if (
        erste.ende.toMillis() > erste.beginn.toMillis() &&
        zweite.ende.toMillis() > zweite.beginn.toMillis() &&
        hatMitarbeiterbelegungUeberschneidung(erste, zweite)
      ) {
        konflikte.push({
          art: 'ueberschneidung',
          schwere: 'blockierend',
          meldung: 'Der Mitarbeiter ist in diesem Zeitraum mehrfach eingeplant.',
          belegungen: [erste, zweite],
        });
      }
    }
  }
  if (konflikte.length === 0) {
    berechnePausenzuordnungen(relevanteBelegungen).forEach((zuordnung) => {
      if ((zuordnung.belegung.pauseMinuten ?? 0) !== zuordnung.pauseMinuten) {
        konflikte.push({
          art: 'ungueltige-pause',
          schwere: 'blockierend',
          meldung: 'Eine Mitarbeiterschicht besitzt keinen gültigen Pausenwert.',
          belegungen: [zuordnung.belegung],
        });
      }
    });
  }
  return konflikte;
}

/**
 * Berechnet die auf konkreten Schichten zu speichernden bezahlten Pausen eines Mitarbeiters.
 *
 * Die Berechnung erfolgt je Dienstplandatum. Nur die chronologisch letzte Schicht eines Arbeitsblocks erhält dessen
 * Gesamtpause; alle übrigen Schichten erhalten `0`.
 *
 * @param belegungen - Belegungsreferenzen aus dem firmenweiten Index.
 * @returns Pausenzuordnungen für alle relevanten Schichten.
 * @throws Wenn eine ungültige oder überschneidende Zeitfolge vorliegt.
 */
export function getMitarbeiterbelegungPausenzuordnungen(
  belegungen: readonly IMitarbeiterbelegungReferenz[],
): readonly IMitarbeiterbelegungPausenzuordnung[] {
  const relevanteBelegungen = getRelevanteMitarbeiterbelegungen(belegungen);
  const zeitkonflikt = getMitarbeiterbelegungKonflikte(relevanteBelegungen).find((konflikt) => {
    return konflikt.art !== 'ungueltige-pause';
  });
  if (zeitkonflikt) {
    throw new Error(zeitkonflikt.meldung);
  }
  return berechnePausenzuordnungen(relevanteBelegungen);
}

function berechnePausenzuordnungen(
  relevanteBelegungen: readonly IMitarbeiterbelegungReferenz[],
): readonly IMitarbeiterbelegungPausenzuordnung[] {
  const nachDatum = new Map<string, IMitarbeiterbelegungReferenz[]>();
  relevanteBelegungen.forEach((belegung) => {
    nachDatum.set(belegung.datum, [...(nachDatum.get(belegung.datum) ?? []), belegung]);
  });
  return [...nachDatum.values()].flatMap((tagesbelegungen) => {
    return calculateArbeitsbloecke(tagesbelegungen).flatMap((block) => {
      return block.schichten.map((belegung, index) => {
        return {
          belegung,
          pauseMinuten: index === block.schichten.length - 1 ? block.pauseMinuten : 0,
        };
      });
    });
  });
}

/**
 * Liefert den stabilen Schlüssel einer konkreten Belegungsreferenz.
 *
 * @param belegung - Belegungsreferenz einer konkreten Schicht.
 * @returns Stabiler Referenzschlüssel.
 */
export function createMitarbeiterbelegungReferenzSchluessel(
  belegung: Pick<
    IMitarbeiterbelegungReferenz,
    'filialeId' | 'dienstplanId' | 'versionId' | 'schichtId'
  >,
): string {
  return JSON.stringify([
    belegung.filialeId,
    belegung.dienstplanId,
    belegung.versionId,
    belegung.schichtId,
  ]);
}

function createMitarbeiterbelegungPlanSchluessel(belegung: IMitarbeiterbelegungReferenz): string {
  return JSON.stringify([belegung.filialeId, belegung.dienstplanId]);
}

/**
 * Prüft, ob zwei Indexreferenzen dieselbe konkrete Schicht bezeichnen.
 *
 * @param erste - Erste Belegungsreferenz.
 * @param zweite - Zweite Belegungsreferenz.
 * @returns `true`, wenn beide Referenzen dieselbe Schicht bezeichnen.
 */
export function istGleicheMitarbeiterbelegung(
  erste: IMitarbeiterbelegungReferenz,
  zweite: IMitarbeiterbelegungReferenz,
): boolean {
  return (
    erste.filialeId === zweite.filialeId &&
    erste.dienstplanId === zweite.dienstplanId &&
    erste.versionId === zweite.versionId &&
    erste.schichtId === zweite.schichtId
  );
}

/**
 * Prüft zwei konkrete Belegungen auf eine zeitliche Überschneidung.
 *
 * @param erste - Erste Belegungsreferenz.
 * @param zweite - Zweite Belegungsreferenz.
 * @returns `true`, wenn sich die halboffenen Zeiträume überschneiden.
 */
export function hatMitarbeiterbelegungUeberschneidung(
  erste: IMitarbeiterbelegungReferenz,
  zweite: IMitarbeiterbelegungReferenz,
): boolean {
  return (
    erste.beginn.toMillis() < zweite.ende.toMillis() &&
    zweite.beginn.toMillis() < erste.ende.toMillis()
  );
}

/**
 * Ersetzt eine konkrete Schichtreferenz in einem Belegungstag.
 *
 * @param dokument - Vorhandener Belegungstag oder `null`.
 * @param mitarbeiterId - Mitarbeiter des Belegungstags.
 * @param datum - Lokales Kalenderdatum des Belegungstags.
 * @param entfernen - Optional zu entfernende Schichtreferenz.
 * @param hinzufuegen - Optional hinzuzufügende Schichtreferenz.
 * @param aktualisiertVonUid - UID des ändernden Benutzers.
 * @returns Aktualisierter Belegungstag oder `null`, wenn keine Belegung verbleibt.
 */
export function updateMitarbeiterbelegungDokument(
  dokument: IMitarbeiterbelegungDokument | null,
  mitarbeiterId: string,
  datum: string,
  entfernen: IMitarbeiterbelegungReferenz | null,
  hinzufuegen: IMitarbeiterbelegungReferenz | null,
  aktualisiertVonUid: string,
): IMitarbeiterbelegungDokument | null {
  if (dokument && (dokument.mitarbeiterId !== mitarbeiterId || dokument.datum !== datum)) {
    throw new Error('Der Belegungstag gehört nicht zum erwarteten Mitarbeiter und Datum.');
  }
  let belegungen = [...(dokument?.belegungen ?? [])];
  if (entfernen) {
    belegungen = belegungen.filter((belegung) => {
      return !istGleicheMitarbeiterbelegung(belegung, entfernen);
    });
  }
  if (hinzufuegen) {
    belegungen = [
      ...belegungen.filter((belegung) => {
        return !istGleicheMitarbeiterbelegung(belegung, hinzufuegen);
      }),
      hinzufuegen,
    ].sort((erste, zweite) => {
      return erste.beginn.toMillis() - zweite.beginn.toMillis();
    });
    const konflikt = getMitarbeiterbelegungKonflikte(belegungen).find((eintrag) => {
      return eintrag.art === 'ueberschneidung';
    });
    if (konflikt) throw new Error('Der Mitarbeiter ist in diesem Zeitraum bereits eingeplant.');
  }
  return belegungen.length === 0 ? null : { mitarbeiterId, datum, belegungen, aktualisiertVonUid };
}

function verschiebeKalendertag(datum: string, tage: number): string {
  const wert = new Date(`${datum}T12:00:00Z`);
  wert.setUTCDate(wert.getUTCDate() + tage);
  return wert.toISOString().slice(0, 10);
}
