// pur-system/src/app/stores/domain/schichtvorlage.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

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

export type TSchichtvorlageKontext = IFilialPfad & {
  readonly schichtvorlagen: readonly ISchichtvorlageEintrag[];
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly error: string | null;
};

export type TSchichtvorlageSnapshot = {
  readonly kontexte: Readonly<Record<string, TSchichtvorlageKontext>>;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TSchichtvorlageState = TSchichtvorlageSnapshot;

const initialState: TSchichtvorlageState = {
  kontexte: {},
  inProgress: false,
  error: null,
};

function getKontextSchluessel(pfad: IFilialPfad): string {
  return JSON.stringify([pfad.unternehmerId, pfad.firmaId, pfad.filialeId]);
}

function createLeerenKontext(pfad: IFilialPfad): TSchichtvorlageKontext {
  return {
    ...pfad,
    schichtvorlagen: [],
    download: false,
    isLoaded: false,
    error: null,
  };
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
  withMethods(
    (
      store,
      schichtvorlageService = inject(SchichtvorlageService),
      benutzerStore = inject(BenutzerStore),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;
      const kontextGenerationen = new Map<string, number>();
      const ladeauftraege = new Map<string, Promise<void>>();

      // ===== Methoden: Laden ======================

      /**
       * Lädt alle Schichtvorlagen einer Filiale, ohne andere Filialkontexte zu verwerfen.
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
        const kontext = getSchichtvorlageKontext(pfad);
        if (kontext?.isLoaded) return Promise.resolve();

        const kontextSchluessel = getKontextSchluessel(pfad);
        const auftragSchluessel = `${kontextSchluessel}:${strategie}`;
        const laufenderAuftrag = ladeauftraege.get(auftragSchluessel);
        if (laufenderAuftrag) return laufenderAuftrag;

        const aktuelleGeneration = generation;
        const kontextGeneration = (kontextGenerationen.get(kontextSchluessel) ?? 0) + 1;
        kontextGenerationen.set(kontextSchluessel, kontextGeneration);
        setKontext(pfad, {
          ...(kontext ?? createLeerenKontext(pfad)),
          download: true,
          isLoaded: false,
          error: null,
        });
        const promise = executeLoad(pfad, strategie, aktuelleGeneration, kontextGeneration);
        ladeauftraege.set(auftragSchluessel, promise);
        void promise.then(
          () => {
            removeLadeauftrag(auftragSchluessel, promise);
          },
          () => {
            removeLadeauftrag(auftragSchluessel, promise);
          },
        );
        return promise;
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt eine Schichtvorlage im vollständig geladenen Filialkontext an.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @param anlage - Fachliche Daten der neuen Schichtvorlage.
       * @throws Wenn der Filialkontext oder die Benutzeridentität fehlt oder das Schreiben fehlschlägt.
       */
      async function createSchichtvorlage(
        pfad: IFilialPfad,
        anlage: ISchichtvorlageAnlage,
      ): Promise<void> {
        const kontext = requireSchreibkontext(pfad);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          const schichtvorlage = await schichtvorlageService.createSchichtvorlage(
            pfad,
            anlage,
            benutzerUid,
          );
          const aktuellerKontext = getSchichtvorlageKontext(pfad);
          if (!aktuellerKontext || aktuellerKontext !== kontext) return;
          setKontext(pfad, {
            ...aktuellerKontext,
            schichtvorlagen: [...aktuellerKontext.schichtvorlagen, schichtvorlage].sort(
              sortSchichtvorlagen,
            ),
          });
        });
      }

      /**
       * Aktualisiert eine Schichtvorlage im vollständig geladenen Filialkontext.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @param schichtvorlageId - Dokument-ID der Schichtvorlage.
       * @param aktualisierung - Vollständige bearbeitbare Vorlagendaten.
       * @throws Wenn Kontext, Vorlage oder Benutzeridentität fehlt oder das Schreiben fehlschlägt.
       */
      async function updateSchichtvorlage(
        pfad: IFilialPfad,
        schichtvorlageId: string,
        aktualisierung: ISchichtvorlageAktualisierung,
      ): Promise<void> {
        const { kontext, schichtvorlage } = requireSchichtvorlage(pfad, schichtvorlageId);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          await schichtvorlageService.updateSchichtvorlage(
            pfad,
            schichtvorlageId,
            aktualisierung,
            benutzerUid,
          );
          const aktuellerKontext = getSchichtvorlageKontext(pfad);
          if (!aktuellerKontext || aktuellerKontext !== kontext) return;
          const aktualisierteSchichtvorlage: ISchichtvorlageEintrag = {
            ...schichtvorlage,
            ...aktualisierung,
            bezeichnung: aktualisierung.bezeichnung.trim(),
            standardpauseMinuten: aktualisierung.standardpauseMinuten ?? 0,
            aktualisiertVonUid: benutzerUid,
          };
          setKontext(pfad, {
            ...aktuellerKontext,
            schichtvorlagen: aktuellerKontext.schichtvorlagen
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
       * @throws Wenn Kontext, Vorlage oder Benutzeridentität fehlt oder das Schreiben fehlschlägt.
       */
      async function deactivateSchichtvorlage(
        pfad: IFilialPfad,
        schichtvorlageId: string,
      ): Promise<void> {
        const { kontext } = requireSchichtvorlage(pfad, schichtvorlageId);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          await schichtvorlageService.deactivateSchichtvorlage(pfad, schichtvorlageId, benutzerUid);
          const aktuellerKontext = getSchichtvorlageKontext(pfad);
          if (!aktuellerKontext || aktuellerKontext !== kontext) return;
          setKontext(pfad, {
            ...aktuellerKontext,
            schichtvorlagen: aktuellerKontext.schichtvorlagen.map((vorlage) => {
              return vorlage.id === schichtvorlageId
                ? { ...vorlage, aktiv: false, aktualisiertVonUid: benutzerUid }
                : vorlage;
            }),
          });
        });
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Liefert den geladenen Schichtvorlagenkontext einer Filiale.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @returns Filialkontext oder `null`, wenn er noch nicht angelegt wurde.
       */
      function getSchichtvorlageKontext(pfad: IFilialPfad): TSchichtvorlageKontext | null {
        return store.kontexte()[getKontextSchluessel(pfad)] ?? null;
      }

      /**
       * Setzt alle sitzungsbezogenen Schichtvorlagendaten zurück.
       */
      function resetSchichtvorlagen(): void {
        generation += 1;
        kontextGenerationen.clear();
        ladeauftraege.clear();
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
          kontexte: store.kontexte(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      // ===== Interne Helfer =======================

      async function executeLoad(
        pfad: IFilialPfad,
        strategie: TFirestoreLesestrategie,
        aktuelleGeneration: number,
        kontextGeneration: number,
      ): Promise<void> {
        const kontextSchluessel = getKontextSchluessel(pfad);
        try {
          const schichtvorlagen = await schichtvorlageService.loadSchichtvorlagen(pfad, strategie);
          if (!istAktuellerLadeauftrag(kontextSchluessel, aktuelleGeneration, kontextGeneration)) {
            return;
          }
          setKontext(pfad, {
            ...pfad,
            schichtvorlagen,
            download: false,
            isLoaded: true,
            error: null,
          });
        } catch (error: unknown) {
          if (istAktuellerLadeauftrag(kontextSchluessel, aktuelleGeneration, kontextGeneration)) {
            setKontext(pfad, {
              ...(getSchichtvorlageKontext(pfad) ?? createLeerenKontext(pfad)),
              download: false,
              isLoaded: false,
              error: getFirebaseErrorMessage(error),
            });
          }
          throw error;
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

      function istAktuellerLadeauftrag(
        kontextSchluessel: string,
        aktuelleGeneration: number,
        kontextGeneration: number,
      ): boolean {
        return (
          aktuelleGeneration === generation &&
          kontextGenerationen.get(kontextSchluessel) === kontextGeneration
        );
      }

      function removeLadeauftrag(auftragSchluessel: string, promise: Promise<void>): void {
        if (ladeauftraege.get(auftragSchluessel) === promise) {
          ladeauftraege.delete(auftragSchluessel);
        }
      }

      function setKontext(pfad: IFilialPfad, kontext: TSchichtvorlageKontext): void {
        patchState(store, {
          kontexte: {
            ...store.kontexte(),
            [getKontextSchluessel(pfad)]: kontext,
          },
        });
      }

      function requireSchreibkontext(pfad: IFilialPfad): TSchichtvorlageKontext {
        const kontext = getSchichtvorlageKontext(pfad);
        if (!kontext?.isLoaded) {
          throw new Error(
            'Die Schichtvorlagen der Filiale müssen vor dem Schreiben geladen werden.',
          );
        }
        return kontext;
      }

      function requireSchichtvorlage(
        pfad: IFilialPfad,
        schichtvorlageId: string,
      ): { kontext: TSchichtvorlageKontext; schichtvorlage: ISchichtvorlageEintrag } {
        const kontext = requireSchreibkontext(pfad);
        const schichtvorlage = kontext.schichtvorlagen.find((vorlage) => {
          return vorlage.id === schichtvorlageId;
        });
        if (!schichtvorlage) {
          throw new Error('Die Schichtvorlage wurde im geladenen Filialkontext nicht gefunden.');
        }
        return { kontext, schichtvorlage };
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
        getSchichtvorlageKontext,
        resetSchichtvorlagen,
        clearError,
        snapshot,
      };
    },
  ),
);
