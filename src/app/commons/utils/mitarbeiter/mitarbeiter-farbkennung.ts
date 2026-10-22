// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-farbkennung.ts

import { MITARBEITER_FARBEN } from '../../constants/mitarbeiter-farbkennung.constants';

const MITARBEITER_FARBE_NACH_KENNUNG = new Map<string, string>(
  MITARBEITER_FARBEN.map((eintrag) => [eintrag.kennung, eintrag.farbe]),
);

/**
 * Löst eine gespeicherte Mitarbeiter-Farbkennung in die konkrete Darstellungsfarbe auf.
 *
 * @param farbkennung - Gespeicherte Kennung oder ein bestehender älterer CSS-Farbwert.
 * @returns Zugeordnete Farbe, älterer Farbwert oder `null` ohne Farbkennung.
 */
export function getMitarbeiterFarbe(farbkennung: string | null | undefined): string | null {
  const bereinigteFarbkennung = farbkennung?.trim();
  if (!bereinigteFarbkennung) return null;

  return MITARBEITER_FARBE_NACH_KENNUNG.get(bereinigteFarbkennung) ?? bereinigteFarbkennung;
}
