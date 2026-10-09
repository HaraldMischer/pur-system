// pur-system/src/app/stores/domain/schichtvorlage.store.ts

import { DestroyRef, computed, inject, untracked } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { environment } from '../../../environments/environment';
import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  ISchichtvorlageAktualisierung,
  ISchichtvorlageAnlage,
  ISchichtvorlageEintrag,
} from '../../commons/models/domain/schichtvorlage';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { SchichtvorlageService } from '../../services/domain/schichtvorlage.service';
import { BenutzerStore } from '../app/benutzer.store';

// ===== Top-Level Helper =====================

export type TSchichtvorlageSnapshot = {
  readonly schichtvorlagen: readonly ISchichtvorlageEintrag[];
  readonly selectedUnternehmerId: string | null;
  readonly selectedFirmaId: string | null;
  readonly selectedFilialeId: string | null;
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TSchichtvorlageState = TSchichtvorlageSnapshot;

const initialState: TSchichtvorlageState = {
  schichtvorlagen: [],
  selectedUnternehmerId: null,
  selectedFirmaId: null,
  selectedFilialeId: null,
  download: false,
  isLoaded: false,
  inProgress: false,
  error: null,
};

function getPfadSchluessel(pfad: IFilialPfad): string {
  return JSON.stringify([pfad.unternehmerId, pfad.firmaId, pfad.filialeId]);
}

function sortSchichtvorlagen(a: ISchichtvorlageEintrag, b: ISchichtvorlageEintrag): number {
  return (
    a.beginnLokalzeit.localeCompare(b.beginnLokalzeit) ||
    a.bezeichnung.localeCompare(b.bezeichnung, 'de')
  );
}

export const SchichtvorlageStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TSchichtvorlageState>(initialState),
  withComputed((store) => {
    const activeSchichtvorlagen = computed(() => {
      return store.schichtvorlagen().filter((vorlage) => vorlage.aktiv);
    });

    return { activeSchichtvorlagen };
  }),
  withMethods(
    (
      store,
      schichtvorlageService = inject(SchichtvorlageService),
      benutzerStore = inject(BenutzerStore),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;
      let ladeauftrag: { key: string; promise: Promise<void> } | null = null;

      // ===== Methoden: Laden ======================

      /**
       * Lädt alle Schichtvorlagen einer Filiale und ersetzt einen vorherigen Filialkontext.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @param strategie - Datenquellenstrategie für den Ladevorgang.
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Gibt Fehler des Schichtvorlagen-Service weiter.
       */
      function loadSchichtvorlagen(
        pfad: IFilialPfad,
        strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
      ): Promise<void> {
        const pfadSchluessel = getPfadSchluessel(pfad);
        const gleicherKontext = isSelectedPfad(pfad);
        if (gleicherKontext && store.isLoaded()) return Promise.resolve();
        if (ladeauftrag?.key === `${pfadSchluessel}:${strategie}`) return ladeauftrag.promise;

        const aktuelleGeneration = ++generation;
        const key = `${pfadSchluessel}:${strategie}`;
        patchState(store, {
          schichtvorlagen: [],
          selectedUnternehmerId: pfad.unternehmerId,
          selectedFirmaId: pfad.firmaId,
          selectedFilialeId: pfad.filialeId,
          download: true,
          isLoaded: false,
          inProgress: false,
          error: null,
        });
        const promise = executeLoad(pfad, strategie, key, aktuelleGeneration);
        ladeauftrag = { key, promise };
        return promise;
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt eine Schichtvorlage im vollständig geladenen Filialkontext an.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @param anlage - Fachliche Daten der neuen Schichtvorlage.
       * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
       * @throws Wenn der Filialkontext oder die Benutzeridentität fehlt oder das Schreiben fehlschlägt.
       */
      async function createSchichtvorlage(
        pfad: IFilialPfad,
        anlage: ISchichtvorlageAnlage,
      ): Promise<void> {
        requireSchreibkontext(pfad);
        const benutzerUid = requireBenutzerUid();
        const schreibGeneration = generation;
        await executeWrite(async () => {
          const schichtvorlage = await schichtvorlageService.createSchichtvorlage(
            pfad,
            anlage,
            benutzerUid,
          );
          if (schreibGeneration !== generation) return;
          patchState(store, {
            schichtvorlagen: [...store.schichtvorlagen(), schichtvorlage].sort(sortSchichtvorlagen),
          });
        });
      }

      /**
       * Aktualisiert eine Schichtvorlage im vollständig geladenen Filialkontext.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @param schichtvorlageId - Dokument-ID der Schichtvorlage.
       * @param aktualisierung - Vollständige bearbeitbare Vorlagendaten.
       * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
       * @throws Wenn Kontext, Vorlage oder Benutzeridentität fehlt oder das Schreiben fehlschlägt.
       */
      async function updateSchichtvorlage(
        pfad: IFilialPfad,
        schichtvorlageId: string,
        aktualisierung: ISchichtvorlageAktualisierung,
      ): Promise<void> {
        const schichtvorlage = requireSchichtvorlage(pfad, schichtvorlageId);
        const benutzerUid = requireBenutzerUid();
        const schreibGeneration = generation;
        await executeWrite(async () => {
          await schichtvorlageService.updateSchichtvorlage(
            pfad,
            schichtvorlageId,
            aktualisierung,
            benutzerUid,
          );
          if (schreibGeneration !== generation) return;
          const aktualisierteSchichtvorlage: ISchichtvorlageEintrag = {
            ...schichtvorlage,
            ...aktualisierung,
            bezeichnung: aktualisierung.bezeichnung.trim(),
            standardpauseMinuten: aktualisierung.standardpauseMinuten ?? 0,
            aktualisiertVonUid: benutzerUid,
          };
          patchState(store, {
            schichtvorlagen: store
              .schichtvorlagen()
              .map((vorlage) => {
                return vorlage.id === schichtvorlageId ? aktualisierteSchichtvorlage : vorlage;
              })
              .sort(sortSchichtvorlagen),
          });
        });
      }

      /**
       * Deaktiviert eine Schichtvorlage im vollständig geladenen Filialkontext.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @param schichtvorlageId - Dokument-ID der Schichtvorlage.
       * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
       * @throws Wenn Kontext, Vorlage oder Benutzeridentität fehlt oder das Schreiben fehlschlägt.
       */
      async function deactivateSchichtvorlage(
        pfad: IFilialPfad,
        schichtvorlageId: string,
      ): Promise<void> {
        requireSchichtvorlage(pfad, schichtvorlageId);
        const benutzerUid = requireBenutzerUid();
        const schreibGeneration = generation;
        await executeWrite(async () => {
          await schichtvorlageService.deactivateSchichtvorlage(pfad, schichtvorlageId, benutzerUid);
          if (schreibGeneration !== generation) return;
          patchState(store, {
            schichtvorlagen: store.schichtvorlagen().map((vorlage) => {
              return vorlage.id === schichtvorlageId
                ? { ...vorlage, aktiv: false, aktualisiertVonUid: benutzerUid }
                : vorlage;
            }),
          });
        });
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Setzt alle sitzungsbezogenen Schichtvorlagendaten zurück.
       */
      function resetSchichtvorlagen(): void {
        generation += 1;
        ladeauftrag = null;
        patchState(store, initialState);
      }

      /**
       * Entfernt die aktuelle Fehlermeldung des Schichtvorlagen-Stores.
       */
      function clearError(): void {
        patchState(store, { error: null });
      }

      /**
       * Liefert eine Momentaufnahme des aktuellen Schichtvorlagen-Stores.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TSchichtvorlageSnapshot {
        return untracked(() => ({
          schichtvorlagen: store.schichtvorlagen(),
          selectedUnternehmerId: store.selectedUnternehmerId(),
          selectedFirmaId: store.selectedFirmaId(),
          selectedFilialeId: store.selectedFilialeId(),
          download: store.download(),
          isLoaded: store.isLoaded(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      // ===== Interne Helfer =======================

      async function executeLoad(
        pfad: IFilialPfad,
        strategie: TFirestoreLesestrategie,
        key: string,
        aktuelleGeneration: number,
      ): Promise<void> {
        try {
          const schichtvorlagen = await schichtvorlageService.loadSchichtvorlagen(pfad, strategie);
          if (aktuelleGeneration !== generation) return;
          patchState(store, {
            schichtvorlagen,
            download: false,
            isLoaded: true,
            error: null,
          });
        } catch (error: unknown) {
          if (aktuelleGeneration === generation) {
            patchState(store, {
              download: false,
              isLoaded: false,
              error: getFirebaseErrorMessage(error),
            });
          }
          throw error;
        } finally {
          if (ladeauftrag?.key === key) ladeauftrag = null;
        }
      }

      async function executeWrite(aktion: () => Promise<void>): Promise<void> {
        if (store.inProgress()) {
          throw new Error('Ein Schichtvorlagen-Schreibvorgang läuft bereits.');
        }
        const aktuelleGeneration = generation;
        patchState(store, { inProgress: true, error: null });
        try {
          await aktion();
        } catch (error: unknown) {
          if (aktuelleGeneration === generation) {
            patchState(store, { error: getFirebaseErrorMessage(error) });
          }
          throw error;
        } finally {
          if (aktuelleGeneration === generation) {
            patchState(store, { inProgress: false });
          }
        }
      }

      function isSelectedPfad(pfad: IFilialPfad): boolean {
        return (
          store.selectedUnternehmerId() === pfad.unternehmerId &&
          store.selectedFirmaId() === pfad.firmaId &&
          store.selectedFilialeId() === pfad.filialeId
        );
      }

      function requireSchreibkontext(pfad: IFilialPfad): void {
        if (!store.isLoaded() || !isSelectedPfad(pfad)) {
          throw new Error(
            'Die Schichtvorlagen der Filiale müssen vor dem Schreiben geladen werden.',
          );
        }
      }

      function requireSchichtvorlage(
        pfad: IFilialPfad,
        schichtvorlageId: string,
      ): ISchichtvorlageEintrag {
        requireSchreibkontext(pfad);
        const schichtvorlage = store.schichtvorlagen().find((vorlage) => {
          return vorlage.id === schichtvorlageId;
        });
        if (!schichtvorlage) {
          throw new Error('Die Schichtvorlage wurde im geladenen Filialkontext nicht gefunden.');
        }
        return schichtvorlage;
      }

      function requireBenutzerUid(): string {
        const benutzerUid = benutzerStore.benutzerId();
        if (!benutzerUid) {
          throw new Error('Für den Schreibvorgang fehlt die Benutzeridentität.');
        }
        return benutzerUid;
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'SchichtvorlageStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadSchichtvorlagen,
        createSchichtvorlage,
        updateSchichtvorlage,
        deactivateSchichtvorlage,
        resetSchichtvorlagen,
        clearError,
        snapshot,
      };
    },
  ),
);
