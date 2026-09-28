// pur-system/src/app/services/core/debug-log.service.ts

import { Injectable } from '@angular/core';

import { LOCALHOST_DEBUG_LOG_ENABLED } from '../../commons/constants/app.constants';

export type TDebugLogKategorie = 'Authentifizierung' | 'Firestore' | 'Laden' | 'Store';

// ===== Top-Level Helper =====================

function formatDatenzeile(bezeichnung: string, anzahl: number): string {
  const text = `${bezeichnung} geladen`;
  return `* ${text.padEnd(34, '.')} (${anzahl})`;
}

export function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

@Injectable({ providedIn: 'root' })
export class DebugLogService {
  // ===== Öffentliche Werte ====================

  readonly isEnabled =
    LOCALHOST_DEBUG_LOG_ENABLED && isLocalhost(globalThis.location?.hostname ?? '');

  // ===== Öffentliche Aktionen =================

  /**
   * Schreibt eine kategorisierte Meldung, wenn das Debug-Logging aktiviert ist.
   *
   * @param kategorie - Fachliche oder technische Kategorie der Meldung.
   * @param nachricht - Kurze Beschreibung des protokollierten Vorgangs.
   * @param details - Optionale strukturierte Zusatzinformationen ohne sensible Inhalte.
   */
  log(kategorie: TDebugLogKategorie, nachricht: string, details?: unknown): void {
    if (!this.isEnabled) return;

    const prefix = `[PUR][${kategorie}] ${nachricht}`;
    if (details === undefined) {
      console.debug(prefix);
      return;
    }

    console.debug(prefix, details);
  }

  /**
   * Schreibt eine deutlich getrennte Überschrift für einen Abschnitt des initialen Datenflusses.
   *
   * @param titel - Bezeichnung des Ladeabschnitts.
   */
  logDatenflussTitel(titel: string): void {
    if (!this.isEnabled) return;

    console.log(`\n******* ${titel.padEnd(42, '*')}`);
  }

  /**
   * Schreibt das Ergebnis eines fachlichen Ladevorgangs in einer einzelnen Konsolenzeile.
   *
   * @param bezeichnung - Fachliche Bezeichnung der geladenen Daten.
   * @param anzahl - Anzahl der geladenen Einträge.
   * @param details - Optionale strukturierte Daten für die einklappbare Konsolenansicht.
   */
  logDatenGeladen(bezeichnung: string, anzahl: number, details?: unknown): void {
    if (!this.isEnabled) return;

    const nachricht = formatDatenzeile(bezeichnung, anzahl);
    if (details === undefined) {
      console.log(nachricht);
      return;
    }

    console.log(nachricht, details);
  }
}
