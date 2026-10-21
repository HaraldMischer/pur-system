// pur-system/src/app/commons/utils/dienstplan/dienstplan-kalendertage.ts

import type {
  IDienstplanDatumRasterzeiten,
  IDienstplanKalendertag,
  IDienstplanRasterzeit,
} from '../../models/domain/dienstplan-kalendertag';
import type {
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungSondertagEintrag,
  TWochenoeffnungszeiten,
} from '../../models/domain/filialeinstellung';
import type { IBesondereRasterzeit } from '../../models/domain/schichtmodell';
import { resolveOeffnungsregel } from '../filialeinstellung/oeffnungsregel-aufloesung';
import { createDienstplanZeitraum } from './dienstplan-zeitraum';

export interface IDienstplanKalendertageAnfrage {
  monat: string;
  wochenregeln: TWochenoeffnungszeiten;
  sondertage: readonly IFilialeinstellungSondertagEintrag[];
  ausnahmen: readonly IFilialeinstellungAusnahmeEintrag[];
  modellschichten?: readonly IDienstplanRasterModellschicht[];
  besondereRasterzeiten?: readonly IBesondereRasterzeit[];
  datumRasterzeiten?: readonly IDienstplanDatumRasterzeiten[];
}

export interface IDienstplanRasterModellschicht {
  id: string;
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
}

/**
 * Löst alle Kalendertage eines Dienstplanmonats als unveränderliche Momentaufnahme auf.
 *
 * @param anfrage - Monat und vollständige Öffnungseinstellungen der Filiale.
 * @returns Chronologisch geordnete Tagesmomentaufnahmen des vollständigen Monats.
 */
export function createDienstplanKalendertage(
  anfrage: IDienstplanKalendertageAnfrage,
): readonly IDienstplanKalendertag[] {
  const zeitraum = createDienstplanZeitraum(anfrage.monat);
  const letzterTag = Number(zeitraum.zeitraumEnde.slice(-2));
  return Array.from({ length: letzterTag }, (_, index) => {
    const datum = `${anfrage.monat}-${String(index + 1).padStart(2, '0')}`;
    const aufgeloest = resolveOeffnungsregel({
      datum,
      wochenregeln: anfrage.wochenregeln,
      sondertage: anfrage.sondertage,
      ausnahmen: anfrage.ausnahmen,
    });
    const rasterzeiten = createRasterzeiten(
      datum,
      aufgeloest.quelle === 'sondertag' ? aufgeloest.sondertagId : undefined,
      anfrage.modellschichten ?? [],
      anfrage.besondereRasterzeiten ?? [],
      anfrage.datumRasterzeiten ?? [],
    );
    return {
      datum,
      wochentag: aufgeloest.wochentag,
      istSonntag: aufgeloest.wochentag === 'sonntag',
      aktiveSondertage: aufgeloest.aktiveSondertage,
      oeffnungsregelQuelle: aufgeloest.quelle,
      oeffnungsregel: aufgeloest.oeffnungsregel,
      rasterzeiten,
      ...(aufgeloest.bezeichnung ? { bezeichnung: aufgeloest.bezeichnung } : {}),
      ...(aufgeloest.sondertagId ? { sondertagId: aufgeloest.sondertagId } : {}),
      ...(aufgeloest.ausnahmeId ? { ausnahmeId: aufgeloest.ausnahmeId } : {}),
      ...(aufgeloest.gesetzlicherFeiertag
        ? { gesetzlicherFeiertag: aufgeloest.gesetzlicherFeiertag }
        : {}),
    };
  });
}

/**
 * Liefert die für einen Kalendertag gespeicherte Rasterzeit.
 *
 * @param kalendertag - Tagesmomentaufnahme des Monatsplans.
 * @param modellschichtId - Stabile Modellschicht-ID aus der Monatsplan-Momentaufnahme.
 * @returns Wirksame Rasterzeit der Modellschicht.
 * @throws Wenn der Kalendertag keine Rasterzeit für die Modellschicht enthält.
 */
export function getDienstplanRasterzeit(
  kalendertag: IDienstplanKalendertag,
  modellschichtId: string,
): IDienstplanRasterzeit {
  const rasterzeit = kalendertag.rasterzeiten.find((eintrag) => {
    return eintrag.modellschichtId === modellschichtId;
  });
  if (!rasterzeit) {
    throw new Error('Die Rasterzeit wurde im Kalendertag nicht gefunden.');
  }
  return rasterzeit;
}

function createRasterzeiten(
  datum: string,
  sondertagId: string | undefined,
  modellschichten: readonly IDienstplanRasterModellschicht[],
  besondereRasterzeiten: readonly IBesondereRasterzeit[],
  datumRasterzeiten: readonly IDienstplanDatumRasterzeiten[],
): readonly IDienstplanRasterzeit[] {
  const datumUeberschreibungen =
    datumRasterzeiten.find((eintrag) => {
      return eintrag.datum === datum;
    })?.rasterzeiten ?? [];
  return modellschichten.map((modellschicht) => {
    const datumUeberschreibung = datumUeberschreibungen.find((rasterzeit) => {
      return rasterzeit.modellschichtId === modellschicht.id;
    });
    const sondertagUeberschreibung = sondertagId
      ? besondereRasterzeiten.find((rasterzeit) => {
          return (
            rasterzeit.sondertagId === sondertagId &&
            rasterzeit.modellschichtId === modellschicht.id
          );
        })
      : undefined;
    return createRasterzeit(
      modellschicht.id,
      datumUeberschreibung ?? sondertagUeberschreibung ?? modellschicht,
    );
  });
}

function createRasterzeit(
  modellschichtId: string,
  zeit: Pick<IDienstplanRasterzeit, 'beginnLokalzeit' | 'endeLokalzeit' | 'endetAmFolgetag'>,
): IDienstplanRasterzeit {
  return {
    modellschichtId,
    beginnLokalzeit: zeit.beginnLokalzeit,
    endeLokalzeit: zeit.endeLokalzeit,
    endetAmFolgetag: zeit.endetAmFolgetag,
  };
}
