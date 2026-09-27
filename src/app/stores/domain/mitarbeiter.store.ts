// pur-system/src/app/stores/domain/mitarbeiter.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import {
  IMitarbeiterAktualisierung,
  IMitarbeiterAnlage,
  IMitarbeiterAnlageErgebnis,
  IMitarbeiterEintrag,
} from '../../commons/models/domain/mitarbeiter';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { MitarbeiterService } from '../../services/domain/mitarbeiter.service';

// ===== Top-Level Helper =====================

export type TMitarbeiterSnapshot = {
  readonly mitarbeiter: readonly IMitarbeiterEintrag[];
  readonly unternehmerId: string | null;
  readonly firmaId: string | null;
  readonly filialId: string | null;
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TMitarbeiterState = TMitarbeiterSnapshot;

const initialState: TMitarbeiterState = {
  mitarbeiter: [],
  unternehmerId: null,
  firmaId: null,
  filialId: null,
  download: false,
  isLoaded: false,
  inProgress: false,
  error: null,
};

function sortMitarbeiter(
  mitarbeiter: readonly IMitarbeiterEintrag[],
): readonly IMitarbeiterEintrag[] {
  return [...mitarbeiter].sort((a, b) => {
    const nachname = a.person.nachname.localeCompare(b.person.nachname, 'de');
    return nachname || a.person.vorname.localeCompare(b.person.vorname, 'de');
  });
}

export const MitarbeiterStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TMitarbeiterState>(initialState),
  withMethods(
    (
      store,
      mitarbeiterService = inject(MitarbeiterService),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;

      // ===== Methoden: Laden ======================

      /**
       * Lädt die Mitarbeiter einer Firma und aktualisiert die sortierte Mitarbeiterliste.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @param firmaId - Die Dokument-ID der ausgewählten Firma.
       * @param filialId - Optionale Filial-ID zur Begrenzung eines Filialkontos.
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
       */
      async function loadMitarbeiter(
        unternehmerId: string,
        firmaId: string,
        filialId?: string,
      ): Promise<void> {
        const gleicherKontext =
          store.unternehmerId() === unternehmerId &&
          store.firmaId() === firmaId &&
          store.filialId() === (filialId ?? null);
        if (gleicherKontext && (store.download() || store.isLoaded())) return;

        const aktuelleGeneration = ++generation;
        patchState(store, {
          mitarbeiter: [],
          unternehmerId,
          firmaId,
          filialId: filialId ?? null,
          download: true,
          isLoaded: false,
          error: null,
        });
        try {
          const mitarbeiter = await mitarbeiterService.loadMitarbeiter(
            unternehmerId,
            firmaId,
            filialId,
          );
          if (
            aktuelleGeneration === generation &&
            store.unternehmerId() === unternehmerId &&
            store.firmaId() === firmaId &&
            store.filialId() === (filialId ?? null)
          ) {
            patchState(store, {
              mitarbeiter: sortMitarbeiter(mitarbeiter),
              isLoaded: true,
            });
          }
        } catch (error: unknown) {
          if (
            aktuelleGeneration === generation &&
            store.unternehmerId() === unternehmerId &&
            store.firmaId() === firmaId &&
            store.filialId() === (filialId ?? null)
          ) {
            patchState(store, { error: getFirebaseErrorMessage(error) });
          }
          throw error;
        } finally {
          if (
            aktuelleGeneration === generation &&
            store.unternehmerId() === unternehmerId &&
            store.firmaId() === firmaId &&
            store.filialId() === (filialId ?? null)
          ) {
            patchState(store, { download: false });
          }
        }
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt einen Mitarbeiter unter der geladenen Firma an und aktualisiert die Liste.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @param firmaId - Die Dokument-ID der ausgewählten Firma.
       * @param anlage - Die Daten des neu anzulegenden Mitarbeiters.
       * @returns Das Anlageergebnis mit der erzeugten Dokument-ID.
       * @throws Wenn die Mitarbeiterliste nicht passend geladen ist oder das Speichern fehlschlägt.
       */
      async function createMitarbeiter(
        unternehmerId: string,
        firmaId: string,
        anlage: IMitarbeiterAnlage,
      ): Promise<IMitarbeiterAnlageErgebnis> {
        pruefeGeladenenKontext(unternehmerId, firmaId);

        patchState(store, { inProgress: true, error: null });
        try {
          const ergebnis = await mitarbeiterService.createMitarbeiter(
            unternehmerId,
            firmaId,
            anlage,
          );
          const mitarbeiter: IMitarbeiterEintrag = {
            ...anlage,
            id: ergebnis.id,
            aktiv: true,
          };
          patchState(store, {
            mitarbeiter: sortMitarbeiter([...store.mitarbeiter(), mitarbeiter]),
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
       * Aktualisiert einen Mitarbeiter der geladenen Firma und ersetzt ihn in der Liste.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @param firmaId - Die Dokument-ID der ausgewählten Firma.
       * @param mitarbeiterId - Die Dokument-ID des Mitarbeiters.
       * @param aktualisierung - Die bearbeitbaren Mitarbeiterdaten.
       * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
       * @throws Wenn Kontext oder Mitarbeiter fehlen oder das Speichern fehlschlägt.
       */
      async function updateMitarbeiter(
        unternehmerId: string,
        firmaId: string,
        mitarbeiterId: string,
        aktualisierung: IMitarbeiterAktualisierung,
      ): Promise<void> {
        pruefeGeladenenKontext(unternehmerId, firmaId);
        if (!store.mitarbeiter().some((eintrag) => eintrag.id === mitarbeiterId)) {
          throw new Error('Der Mitarbeiter ist nicht in der geladenen Liste enthalten.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          await mitarbeiterService.updateMitarbeiter(
            unternehmerId,
            firmaId,
            mitarbeiterId,
            aktualisierung,
          );
          const mitarbeiter = store.mitarbeiter().map((eintrag) => {
            return eintrag.id === mitarbeiterId
              ? { id: mitarbeiterId, ...aktualisierung }
              : eintrag;
          });
          patchState(store, { mitarbeiter: sortMitarbeiter(mitarbeiter) });
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Löscht einen Mitarbeiter der geladenen Firma und entfernt ihn aus der Liste.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @param firmaId - Die Dokument-ID der ausgewählten Firma.
       * @param mitarbeiterId - Die Dokument-ID des Mitarbeiters.
       * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
       * @throws Wenn Kontext oder Mitarbeiter fehlen oder die Löschung fehlschlägt.
       */
      async function deleteMitarbeiter(
        unternehmerId: string,
        firmaId: string,
        mitarbeiterId: string,
      ): Promise<void> {
        pruefeGeladenenKontext(unternehmerId, firmaId);
        if (!store.mitarbeiter().some((eintrag) => eintrag.id === mitarbeiterId)) {
          throw new Error('Der Mitarbeiter ist nicht in der geladenen Liste enthalten.');
        }

        patchState(store, { inProgress: true, error: null });
        try {
          await mitarbeiterService.deleteMitarbeiter(unternehmerId, firmaId, mitarbeiterId);
          patchState(store, {
            mitarbeiter: store.mitarbeiter().filter((eintrag) => eintrag.id !== mitarbeiterId),
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
       * Setzt die Mitarbeiterliste und ihren Firmenkontext zurück.
       */
      function resetMitarbeiter(): void {
        generation += 1;
        patchState(store, initialState);
      }

      /**
       * Entfernt die aktuelle Fehlermeldung des Mitarbeiter-Stores.
       */
      function clearError(): void {
        patchState(store, { error: null });
      }

      /**
       * Liefert eine Momentaufnahme des aktuellen Mitarbeiter-Store-Zustands.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TMitarbeiterSnapshot {
        return untracked(() => ({
          mitarbeiter: store.mitarbeiter(),
          unternehmerId: store.unternehmerId(),
          firmaId: store.firmaId(),
          filialId: store.filialId(),
          download: store.download(),
          isLoaded: store.isLoaded(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      function pruefeGeladenenKontext(unternehmerId: string, firmaId: string): void {
        if (
          !store.isLoaded() ||
          store.unternehmerId() !== unternehmerId ||
          store.firmaId() !== firmaId
        ) {
          throw new Error('Die Mitarbeiter müssen vor dem Schreiben vollständig geladen werden.');
        }
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'MitarbeiterStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadMitarbeiter,
        createMitarbeiter,
        updateMitarbeiter,
        deleteMitarbeiter,
        resetMitarbeiter,
        clearError,
        snapshot,
      };
    },
  ),
);
