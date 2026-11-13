// pur-system/src/app/commons/utils/dienstplan/tagesvorlagenschichten.ts

import type { IGeoeffneteOeffnungsregel } from '../../models/domain/filialeinstellung';
import type {
  ITagesvorlagenschichtSchreibdaten,
  TTagesstrukturSchichtSchreibdaten,
} from '../../models/domain/schichtmodell';

/**
 * Löst die dynamischen Außengrenzen einer Schichtmodellvorlage gegen eine konkrete Öffnung auf.
 *
 * @param schichten - Geordnete oder ungeordnete Schichten der ausgewählten Vorlage.
 * @param oeffnung - Wirksame Öffnung des konkreten Kalendertags.
 * @returns Vollständige Tagesschichten mit aus der Öffnung abgeleiteten Außengrenzen.
 */
export function resolveTagesvorlagenschichten(
  schichten: readonly ITagesvorlagenschichtSchreibdaten[],
  oeffnung: IGeoeffneteOeffnungsregel,
): TTagesstrukturSchichtSchreibdaten[] {
  const geordneteSchichten = [...schichten].sort((a, b) => a.reihenfolge - b.reihenfolge);
  const letzterIndex = geordneteSchichten.length - 1;
  return geordneteSchichten.map((schicht, index) => {
    const istErsteSchicht = index === 0;
    const istLetzteSchicht = index === letzterIndex;
    if (!istErsteSchicht && !schicht.beginn) {
      throw new Error('Die Tagesschicht benötigt einen festen Beginn.');
    }
    if (!istLetzteSchicht && !schicht.ende) {
      throw new Error('Die Tagesschicht benötigt ein festes Ende.');
    }
    const { vorlage: _vorlage, ...daten } = schicht;
    return {
      ...daten,
      beginn: istErsteSchicht
        ? { lokalzeit: oeffnung.beginnLokalzeit, tag: 'starttag' }
        : schicht.beginn!,
      ende: istLetzteSchicht
        ? {
            lokalzeit: oeffnung.endeLokalzeit,
            tag: oeffnung.endetAmFolgetag ? 'folgetag' : 'starttag',
          }
        : schicht.ende!,
    };
  });
}
