// pur-system/src/app/commons/utils/dienstplan/dienstplan-tagesschichten.ts

import { Timestamp } from 'firebase/firestore';

import type { IDienstplanKalendertag } from '../../models/domain/dienstplan-kalendertag';
import type { IGeoeffneteOeffnungsregel } from '../../models/domain/filialeinstellung';
import type {
  ISchichtmodellBestand,
  ITagesschichtDaten,
  TTagesschichtHerkunft,
  TTagesstrukturSchichtSchreibdaten,
  TTagesvorlageTyp,
} from '../../models/domain/schichtmodell';
import { assertGueltigeTagesstruktur } from '../../validators/schichtmodell.validator';
import { createSchichtZeitstempelAusLokalzeiten } from './schicht-lokalzeit';
import { getTagesschichtHerkunft } from './schichtmodell-vorlagen';
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
  zeitzone: string;
}

/**
 * Prüft alle aus Modellvorlagen erzeugten Tagesstrukturen gegen die wirksamen Monatsöffnungen.
 *
 * Geschlossene Tage benötigen keine Modellvorlage.
 */
export function assertSchichtmodellPasstZuKalendertagen(
  kalendertage: readonly IDienstplanKalendertag[],
  schichtmodell: ISchichtmodellBestand,
): void {
  kalendertage.forEach((kalendertag) => {
    if (!kalendertag.oeffnungsregel.geoeffnet) return;
    const vorlage = getTagesvorlage(kalendertag);
    const schichten = resolveTagesvorlagenschichten(
      schichtmodell.tagesvorlagenschichten.filter((schicht) => {
        return schicht.vorlage === vorlage;
      }),
      kalendertag.oeffnungsregel,
      schichtmodell.schichtmodell,
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
  return anfrage.kalendertage.flatMap((kalendertag) => {
    if (!kalendertag.oeffnungsregel.geoeffnet) return [];
    const vorlage = getTagesvorlage(kalendertag);
    const herkunft: TTagesschichtHerkunft = getTagesschichtHerkunft(vorlage);
    const schichten: TTagesstrukturSchichtSchreibdaten[] = resolveTagesvorlagenschichten(
      anfrage.schichtmodell.tagesvorlagenschichten.filter((schicht) => {
        return schicht.vorlage === vorlage;
      }),
      kalendertag.oeffnungsregel,
      anfrage.schichtmodell.schichtmodell,
    );
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
  } catch {
    throw new SchichtmodellOeffnungszeitenFehler();
  }
}

function getTagesvorlage(kalendertag: IDienstplanKalendertag): TTagesvorlageTyp {
  if (kalendertag.tagesstrukturQuelle === 'sonntagsvorlage') return 'sonntag';
  if (kalendertag.tagesstrukturQuelle === 'abweichendeWochentagsvorlage') {
    if (kalendertag.wochentag === 'sonntag') throw new SchichtmodellOeffnungszeitenFehler();
    return `wochentag:${kalendertag.wochentag}`;
  }
  if (kalendertag.tagesstrukturQuelle === 'sondertagsvorlage') {
    if (!kalendertag.sondertagId) throw new SchichtmodellOeffnungszeitenFehler();
    return `sondertag:${kalendertag.sondertagId}`;
  }
  if (kalendertag.tagesstrukturQuelle === 'wochentagsvorlage') return 'wochentag';
  throw new SchichtmodellOeffnungszeitenFehler();
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
    ...(schicht.id ? { vorlagenschichtId: schicht.id } : {}),
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
