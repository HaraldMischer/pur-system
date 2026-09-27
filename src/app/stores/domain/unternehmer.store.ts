// pur-system/src/app/stores/domain/unternehmer.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  IUnternehmerAnlage,
  IUnternehmerAnlageErgebnis,
  IUnternehmerEintrag,
} from '../../commons/models/domain/unternehmer';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { UnternehmerService } from '../../services/domain/unternehmer.service';
import { StammdatenStore } from '../app/stammdaten.store';

// ===== Top-Level Helper =====================

export type TUnternehmerSnapshot = {
  readonly unternehmer: readonly IUnternehmerEintrag[];
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TUnternehmerState = TUnternehmerSnapshot;

const initialState: TUnternehmerState = {
  unternehmer: [],
  download: false,
  isLoaded: false,
  inProgress: false,
  error: null,
};

function sortUnternehmer(
  unternehmer: readonly IUnternehmerEintrag[],
): readonly IUnternehmerEintrag[] {
  return [...unternehmer].sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
}

function getNaechsteNummer(unternehmer: readonly IUnternehmerEintrag[]): number {
  return Math.max(0, ...unternehmer.map((eintrag) => eintrag.nummer)) + 1;
}

export const UnternehmerStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TUnternehmerState>(initialState),
  withMethods(
    (
      store,
      unternehmerService = inject(UnternehmerService),
      stammdatenStore = inject(StammdatenStore),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      // ===== Methoden: Laden ======================

      /**
       * Lädt alle Unternehmer und aktualisiert die sortierte Unternehmerliste im Store.
       *
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
       */
      async function loadUnternehmer(): Promise<void> {
        if (store.download() || store.isLoaded()) return;

        patchState(store, { download: true, isLoaded: false, error: null });
        try {
          const unternehmer = stammdatenStore.isLoaded()
            ? stammdatenStore.unternehmer()
            : await unternehmerService.loadUnternehmer();
          patchState(store, { unternehmer: sortUnternehmer(unternehmer), isLoaded: true });
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { download: false });
        }
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt einen Unternehmer mit der nächsten freien Nummer an und aktualisiert die Liste.
       *
       * @param anlage - Die Daten des neu anzulegenden Unternehmers.
       * @returns Das Anlageergebnis mit Dokument-ID, Nummer und Anzeigename.
       * @throws Wenn die Unternehmerliste nicht vollständig geladen ist oder das Speichern fehlschlägt.
       */
      async function createUnternehmer(
        anlage: IUnternehmerAnlage,
      ): Promise<IUnternehmerAnlageErgebnis> {
        if (!store.isLoaded()) {
          throw new Error('Die Unternehmer müssen vor der Anlage vollständig geladen werden.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          const nummer = getNaechsteNummer(store.unternehmer());
          const ergebnis = await unternehmerService.createUnternehmer(anlage, nummer);
          stammdatenStore.upsertUnternehmer(ergebnis);
          const unternehmer = store.unternehmer().filter((eintrag) => eintrag.id !== ergebnis.id);
          patchState(store, {
            unternehmer: sortUnternehmer([...unternehmer, ergebnis]),
          });
          return ergebnis;
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Löscht einen Unternehmer und entfernt ihn aus den geladenen Stammdaten.
       *
       * @param unternehmerId - Die Dokument-ID des zu löschenden Unternehmers.
       * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
       * @throws Wenn die Unternehmerliste nicht geladen ist oder die Löschung fehlschlägt.
       */
      async function deleteUnternehmer(unternehmerId: string): Promise<void> {
        if (
          !store.isLoaded() ||
          !store.unternehmer().some((eintrag) => eintrag.id === unternehmerId)
        ) {
          throw new Error('Der Unternehmer ist nicht in der geladenen Liste enthalten.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          await unternehmerService.deleteUnternehmer(unternehmerId);
          stammdatenStore.removeUnternehmer(unternehmerId);
          patchState(store, {
            unternehmer: store.unternehmer().filter((eintrag) => eintrag.id !== unternehmerId),
          });
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Liefert eine Momentaufnahme des aktuellen Unternehmer-Store-Zustands.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TUnternehmerSnapshot {
        return untracked(() => ({
          unternehmer: store.unternehmer(),
          download: store.download(),
          isLoaded: store.isLoaded(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      /**
       * Entfernt die aktuelle Fehlermeldung des Unternehmer-Stores.
       */
      function clearError(): void {
        patchState(store, { error: null });
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'UnternehmerStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadUnternehmer,
        createUnternehmer,
        deleteUnternehmer,
        snapshot,
        clearError,
      };
    },
  ),
);
