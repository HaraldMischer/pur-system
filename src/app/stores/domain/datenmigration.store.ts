// pur-system/src/app/stores/domain/datenmigration.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { TDatenmigrationsstatusMap } from '../../commons/models/domain/datenmigration';
import { IPurCustomerEintrag } from '../../commons/models/legacy/pur-customer';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { DatenmigrationService } from '../../services/domain/datenmigration.service';

// ===== Top-Level Helper =====================

export type TDatenmigrationSnapshot = {
  readonly purCustomers: readonly IPurCustomerEintrag[];
  readonly selectedPurCustomerId: string | null;
  readonly migrationsstatus: TDatenmigrationsstatusMap;
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TDatenmigrationState = TDatenmigrationSnapshot;

const initialState: TDatenmigrationState = {
  purCustomers: [],
  selectedPurCustomerId: null,
  migrationsstatus: {},
  download: false,
  isLoaded: false,
  inProgress: false,
  error: null,
};

export const DatenmigrationStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TDatenmigrationState>(initialState),
  withMethods(
    (
      store,
      datenmigrationService = inject(DatenmigrationService),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let auswahlVersion = 0;

      // ===== Methoden: Laden ======================

      /**
       * Lädt alle Legacy-Kunden für die spätere Einzelauswahl.
       *
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
       */
      async function loadPurCustomers(): Promise<void> {
        if (store.download() || store.isLoaded()) return;

        patchState(store, { download: true, isLoaded: false, error: null });
        try {
          const purCustomers = await datenmigrationService.loadPurCustomers();
          patchState(store, { purCustomers, isLoaded: true });
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { download: false });
        }
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Migriert den ausgewählten Legacy-Kunden zum Unternehmer und lädt seinen Status neu.
       *
       * @returns Ein Promise, das nach Migration und Statusaktualisierung abgeschlossen ist.
       * @throws Wenn kein Kunde ausgewählt ist oder die Migration technisch fehlschlägt.
       */
      async function migrateUnternehmer(): Promise<void> {
        if (store.inProgress()) return;

        const purCustomer = store
          .purCustomers()
          .find((eintrag) => eintrag.id === store.selectedPurCustomerId());
        if (!purCustomer) {
          throw new Error('Vor der Migration muss ein Legacy-Kunde ausgewählt werden.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          await datenmigrationService.migrateUnternehmer(purCustomer);
          const migrationsstatus = await datenmigrationService.loadMigrationsstatus(purCustomer.id);
          if (store.selectedPurCustomerId() === purCustomer.id) {
            patchState(store, { migrationsstatus });
          }
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Wählt einen Legacy-Kunden aus und lädt ausschließlich dessen Migrationsstatus.
       *
       * @param purCustomerId - Dokument-ID des Kunden oder `null` zum Aufheben der Auswahl.
       * @returns Ein Promise, das nach dem Laden des zugehörigen Status abgeschlossen ist.
       * @throws Wenn die ID nicht in der geladenen Kundenliste enthalten ist oder das Laden fehlschlägt.
       */
      async function selectPurCustomer(purCustomerId: string | null): Promise<void> {
        const aktuelleVersion = ++auswahlVersion;
        if (purCustomerId === null) {
          patchState(store, {
            selectedPurCustomerId: null,
            migrationsstatus: {},
            error: null,
          });
          return;
        }
        if (!store.purCustomers().some((eintrag) => eintrag.id === purCustomerId)) {
          throw new Error('Der Legacy-Kunde ist nicht in der geladenen Liste enthalten.');
        }

        patchState(store, {
          selectedPurCustomerId: purCustomerId,
          migrationsstatus: {},
          download: true,
          error: null,
        });
        try {
          const migrationsstatus = await datenmigrationService.loadMigrationsstatus(purCustomerId);
          if (aktuelleVersion === auswahlVersion) patchState(store, { migrationsstatus });
        } catch (error: unknown) {
          if (aktuelleVersion === auswahlVersion) {
            patchState(store, { error: getFirebaseErrorMessage(error) });
          }
          throw error;
        } finally {
          if (aktuelleVersion === auswahlVersion) patchState(store, { download: false });
        }
      }

      /**
       * Liefert eine Momentaufnahme des aktuellen Datenmigration-Store-Zustands.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TDatenmigrationSnapshot {
        return untracked(() => ({
          purCustomers: store.purCustomers(),
          selectedPurCustomerId: store.selectedPurCustomerId(),
          migrationsstatus: store.migrationsstatus(),
          download: store.download(),
          isLoaded: store.isLoaded(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      /**
       * Entfernt die aktuelle Fehlermeldung des Datenmigration-Stores.
       */
      function clearError(): void {
        patchState(store, { error: null });
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'DatenmigrationStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadPurCustomers,
        migrateUnternehmer,
        selectPurCustomer,
        snapshot,
        clearError,
      };
    },
  ),
);
