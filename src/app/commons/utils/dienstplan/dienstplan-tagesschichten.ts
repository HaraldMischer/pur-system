// pur-system/src/app/commons/utils/dienstplan/dienstplan-tagesschichten.ts

import { Timestamp } from 'firebase/firestore';

import type { IDienstplanKalendertag } from '../../models/domain/dienstplan-kalendertag';
import type { IGeoeffneteOeffnungsregel } from '../../models/domain/filialeinstellung';
import type {
  IFreieTagesschichtSchreibdaten,
  ISchichtmodellBestand,
  ITagesschichtDaten,
  TTagesschichtHerkunft,
  TTagesstrukturSchichtSchreibdaten,
  TTagesvorlageTyp,
} from '../../models/domain/schichtmodell';
import { assertGueltigeTagesstruktur } from '../../validators/schichtmodell.validator';
import { createSchichtZeitstempelAusLokalzeiten } from './schicht-lokalzeit';
import { resolveTagesvorlagenschichten } from './tagesvorlagenschichten';

export type TTagesschichtAnlage = ITagesschichtDaten & {
  readonly id?: string;
};

/**
 * Kennzeichnet eine Schichtmodellvorlage, deren feste innere Grenzen außerhalb der aktuellen Öffnung liegen.
 */
export class SchichtmodellOeffnungszeitenFehler extends Error {
  constructor() {
    super('Das Schichtmodell passt nicht zu den aktuellen Öffnungszeiten.');
    this.name = 'SchichtmodellOeffnungszeitenFehler';
  }
}

export interface IDienstplanTagesschichtenAnfrage {
  kalendertage: readonly IDienstplanKalendertag[];
  schichtmodell: ISchichtmodellBestand;
  freieTagesschichten: readonly IFreieTagesschichtSchreibdaten[];
  zeitzone: string;
}

/**
 * Prüft alle aus Modellvorlagen erzeugten Tagesstrukturen gegen die wirksamen Monatsöffnungen.
 *
 * Frei konfigurierte und geschlossene Tage werden dabei nicht durch das Schichtmodell bestimmt.
 */
export function assertSchichtmodellPasstZuKalendertagen(
  kalendertage: readonly IDienstplanKalendertag[],
  schichtmodell: ISchichtmodellBestand,
): void {
  kalendertage.forEach((kalendertag) => {
    if (
      !kalendertag.oeffnungsregel.geoeffnet ||
      kalendertag.tagesstrukturQuelle === 'freieTagesstruktur'
    ) {
      return;
    }
    const vorlage: TTagesvorlageTyp =
      kalendertag.tagesstrukturQuelle === 'sonntagsvorlage' ? 'sonntag' : 'wochentag';
    const schichten = resolveTagesvorlagenschichten(
      schichtmodell.tagesvorlagenschichten.filter((schicht) => {
        return schicht.vorlage === vorlage;
      }),
      kalendertag.oeffnungsregel,
    );
    assertTagesstrukturMitModellfehler(schichten, kalendertag.oeffnungsregel);
  });
}

/**
 * Erzeugt die unveränderlichen Tagesschichten eines vollständigen Monatsplans.
 */
export function createDienstplanTagesschichten(
  anfrage: IDienstplanTagesschichtenAnfrage,
): readonly TTagesschichtAnlage[] {
  assertSchichtmodellPasstZuKalendertagen(anfrage.kalendertage, anfrage.schichtmodell);
  const freieNachDatum = new Map<string, IFreieTagesschichtSchreibdaten[]>();
  anfrage.freieTagesschichten.forEach((schicht) => {
    freieNachDatum.set(schicht.datum, [...(freieNachDatum.get(schicht.datum) ?? []), schicht]);
  });
  return anfrage.kalendertage.flatMap((kalendertag) => {
    if (!kalendertag.oeffnungsregel.geoeffnet) return [];
    const freieSchichten = freieNachDatum.get(kalendertag.datum);
    const verwendetFreieTagesstruktur = kalendertag.tagesstrukturQuelle === 'freieTagesstruktur';
    if (verwendetFreieTagesstruktur && (!freieSchichten || freieSchichten.length === 0)) {
      throw new Error(`Für ${kalendertag.datum} fehlt die abweichende Tagesstruktur.`);
    }
    const vorlage: TTagesvorlageTyp =
      kalendertag.tagesstrukturQuelle === 'sonntagsvorlage' ? 'sonntag' : 'wochentag';
    const herkunft: TTagesschichtHerkunft =
      verwendetFreieTagesstruktur && kalendertag.oeffnungsregelQuelle === 'sondertag'
        ? 'sondertag'
        : vorlage;
    const schichten: TTagesstrukturSchichtSchreibdaten[] = verwendetFreieTagesstruktur
      ? freieSchichten!.map((schicht) => {
          const { datum: _datum, id: _id, ...daten } = schicht;
          return daten;
        })
      : resolveTagesvorlagenschichten(
          anfrage.schichtmodell.tagesvorlagenschichten.filter((schicht) => {
            return schicht.vorlage === vorlage;
          }),
          kalendertag.oeffnungsregel,
        );
    if (verwendetFreieTagesstruktur) {
      assertGueltigeTagesstruktur(schichten, kalendertag.oeffnungsregel);
    }
    return schichten.map((schicht) => {
      return createTagesschicht(kalendertag.datum, herkunft, schicht, anfrage.zeitzone);
    });
  });
}

function assertTagesstrukturMitModellfehler(
  schichten: readonly TTagesstrukturSchichtSchreibdaten[],
  oeffnungsregel: IGeoeffneteOeffnungsregel,
): void {
  try {
    assertGueltigeTagesstruktur(schichten, oeffnungsregel);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === 'Die Kernzeit der Tagesschicht muss innerhalb der Öffnung liegen.'
    ) {
      throw new SchichtmodellOeffnungszeitenFehler();
    }
    throw error;
  }
}

function createTagesschicht(
  datum: string,
  herkunft: TTagesschichtHerkunft,
  schicht: TTagesstrukturSchichtSchreibdaten,
  zeitzone: string,
): TTagesschichtAnlage {
  const kernzeit = createSchichtZeitstempelAusLokalzeiten(
    datum,
    {
      beginnLokalzeit: schicht.beginn.lokalzeit,
      endeLokalzeit: schicht.ende.lokalzeit,
      beginntAmFolgetag: schicht.beginn.tag === 'folgetag',
      endetAmFolgetag: schicht.ende.tag === 'folgetag',
    },
    zeitzone,
  );
  return {
    ...(schicht.id ? { id: schicht.id } : {}),
    datum,
    herkunft,
    ...(herkunft !== 'sondertag' && schicht.id ? { vorlagenschichtId: schicht.id } : {}),
    bezeichnung: schicht.bezeichnung,
    reihenfolge: schicht.reihenfolge,
    kernbeginnLokalzeit: schicht.beginn.lokalzeit,
    kernendeLokalzeit: schicht.ende.lokalzeit,
    kernbeginnAmFolgetag: schicht.beginn.tag === 'folgetag',
    kernendeAmFolgetag: schicht.ende.tag === 'folgetag',
    beginn: Timestamp.fromMillis(
      kernzeit.beginn.toMillis() - schicht.vorbereitungsminuten * 60_000,
    ),
    ende: Timestamp.fromMillis(kernzeit.ende.toMillis() + schicht.nachbereitungsminuten * 60_000),
    mehrfachbelegungErlaubt: schicht.mehrfachbelegungErlaubt,
    vorbereitungsminuten: schicht.vorbereitungsminuten,
    nachbereitungsminuten: schicht.nachbereitungsminuten,
  };
}
