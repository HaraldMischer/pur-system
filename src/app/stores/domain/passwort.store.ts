// pur-system/src/app/stores/domain/passwort.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { AuthService } from '../../services/firebase/auth.service';

// ===== Top-Level Helper =====================

export type TPasswortSnapshot = {
  readonly inProgress: boolean;
  readonly error: string | null;
  readonly erfolgreich: boolean;
};

type TPasswortState = TPasswortSnapshot;

const initialState: TPasswortState = {
  inProgress: false,
  error: null,
  erfolgreich: false,
};

export const PasswortStore = signalStore(
  { protectedState: true },
  withState<TPasswortState>(initialState),
  withMethods(
    (
      store,
      authService = inject(AuthService),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      // ===== Methoden: Schreiben ==================

      /**
       * Speichert ein neues Passwort nach erfolgreicher Prüfung des aktuellen Passworts.
       *
       * @param aktuellesPasswort - Das aktuelle Passwort zur erneuten Authentifizierung.
       * @param neuesPasswort - Das neu zu speichernde Passwort.
       * @throws Gibt Fehler der Passwortänderung an die aufrufende Stelle weiter.
       */
      async function savePasswort(aktuellesPasswort: string, neuesPasswort: string): Promise<void> {
        patchState(store, { inProgress: true, error: null, erfolgreich: false });

        try {
          await authService.changePassword(aktuellesPasswort, neuesPasswort);
          patchState(store, { erfolgreich: true });
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Liefert eine Momentaufnahme des Passwort-Store-Zustands ohne Passwortwerte.
       *
       * @returns Nicht reaktiv verfolgter Status der Passwortänderung.
       */
      function snapshot(): TPasswortSnapshot {
        return untracked(() => ({
          inProgress: store.inProgress(),
          error: store.error(),
          erfolgreich: store.erfolgreich(),
        }));
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'PasswortStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return { savePasswort, snapshot };
    },
  ),
);
