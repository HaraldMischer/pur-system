// pur-system/src/app/stores/domain/datenmigration.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { TDatenmigrationsstatusMap } from '../../commons/models/domain/datenmigration';
import { IPurCustomerEintrag } from '../../commons/models/legacy/pur-customer';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { DebugLogService } from '../../services/core/debug-log.service';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { DatenmigrationService } from '../../services/domain/datenmigration.service';

// ===== Top-Level Helper =====================

export type TDatenmigrationSnapshot = {
  readonly purCustomers: readonly IPurCustomerEintrag[];
  readonly selectedPurCustomerId: string | null;
  readonly migrationsstatus: TDatenmigrationsstatusMap;
  readonly unternehmerZielDokumente: number | null;
  readonly firmenQuellDokumente: number | null;
  readonly firmenZielDokumente: number | null;
  readonly filialenQuellDokumente: number | null;
  readonly filialenZielDokumente: number | null;
  readonly mitarbeiterQuellDokumente: number | null;
  readonly mitarbeiterZielDokumente: number | null;
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
  unternehmerZielDokumente: null,
  firmenQuellDokumente: null,
  firmenZielDokumente: null,
  filialenQuellDokumente: null,
  filialenZielDokumente: null,
  mitarbeiterQuellDokumente: null,
  mitarbeiterZielDokumente: null,
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
      debugLogService = inject(DebugLogService),
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

      /**
       * Lädt den aktuellen Zielbestand des ausgewählten Unternehmers.
       *
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Wenn kein Kunde ausgewählt ist oder das Laden fehlschlägt.
       */
      async function loadUnternehmerZiel(): Promise<void> {
        if (store.download() || store.unternehmerZielDokumente() !== null) return;

        const purCustomerId = store.selectedPurCustomerId();
        if (!purCustomerId) {
          throw new Error('Vor dem Laden muss ein Legacy-Kunde ausgewählt werden.');
        }
        const aktuelleVersion = auswahlVersion;
        const anzeigename =
          store.purCustomers().find((eintrag) => eintrag.id === purCustomerId)?.anzeigename ??
          purCustomerId;

        patchState(store, { download: true, error: null });
        try {
          const zielDokumente =
            await datenmigrationService.loadUnternehmerZielDokumente(purCustomerId);
          if (aktuelleVersion !== auswahlVersion) return;

          patchState(store, { unternehmerZielDokumente: zielDokumente });
          debugLogService.logDatenflussTitel('DATENMIGRATION ');
          debugLogService.logDatenGeladen(`Ziel-Unternehmer | ${anzeigename}`, zielDokumente);
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
       * Lädt und zählt Quelle und Ziel der Firmen des ausgewählten Kunden.
       *
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Wenn kein Kunde ausgewählt ist oder das Laden fehlschlägt.
       */
      async function loadFirmenBestaende(): Promise<void> {
        if (
          store.download() ||
          (store.firmenQuellDokumente() !== null && store.firmenZielDokumente() !== null)
        ) {
          return;
        }

        const purCustomerId = store.selectedPurCustomerId();
        if (!purCustomerId) {
          throw new Error('Vor dem Laden muss ein Legacy-Kunde ausgewählt werden.');
        }
        const aktuelleVersion = auswahlVersion;
        const anzeigename =
          store.purCustomers().find((eintrag) => eintrag.id === purCustomerId)?.anzeigename ??
          purCustomerId;

        patchState(store, { download: true, error: null });
        try {
          const [purCompanies, zielDokumente] = await Promise.all([
            datenmigrationService.loadPurCompanies(purCustomerId),
            datenmigrationService.loadFirmenZielDokumente(purCustomerId),
          ]);
          if (aktuelleVersion !== auswahlVersion) return;

          patchState(store, {
            firmenQuellDokumente: purCompanies.length,
            firmenZielDokumente: zielDokumente,
          });
          debugLogService.logDatenflussTitel('DATENMIGRATION ');
          debugLogService.logDatenGeladen(`Legacy-Firmen | ${anzeigename}`, purCompanies.length);
          debugLogService.logDatenGeladen(`Ziel-Firmen | ${anzeigename}`, zielDokumente);
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
       * Lädt und zählt Quelle und Ziel der Filialen des ausgewählten Kunden.
       *
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Wenn kein Kunde ausgewählt ist oder das Laden fehlschlägt.
       */
      async function loadFilialenBestaende(): Promise<void> {
        if (
          store.download() ||
          (store.filialenQuellDokumente() !== null && store.filialenZielDokumente() !== null)
        ) {
          return;
        }

        const purCustomerId = store.selectedPurCustomerId();
        if (!purCustomerId) {
          throw new Error('Vor dem Laden muss ein Legacy-Kunde ausgewählt werden.');
        }
        const aktuelleVersion = auswahlVersion;
        const anzeigename =
          store.purCustomers().find((eintrag) => eintrag.id === purCustomerId)?.anzeigename ??
          purCustomerId;

        patchState(store, { download: true, error: null });
        try {
          const [purBranches, zielDokumente] = await Promise.all([
            datenmigrationService.loadPurBranches(purCustomerId),
            datenmigrationService.loadFilialenZielDokumente(purCustomerId),
          ]);
          if (aktuelleVersion !== auswahlVersion) return;

          patchState(store, {
            filialenQuellDokumente: purBranches.length,
            filialenZielDokumente: zielDokumente,
          });
          debugLogService.logDatenflussTitel('DATENMIGRATION ');
          debugLogService.logDatenGeladen(`Legacy-Filialen | ${anzeigename}`, purBranches.length);
          debugLogService.logDatenGeladen(`Ziel-Filialen | ${anzeigename}`, zielDokumente);
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
       * Lädt und zählt Quelle und Ziel der Mitarbeiter des ausgewählten Kunden.
       *
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Wenn kein Kunde ausgewählt ist oder das Laden fehlschlägt.
       */
      async function loadMitarbeiterBestaende(): Promise<void> {
        if (
          store.download() ||
          (store.mitarbeiterQuellDokumente() !== null && store.mitarbeiterZielDokumente() !== null)
        ) {
          return;
        }

        const purCustomerId = store.selectedPurCustomerId();
        if (!purCustomerId) {
          throw new Error('Vor dem Laden muss ein Legacy-Kunde ausgewählt werden.');
        }
        const aktuelleVersion = auswahlVersion;
        const anzeigename =
          store.purCustomers().find((eintrag) => eintrag.id === purCustomerId)?.anzeigename ??
          purCustomerId;

        patchState(store, { download: true, error: null });
        try {
          const [purEmployees, zielDokumente] = await Promise.all([
            datenmigrationService.loadPurEmployees(purCustomerId),
            datenmigrationService.loadMitarbeiterZielDokumente(purCustomerId),
          ]);
          if (aktuelleVersion !== auswahlVersion) return;

          patchState(store, {
            mitarbeiterQuellDokumente: purEmployees.length,
            mitarbeiterZielDokumente: zielDokumente,
          });
          debugLogService.logDatenflussTitel('DATENMIGRATION ');
          debugLogService.logDatenGeladen(
            `Legacy-Mitarbeiter | ${anzeigename}`,
            purEmployees.length,
          );
          debugLogService.logDatenGeladen(`Ziel-Mitarbeiter | ${anzeigename}`, zielDokumente);
        } catch (error: unknown) {
          if (aktuelleVersion === auswahlVersion) {
            patchState(store, { error: getFirebaseErrorMessage(error) });
          }
          throw error;
        } finally {
          if (aktuelleVersion === auswahlVersion) patchState(store, { download: false });
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
          const [migrationsstatus, zielDokumente] = await Promise.all([
            datenmigrationService.loadMigrationsstatus(purCustomer.id),
            datenmigrationService.loadUnternehmerZielDokumente(purCustomer.id),
          ]);
          if (store.selectedPurCustomerId() === purCustomer.id) {
            patchState(store, { migrationsstatus, unternehmerZielDokumente: zielDokumente });
          }
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Migriert die Firmen des ausgewählten Legacy-Kunden und lädt seinen Status neu.
       *
       * @returns Ein Promise, das nach Migration und Statusaktualisierung abgeschlossen ist.
       * @throws Wenn kein Kunde ausgewählt ist oder die Migration technisch fehlschlägt.
       */
      async function migrateFirmen(): Promise<void> {
        if (store.inProgress()) return;

        const purCustomerId = store.selectedPurCustomerId();
        if (!purCustomerId) {
          throw new Error('Vor der Migration muss ein Legacy-Kunde ausgewählt werden.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          await datenmigrationService.migrateFirmen(purCustomerId);
          const [migrationsstatus, zielDokumente] = await Promise.all([
            datenmigrationService.loadMigrationsstatus(purCustomerId),
            datenmigrationService.loadFirmenZielDokumente(purCustomerId),
          ]);
          if (store.selectedPurCustomerId() === purCustomerId) {
            patchState(store, {
              migrationsstatus,
              firmenQuellDokumente:
                migrationsstatus.firmen?.quellDokumente ?? store.firmenQuellDokumente(),
              firmenZielDokumente: zielDokumente,
            });
          }
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Migriert die Filialen des ausgewählten Legacy-Kunden und lädt seinen Status neu.
       *
       * @returns Ein Promise, das nach Migration und Statusaktualisierung abgeschlossen ist.
       * @throws Wenn kein Kunde ausgewählt ist oder die Migration technisch fehlschlägt.
       */
      async function migrateFilialen(): Promise<void> {
        if (store.inProgress()) return;

        const purCustomerId = store.selectedPurCustomerId();
        if (!purCustomerId) {
          throw new Error('Vor der Migration muss ein Legacy-Kunde ausgewählt werden.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          await datenmigrationService.migrateFilialen(purCustomerId);
          const [migrationsstatus, zielDokumente] = await Promise.all([
            datenmigrationService.loadMigrationsstatus(purCustomerId),
            datenmigrationService.loadFilialenZielDokumente(purCustomerId),
          ]);
          if (store.selectedPurCustomerId() === purCustomerId) {
            patchState(store, {
              migrationsstatus,
              filialenQuellDokumente:
                migrationsstatus.filialen?.quellDokumente ?? store.filialenQuellDokumente(),
              filialenZielDokumente: zielDokumente,
            });
          }
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Migriert die Mitarbeiter des ausgewählten Legacy-Kunden und lädt seinen Status neu.
       *
       * @returns Ein Promise, das nach Migration und Statusaktualisierung abgeschlossen ist.
       * @throws Wenn kein Kunde ausgewählt ist oder die Migration technisch fehlschlägt.
       */
      async function migrateMitarbeiter(): Promise<void> {
        if (store.inProgress()) return;

        const purCustomerId = store.selectedPurCustomerId();
        if (!purCustomerId) {
          throw new Error('Vor der Migration muss ein Legacy-Kunde ausgewählt werden.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          await datenmigrationService.migrateMitarbeiter(purCustomerId);
          const [migrationsstatus, zielDokumente] = await Promise.all([
            datenmigrationService.loadMigrationsstatus(purCustomerId),
            datenmigrationService.loadMitarbeiterZielDokumente(purCustomerId),
          ]);
          if (store.selectedPurCustomerId() === purCustomerId) {
            patchState(store, {
              migrationsstatus,
              mitarbeiterQuellDokumente:
                migrationsstatus.mitarbeiter?.quellDokumente ?? store.mitarbeiterQuellDokumente(),
              mitarbeiterZielDokumente: zielDokumente,
            });
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
            unternehmerZielDokumente: null,
            firmenQuellDokumente: null,
            firmenZielDokumente: null,
            filialenQuellDokumente: null,
            filialenZielDokumente: null,
            mitarbeiterQuellDokumente: null,
            mitarbeiterZielDokumente: null,
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
          unternehmerZielDokumente: null,
          firmenQuellDokumente: null,
          firmenZielDokumente: null,
          filialenQuellDokumente: null,
          filialenZielDokumente: null,
          mitarbeiterQuellDokumente: null,
          mitarbeiterZielDokumente: null,
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
          unternehmerZielDokumente: store.unternehmerZielDokumente(),
          firmenQuellDokumente: store.firmenQuellDokumente(),
          firmenZielDokumente: store.firmenZielDokumente(),
          filialenQuellDokumente: store.filialenQuellDokumente(),
          filialenZielDokumente: store.filialenZielDokumente(),
          mitarbeiterQuellDokumente: store.mitarbeiterQuellDokumente(),
          mitarbeiterZielDokumente: store.mitarbeiterZielDokumente(),
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
        loadUnternehmerZiel,
        loadFirmenBestaende,
        loadFilialenBestaende,
        loadMitarbeiterBestaende,
        migrateUnternehmer,
        migrateFirmen,
        migrateFilialen,
        migrateMitarbeiter,
        selectPurCustomer,
        snapshot,
        clearError,
      };
    },
  ),
);
