// pur-system/src/app/stores/domain/schichtmodell.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { environment } from '../../../environments/environment';
import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  ISchichtmodellAktualisierung,
  ISchichtmodellAnlage,
  ISchichtmodellBestand,
} from '../../commons/models/domain/schichtmodell';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { SchichtmodellService } from '../../services/domain/schichtmodell.service';
import { BenutzerStore } from '../app/benutzer.store';

// ===== Top-Level Helper =====================

export type TSchichtmodellKontext = IFilialPfad & {
  readonly schichtmodelle: readonly ISchichtmodellBestand[];
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly error: string | null;
};

export type TSchichtmodellSnapshot = {
  readonly kontexte: Readonly<Record<string, TSchichtmodellKontext>>;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TSchichtmodellState = TSchichtmodellSnapshot;

const initialState: TSchichtmodellState = { kontexte: {}, inProgress: false, error: null };

function getKontextSchluessel(pfad: IFilialPfad): string {
  return JSON.stringify([pfad.unternehmerId, pfad.firmaId, pfad.filialeId]);
}

function createLeerenKontext(pfad: IFilialPfad): TSchichtmodellKontext {
  return { ...pfad, schichtmodelle: [], download: false, isLoaded: false, error: null };
}

function sortSchichtmodelle(a: ISchichtmodellBestand, b: ISchichtmodellBestand): number {
  return a.schichtmodell.bezeichnung.localeCompare(b.schichtmodell.bezeichnung, 'de');
}

export const SchichtmodellStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TSchichtmodellState>(initialState),
  withMethods(
    (
      store,
      schichtmodellService = inject(SchichtmodellService),
      benutzerStore = inject(BenutzerStore),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;
      const kontextGenerationen = new Map<string, number>();
      const ladeauftraege = new Map<string, Promise<void>>();

      // ===== Methoden: Laden ======================

      /**
       * Lädt alle Schichtmodelle einer Filiale.
       */
      function loadSchichtmodelle(
        pfad: IFilialPfad,
        strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
      ): Promise<void> {
        const kontext = getSchichtmodellKontext(pfad);
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
       * Legt ein Schichtmodell im geladenen Filialkontext an.
       */
      async function createSchichtmodell(
        pfad: IFilialPfad,
        anlage: ISchichtmodellAnlage,
      ): Promise<void> {
        const kontext = requireSchreibkontext(pfad);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          const bestand = await schichtmodellService.createSchichtmodell(pfad, anlage, benutzerUid);
          const aktuellerKontext = getSchichtmodellKontext(pfad);
          if (!aktuellerKontext || aktuellerKontext !== kontext) return;
          setKontext(pfad, {
            ...aktuellerKontext,
            schichtmodelle: [...aktuellerKontext.schichtmodelle, bestand].sort(sortSchichtmodelle),
          });
        });
      }

      /**
       * Aktualisiert ein Schichtmodell im geladenen Filialkontext.
       */
      async function updateSchichtmodell(
        pfad: IFilialPfad,
        schichtmodellId: string,
        aktualisierung: ISchichtmodellAktualisierung,
      ): Promise<void> {
        const { kontext, bestand } = requireSchichtmodell(pfad, schichtmodellId);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          const aktualisierterBestand = await schichtmodellService.updateSchichtmodell(
            pfad,
            bestand,
            aktualisierung,
            benutzerUid,
          );
          const aktuellerKontext = getSchichtmodellKontext(pfad);
          if (!aktuellerKontext || aktuellerKontext !== kontext) return;
          setKontext(pfad, {
            ...aktuellerKontext,
            schichtmodelle: aktuellerKontext.schichtmodelle
              .map((eintrag) => {
                return eintrag.schichtmodell.id === schichtmodellId
                  ? aktualisierterBestand
                  : eintrag;
              })
              .sort(sortSchichtmodelle),
          });
        });
      }

      /**
       * Deaktiviert ein Schichtmodell im geladenen Filialkontext.
       */
      async function deactivateSchichtmodell(
        pfad: IFilialPfad,
        schichtmodellId: string,
      ): Promise<void> {
        const { kontext } = requireSchichtmodell(pfad, schichtmodellId);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          await schichtmodellService.deactivateSchichtmodell(pfad, schichtmodellId, benutzerUid);
          const aktuellerKontext = getSchichtmodellKontext(pfad);
          if (!aktuellerKontext || aktuellerKontext !== kontext) return;
          setKontext(pfad, {
            ...aktuellerKontext,
            schichtmodelle: aktuellerKontext.schichtmodelle.map((bestand) => {
              return bestand.schichtmodell.id === schichtmodellId
                ? {
                    ...bestand,
                    schichtmodell: {
                      ...bestand.schichtmodell,
                      aktiv: false,
                      aktualisiertVonUid: benutzerUid,
                    },
                  }
                : bestand;
            }),
          });
        });
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Liefert den geladenen Schichtmodellkontext einer Filiale.
       */
      function getSchichtmodellKontext(pfad: IFilialPfad): TSchichtmodellKontext | null {
        return store.kontexte()[getKontextSchluessel(pfad)] ?? null;
      }

      /**
       * Setzt alle sitzungsbezogenen Schichtmodelldaten zurück.
       */
      function resetSchichtmodelle(): void {
        generation += 1;
        kontextGenerationen.clear();
        ladeauftraege.clear();
        patchState(store, initialState);
      }

      /**
       * Entfernt die aktuelle Fehlermeldung des Schichtmodell-Stores.
       */
      function clearError(): void {
        patchState(store, { error: null });
      }

      /**
       * Liefert eine nicht reaktiv verfolgte Momentaufnahme des Stores.
       */
      function snapshot(): TSchichtmodellSnapshot {
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
        const schluessel = getKontextSchluessel(pfad);
        try {
          const schichtmodelle = await schichtmodellService.loadSchichtmodelle(pfad, strategie);
          if (!istAktuellerLadeauftrag(schluessel, aktuelleGeneration, kontextGeneration)) return;
          setKontext(pfad, {
            ...pfad,
            schichtmodelle,
            download: false,
            isLoaded: true,
            error: null,
          });
        } catch (error: unknown) {
          if (istAktuellerLadeauftrag(schluessel, aktuelleGeneration, kontextGeneration)) {
            setKontext(pfad, {
              ...(getSchichtmodellKontext(pfad) ?? createLeerenKontext(pfad)),
              download: false,
              isLoaded: false,
              error: getFirebaseErrorMessage(error),
            });
          }
          throw error;
        }
      }

      async function executeWrite(aktion: () => Promise<void>): Promise<void> {
        if (store.inProgress()) throw new Error('Ein Schichtmodell-Schreibvorgang läuft bereits.');
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
          if (aktuelleGeneration === generation) patchState(store, { inProgress: false });
        }
      }

      function istAktuellerLadeauftrag(
        schluessel: string,
        aktuelleGeneration: number,
        kontextGeneration: number,
      ): boolean {
        return (
          aktuelleGeneration === generation &&
          kontextGenerationen.get(schluessel) === kontextGeneration
        );
      }

      function removeLadeauftrag(schluessel: string, promise: Promise<void>): void {
        if (ladeauftraege.get(schluessel) === promise) ladeauftraege.delete(schluessel);
      }

      function setKontext(pfad: IFilialPfad, kontext: TSchichtmodellKontext): void {
        patchState(store, {
          kontexte: { ...store.kontexte(), [getKontextSchluessel(pfad)]: kontext },
        });
      }

      function requireSchreibkontext(pfad: IFilialPfad): TSchichtmodellKontext {
        const kontext = getSchichtmodellKontext(pfad);
        if (!kontext?.isLoaded) {
          throw new Error(
            'Die Schichtmodelle der Filiale müssen vor dem Schreiben geladen werden.',
          );
        }
        return kontext;
      }

      function requireSchichtmodell(
        pfad: IFilialPfad,
        schichtmodellId: string,
      ): { kontext: TSchichtmodellKontext; bestand: ISchichtmodellBestand } {
        const kontext = requireSchreibkontext(pfad);
        const bestand = kontext.schichtmodelle.find((eintrag) => {
          return eintrag.schichtmodell.id === schichtmodellId;
        });
        if (!bestand) throw new Error('Das Schichtmodell wurde im Filialkontext nicht gefunden.');
        return { kontext, bestand };
      }

      function requireBenutzerUid(): string {
        const benutzerUid = benutzerStore.benutzerId();
        if (!benutzerUid) throw new Error('Für den Schreibvorgang fehlt die Benutzeridentität.');
        return benutzerUid;
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'SchichtmodellStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadSchichtmodelle,
        createSchichtmodell,
        updateSchichtmodell,
        deactivateSchichtmodell,
        getSchichtmodellKontext,
        resetSchichtmodelle,
        clearError,
        snapshot,
      };
    },
  ),
);
