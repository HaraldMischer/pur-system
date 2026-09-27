// pur-system/src/app/services/core/loading.service.ts

import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  // ===== Interner State =======================

  private readonly _aktiveLadevorgaenge = signal(0);
  private readonly _aktiveSchreibvorgaenge = signal(0);

  // ===== Öffentliche Ableitungen ==============

  readonly isLoading = computed(() => {
    return this._aktiveLadevorgaenge() > 0;
  });
  readonly isWriting = computed(() => {
    return this._aktiveSchreibvorgaenge() > 0;
  });
  readonly isActive = computed(() => {
    return this.isLoading() || this.isWriting();
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Registriert einen asynchronen Ladevorgang für den globalen Ladeindikator.
   *
   * Parallel laufende Aufrufe werden gezählt, damit der Ladeindikator erst nach Abschluss
   * des letzten Aufrufs ausgeblendet wird.
   *
   * @param load - Die auszuführende asynchrone Ladefunktion.
   * @returns Das Ergebnis der Ladefunktion.
   * @throws Gibt Fehler der Ladefunktion unverändert an die aufrufende Stelle weiter.
   */
  async trackLoad<T>(load: () => Promise<T>): Promise<T> {
    this._aktiveLadevorgaenge.update((anzahl) => anzahl + 1);

    try {
      return await load();
    } finally {
      this._aktiveLadevorgaenge.update((anzahl) => Math.max(0, anzahl - 1));
    }
  }

  /**
   * Registriert einen asynchronen Schreibvorgang für den globalen Ladeindikator.
   *
   * Parallel laufende Aufrufe werden gezählt, damit der Ladeindikator erst nach Abschluss
   * des letzten Aufrufs ausgeblendet wird.
   *
   * @param write - Die auszuführende asynchrone Schreibfunktion.
   * @returns Das Ergebnis der Schreibfunktion.
   * @throws Gibt Fehler der Schreibfunktion unverändert an die aufrufende Stelle weiter.
   */
  async trackWrite<T>(write: () => Promise<T>): Promise<T> {
    this._aktiveSchreibvorgaenge.update((anzahl) => anzahl + 1);

    try {
      return await write();
    } finally {
      this._aktiveSchreibvorgaenge.update((anzahl) => Math.max(0, anzahl - 1));
    }
  }
}
