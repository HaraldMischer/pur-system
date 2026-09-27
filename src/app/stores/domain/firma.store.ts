// pur-system/src/app/stores/domain/firma.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import {
  IFirmaAnlage,
  IFirmaAnlageErgebnis,
  IFirmaEintrag,
} from '../../commons/models/domain/firma';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { FirmaService } from '../../services/domain/firma.service';
import { StammdatenStore } from '../app/stammdaten.store';

// ===== Top-Level Helper =====================

export type TFirmaSnapshot = {
  readonly firmen: readonly IFirmaEintrag[];
  readonly unternehmerId: string | null;
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TFirmaState = TFirmaSnapshot;

const initialState: TFirmaState = {
  firmen: [],
  unternehmerId: null,
  download: false,
  isLoaded: false,
  inProgress: false,
  error: null,
};

function sortFirmen(firmen: readonly IFirmaEintrag[]): readonly IFirmaEintrag[] {
  return [...firmen].sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
}

function getNaechsteNummer(firmen: readonly IFirmaEintrag[]): number {
  return Math.max(0, ...firmen.map((eintrag) => eintrag.nummer)) + 1;
}

export const FirmaStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TFirmaState>(initialState),
  withMethods(
    (
      store,
      firmaService = inject(FirmaService),
      stammdatenStore = inject(StammdatenStore),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      // ===== Methoden: Laden ======================

      /**
       * Lädt die Firmen eines Unternehmers und aktualisiert die sortierte Firmenliste.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
       */
      async function loadFirmen(unternehmerId: string): Promise<void> {
        if (store.unternehmerId() === unternehmerId && (store.download() || store.isLoaded())) {
          return;
        }

        patchState(store, {
          firmen: [],
          unternehmerId,
          download: true,
          isLoaded: false,
          error: null,
        });
        try {
          const firmen = stammdatenStore.isLoaded()
            ? stammdatenStore.getFirmen(unternehmerId)
            : await firmaService.loadFirmen(unternehmerId);
          if (store.unternehmerId() === unternehmerId) {
            patchState(store, { firmen: sortFirmen(firmen), isLoaded: true });
          }
        } catch (error: unknown) {
          if (store.unternehmerId() === unternehmerId) {
            patchState(store, { error: getFirebaseErrorMessage(error) });
          }
          throw error;
        } finally {
          if (store.unternehmerId() === unternehmerId) {
            patchState(store, { download: false });
          }
        }
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt eine Firma unter dem geladenen Unternehmer an und aktualisiert die Firmenliste.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @param anlage - Die Daten der neu anzulegenden Firma.
       * @returns Das Anlageergebnis mit Dokument-ID, Nummer und Anzeigename.
       * @throws Wenn die Firmenliste nicht passend geladen ist oder das Speichern fehlschlägt.
       */
      async function createFirma(
        unternehmerId: string,
        anlage: IFirmaAnlage,
      ): Promise<IFirmaAnlageErgebnis> {
        if (!store.isLoaded() || store.unternehmerId() !== unternehmerId) {
          throw new Error('Die Firmen müssen vor der Anlage vollständig geladen werden.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          const nummer = getNaechsteNummer(store.firmen());
          const ergebnis = await firmaService.createFirma(unternehmerId, anlage, nummer);
          const eintrag: IFirmaEintrag = {
            ...anlage,
            ...ergebnis,
            aktiv: true,
          };
          stammdatenStore.upsertFirma(unternehmerId, eintrag);
          const firmen = store.firmen().filter((eintrag) => eintrag.id !== ergebnis.id);
          patchState(store, { firmen: sortFirmen([...firmen, eintrag]) });
          return ergebnis;
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Löscht eine Firma und entfernt sie aus dem geladenen Firmenkontext.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der zu löschenden Firma.
       * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
       * @throws Wenn der Firmenkontext nicht passt oder die Löschung fehlschlägt.
       */
      async function deleteFirma(unternehmerId: string, firmaId: string): Promise<void> {
        if (
          !store.isLoaded() ||
          store.unternehmerId() !== unternehmerId ||
          !store.firmen().some((eintrag) => eintrag.id === firmaId)
        ) {
          throw new Error('Die Firma ist nicht in der geladenen Liste enthalten.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          await firmaService.deleteFirma(unternehmerId, firmaId);
          stammdatenStore.removeFirma(unternehmerId, firmaId);
          patchState(store, {
            firmen: store.firmen().filter((eintrag) => eintrag.id !== firmaId),
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
       * Setzt die Firmenliste und ihren Unternehmerbezug zurück.
       */
      function resetFirmen(): void {
        patchState(store, initialState);
      }

      /**
       * Entfernt die aktuelle Fehlermeldung des Firma-Stores.
       */
      function clearError(): void {
        patchState(store, { error: null });
      }

      /**
       * Liefert eine Momentaufnahme des aktuellen Firma-Store-Zustands.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TFirmaSnapshot {
        return untracked(() => ({
          firmen: store.firmen(),
          unternehmerId: store.unternehmerId(),
          download: store.download(),
          isLoaded: store.isLoaded(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot('FirmaStore', snapshot);
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadFirmen,
        createFirma,
        deleteFirma,
        resetFirmen,
        clearError,
        snapshot,
      };
    },
  ),
);
