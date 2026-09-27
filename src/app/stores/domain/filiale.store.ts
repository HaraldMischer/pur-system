// pur-system/src/app/stores/domain/filiale.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import {
  IFilialeAnlage,
  IFilialeAnlageErgebnis,
  IFilialeEintrag,
} from '../../commons/models/domain/filiale';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { FilialeService } from '../../services/domain/filiale.service';
import { StammdatenStore } from '../app/stammdaten.store';

// ===== Top-Level Helper =====================

export type TFilialeSnapshot = {
  readonly filialen: readonly IFilialeEintrag[];
  readonly unternehmerId: string | null;
  readonly firmaId: string | null;
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TFilialeState = TFilialeSnapshot;

const initialState: TFilialeState = {
  filialen: [],
  unternehmerId: null,
  firmaId: null,
  download: false,
  isLoaded: false,
  inProgress: false,
  error: null,
};

function sortFilialen(filialen: readonly IFilialeEintrag[]): readonly IFilialeEintrag[] {
  return [...filialen].sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
}

function getNaechsteNummer(filialen: readonly IFilialeEintrag[]): number {
  return Math.max(0, ...filialen.map((eintrag) => eintrag.nummer)) + 1;
}

export const FilialeStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TFilialeState>(initialState),
  withMethods(
    (
      store,
      filialeService = inject(FilialeService),
      stammdatenStore = inject(StammdatenStore),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      // ===== Methoden: Laden ======================

      /**
       * Lädt die Filialen einer Firma und aktualisiert die sortierte Filialliste.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @param firmaId - Die Dokument-ID der ausgewählten Firma.
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
       */
      async function loadFilialen(unternehmerId: string, firmaId: string): Promise<void> {
        const gleicherKontext =
          store.unternehmerId() === unternehmerId && store.firmaId() === firmaId;
        if (gleicherKontext && (store.download() || store.isLoaded())) return;

        patchState(store, {
          filialen: [],
          unternehmerId,
          firmaId,
          download: true,
          isLoaded: false,
          error: null,
        });
        try {
          const filialen = stammdatenStore.isLoaded()
            ? stammdatenStore.getFilialen(unternehmerId, firmaId)
            : await filialeService.loadFilialen(unternehmerId, firmaId);
          if (store.unternehmerId() === unternehmerId && store.firmaId() === firmaId) {
            patchState(store, { filialen: sortFilialen(filialen), isLoaded: true });
          }
        } catch (error: unknown) {
          if (store.unternehmerId() === unternehmerId && store.firmaId() === firmaId) {
            patchState(store, { error: getFirebaseErrorMessage(error) });
          }
          throw error;
        } finally {
          if (store.unternehmerId() === unternehmerId && store.firmaId() === firmaId) {
            patchState(store, { download: false });
          }
        }
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt eine Filiale unter der geladenen Firma an und aktualisiert die Filialliste.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @param firmaId - Die Dokument-ID der ausgewählten Firma.
       * @param anlage - Die Daten der neu anzulegenden Filiale.
       * @returns Das Anlageergebnis mit Dokument-ID, Nummer und Anzeigename.
       * @throws Wenn die Filialliste nicht passend geladen ist oder das Speichern fehlschlägt.
       */
      async function createFiliale(
        unternehmerId: string,
        firmaId: string,
        anlage: IFilialeAnlage,
      ): Promise<IFilialeAnlageErgebnis> {
        if (
          !store.isLoaded() ||
          store.unternehmerId() !== unternehmerId ||
          store.firmaId() !== firmaId
        ) {
          throw new Error('Die Filialen müssen vor der Anlage vollständig geladen werden.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          const nummer = getNaechsteNummer(store.filialen());
          const ergebnis = await filialeService.createFiliale(
            unternehmerId,
            firmaId,
            anlage,
            nummer,
          );
          const filiale: IFilialeEintrag = {
            ...anlage,
            ...ergebnis,
            aktiv: true,
          };
          stammdatenStore.upsertFiliale(unternehmerId, firmaId, filiale);
          const filialen = store.filialen().filter((eintrag) => eintrag.id !== filiale.id);
          patchState(store, { filialen: sortFilialen([...filialen, filiale]) });
          return ergebnis;
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Löscht eine Filiale und entfernt sie aus dem geladenen Filialkontext.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der übergeordneten Firma.
       * @param filialId - Die Dokument-ID der zu löschenden Filiale.
       * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
       * @throws Wenn der Filialkontext nicht passt oder die Löschung fehlschlägt.
       */
      async function deleteFiliale(
        unternehmerId: string,
        firmaId: string,
        filialId: string,
      ): Promise<void> {
        if (
          !store.isLoaded() ||
          store.unternehmerId() !== unternehmerId ||
          store.firmaId() !== firmaId ||
          !store.filialen().some((eintrag) => eintrag.id === filialId)
        ) {
          throw new Error('Die Filiale ist nicht in der geladenen Liste enthalten.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          await filialeService.deleteFiliale(unternehmerId, firmaId, filialId);
          stammdatenStore.removeFiliale(unternehmerId, firmaId, filialId);
          patchState(store, {
            filialen: store.filialen().filter((eintrag) => eintrag.id !== filialId),
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
       * Setzt die Filialliste und ihren Hierarchiebezug zurück.
       */
      function resetFilialen(): void {
        patchState(store, initialState);
      }

      /**
       * Entfernt die aktuelle Fehlermeldung des Filiale-Stores.
       */
      function clearError(): void {
        patchState(store, { error: null });
      }

      /**
       * Liefert eine Momentaufnahme des aktuellen Filiale-Store-Zustands.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TFilialeSnapshot {
        return untracked(() => ({
          filialen: store.filialen(),
          unternehmerId: store.unternehmerId(),
          firmaId: store.firmaId(),
          download: store.download(),
          isLoaded: store.isLoaded(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'FilialeStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadFilialen,
        createFiliale,
        deleteFiliale,
        resetFilialen,
        clearError,
        snapshot,
      };
    },
  ),
);
