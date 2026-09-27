// pur-system/src/app/services/core/store-snapshot.service.ts

import { Injectable, inject, isDevMode } from '@angular/core';

import { DebugLogService } from './debug-log.service';

type TStoreSnapshotProvider = () => unknown;

@Injectable({
  providedIn: 'root',
})
export class StoreSnapshotService {
  // ===== Interne Dependency Injection =========

  private readonly debugLogService = inject(DebugLogService);

  // ===== Interner State =======================

  private readonly _snapshotProvider = new Map<string, TStoreSnapshotProvider>();

  // ===== Öffentliche Aktionen =================

  /**
   * Registriert den Snapshot-Provider einer aktiven Store-Instanz.
   *
   * @param storeName - Der eindeutige Name des Stores.
   * @param snapshotProvider - Die Funktion zum Erstellen des aktuellen Snapshots.
   * @returns Eine Funktion zum Abmelden genau dieser Store-Instanz.
   */
  registerStoreSnapshot(storeName: string, snapshotProvider: TStoreSnapshotProvider): () => void {
    if (!isDevMode()) {
      return () => undefined;
    }

    this._snapshotProvider.set(storeName, snapshotProvider);

    return () => {
      if (this._snapshotProvider.get(storeName) === snapshotProvider) {
        this._snapshotProvider.delete(storeName);
      }
    };
  }

  /**
   * Gibt die Momentaufnahmen aller angebundenen Stores in der Browser-Konsole aus.
   */
  logStoreSnapshots(): void {
    if (!isDevMode()) {
      return;
    }

    const snapshots = Object.fromEntries(
      [...this._snapshotProvider].map(([storeName, snapshotProvider]) => {
        return [storeName, snapshotProvider()];
      }),
    );

    this.debugLogService.log('Store', 'Snapshots', snapshots);
  }
}
