// pur-system/src/app/commons/mapper/domain/mitarbeiter-auswahl.mapper.ts

import { IMitarbeiterAuswahl } from '../../models/domain/mitarbeiter';
import { asRecord, getString } from '../../utils/firestore/firestore-dokumentwerte';

/**
 * Bildet aktive und noch nicht verknüpfte Mitarbeiter als sortierte Benutzerauswahl ab.
 *
 * @param dokumente - Mitarbeiterdokumente mit ID und unveränderten Firestore-Daten.
 * @returns Auswahlfähige Mitarbeiter mit Anzeigename.
 */
export function mapMitarbeiterAuswahl(
  dokumente: readonly { id: string; daten: Record<string, unknown> }[],
): IMitarbeiterAuswahl[] {
  return dokumente
    .flatMap((dokument) => {
      if (dokument.daten['aktiv'] !== true) return [];

      const benutzerUid = dokument.daten['benutzerUid'];
      if (
        benutzerUid !== undefined &&
        benutzerUid !== null &&
        (typeof benutzerUid !== 'string' || benutzerUid.trim())
      ) {
        return [];
      }

      const person = asRecord(dokument.daten['person']);
      const vorname = getString(person['vorname']);
      const nachname = getString(person['nachname']);
      return vorname && nachname
        ? [{ id: dokument.id, anzeigename: `${nachname}, ${vorname}` }]
        : [];
    })
    .sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
}
