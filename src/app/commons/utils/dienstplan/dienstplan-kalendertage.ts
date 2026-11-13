// pur-system/src/app/commons/utils/dienstplan/dienstplan-kalendertage.ts

import type { IDienstplanKalendertag } from '../../models/domain/dienstplan-kalendertag';
import type {
  IFilialeinstellungSondertagEintrag,
  IGeoeffneteOeffnungsregel,
  TWochenregeln,
} from '../../models/domain/filialeinstellung';
import { resolveOeffnungsregel } from '../filialeinstellung/oeffnungsregel-aufloesung';
import { createDienstplanZeitraum } from './dienstplan-zeitraum';

export interface IDienstplanKalendertageAnfrage {
  monat: string;
  standardoeffnungsregel: IGeoeffneteOeffnungsregel;
  wochenregeln: TWochenregeln;
  sondertage: readonly IFilialeinstellungSondertagEintrag[];
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
      standardoeffnungsregel: anfrage.standardoeffnungsregel,
      wochenregeln: anfrage.wochenregeln,
      sondertage: anfrage.sondertage,
    });
    return {
      datum,
      wochentag: aufgeloest.wochentag,
      istSonntag: aufgeloest.wochentag === 'sonntag',
      aktiveSondertage: aufgeloest.aktiveSondertage,
      oeffnungsregelQuelle: aufgeloest.quelle,
      oeffnungsregel: { ...aufgeloest.oeffnungsregel },
      ...(aufgeloest.bezeichnung ? { bezeichnung: aufgeloest.bezeichnung } : {}),
      ...(aufgeloest.sondertagId ? { sondertagId: aufgeloest.sondertagId } : {}),
      ...(aufgeloest.gesetzlicherFeiertag
        ? { gesetzlicherFeiertag: aufgeloest.gesetzlicherFeiertag }
        : {}),
    };
  });
}
