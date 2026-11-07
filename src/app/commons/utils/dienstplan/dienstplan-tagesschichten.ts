// pur-system/src/app/commons/utils/dienstplan/dienstplan-tagesschichten.ts

import { Timestamp } from 'firebase/firestore';

import type { IDienstplanKalendertag } from '../../models/domain/dienstplan-kalendertag';
import type {
  IFreieTagesschichtSchreibdaten,
  ISchichttagesmodellBestand,
  ITagesschichtDaten,
  TTagesschichtHerkunft,
  TTagesstrukturSchichtSchreibdaten,
  TTagesvorlageTyp,
} from '../../models/domain/schicht-tagesmodell';
import { assertGueltigeTagesstruktur } from '../../validators/schicht-tagesmodell.validator';
import { createSchichtZeitstempelAusLokalzeiten } from './schicht-lokalzeit';
import { resolveTagesvorlagenschichten } from './tagesvorlagenschichten';

export type TTagesschichtAnlage = ITagesschichtDaten & {
  readonly id?: string;
};

export interface IDienstplanTagesschichtenAnfrage {
  kalendertage: readonly IDienstplanKalendertag[];
  schichttagesmodell: ISchichttagesmodellBestand;
  freieSondertagsschichten: readonly IFreieTagesschichtSchreibdaten[];
  zeitzone: string;
}

/**
 * Erzeugt die unveränderlichen Tagesschichten eines vollständigen Monatsplans.
 */
export function createDienstplanTagesschichten(
  anfrage: IDienstplanTagesschichtenAnfrage,
): readonly TTagesschichtAnlage[] {
  const freieNachDatum = new Map<string, IFreieTagesschichtSchreibdaten[]>();
  anfrage.freieSondertagsschichten.forEach((schicht) => {
    freieNachDatum.set(schicht.datum, [...(freieNachDatum.get(schicht.datum) ?? []), schicht]);
  });
  return anfrage.kalendertage.flatMap((kalendertag) => {
    if (!kalendertag.oeffnungsregel.geoeffnet) return [];
    const istSondertag = kalendertag.oeffnungsregelQuelle === 'sondertag';
    const vorlage: TTagesvorlageTyp =
      kalendertag.istSonntag || kalendertag.oeffnungsregelQuelle === 'sonntag'
        ? 'sonntag'
        : 'wochentag';
    const herkunft: TTagesschichtHerkunft = istSondertag ? 'sondertag' : vorlage;
    const schichten: TTagesstrukturSchichtSchreibdaten[] = istSondertag
      ? (freieNachDatum.get(kalendertag.datum) ?? []).map((schicht) => {
          const { datum: _datum, ...daten } = schicht;
          return daten;
        })
      : resolveTagesvorlagenschichten(
          anfrage.schichttagesmodell.tagesvorlagenschichten.filter((schicht) => {
            return schicht.vorlage === vorlage;
          }),
          kalendertag.oeffnungsregel,
        );
    assertGueltigeTagesstruktur(schichten, kalendertag.oeffnungsregel);
    return schichten.map((schicht) => {
      return createTagesschicht(kalendertag.datum, herkunft, schicht, anfrage.zeitzone);
    });
  });
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
