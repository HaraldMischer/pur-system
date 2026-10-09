// pur-system/src/app/commons/constants/app-kontext-selector.constants.ts

import { TAppKontextSelectorKonfiguration } from '../models/app/app-kontext-selector.types';
import { TAppBereich } from '../models/app/app-bereich';
import { TUserRole } from '../models/domain/benutzer';

type TAppKontextSelectorMatrix = Readonly<
  Partial<
    Record<TUserRole, Readonly<Partial<Record<TAppBereich, TAppKontextSelectorKonfiguration>>>>
  >
>;

export const VERBORGENE_APP_KONTEXT_SELECTOR_KONFIGURATION: TAppKontextSelectorKonfiguration = {
  unternehmer: 'hidden',
  firma: 'hidden',
  filiale: 'hidden',
};

export const APP_KONTEXT_SELECTOR_MATRIX: TAppKontextSelectorMatrix = {
  master: {
    dashboard: {
      unternehmer: 'editable',
      firma: 'editable',
      filiale: 'hidden',
    },
    schichtplan: {
      unternehmer: 'editable',
      firma: 'editable',
      filiale: 'editable',
    },
    mitarbeiter: {
      unternehmer: 'editable',
      firma: 'editable',
      filiale: 'editable',
    },
    verwaltung: {
      unternehmer: 'editable',
      firma: 'editable',
      filiale: 'hidden',
    },
    systemverwaltung: {
      unternehmer: 'editable',
      firma: 'editable',
      filiale: 'hidden',
    },
  },
  office: {
    schichtplan: {
      unternehmer: 'editable',
      firma: 'editable',
      filiale: 'editable',
    },
  },
  mitarbeiter: {
    schichtplan: {
      unternehmer: 'hidden',
      firma: 'hidden',
      filiale: 'editable',
    },
  },
};

/**
 * Liefert die wirksame Kontextselektor-Konfiguration für Rolle und App-Bereich.
 *
 * @param userRole - Aktive Benutzerrolle oder `null`.
 * @param bereich - Aktiver App-Bereich oder `null`.
 * @returns Die konfigurierte Auswahl oder eine vollständig verborgene Fallback-Konfiguration.
 */
export function getAppKontextSelectorKonfiguration(
  userRole: TUserRole | null | undefined,
  bereich: TAppBereich | null,
): TAppKontextSelectorKonfiguration {
  if (!userRole || !bereich) {
    return VERBORGENE_APP_KONTEXT_SELECTOR_KONFIGURATION;
  }

  return (
    APP_KONTEXT_SELECTOR_MATRIX[userRole]?.[bereich] ??
    VERBORGENE_APP_KONTEXT_SELECTOR_KONFIGURATION
  );
}
