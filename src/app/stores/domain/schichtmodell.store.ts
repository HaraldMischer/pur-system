// pur-system/src/app/stores/domain/schichtmodell.store.ts

import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import type { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import type { IGeoeffneteOeffnungsregel } from '../../commons/models/domain/filialeinstellung';
import type {
  ISchichtmodellAktualisierung,
  ISchichtmodellAnlage,
  ISchichtmodellBestand,
  TTagesvorlageTyp,
} from '../../commons/models/domain/schichtmodell';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { SchichtmodellService } from '../../services/domain/schichtmodell.service';
import { BenutzerStore } from '../app/benutzer.store';

type TOeffnungen = Readonly<Record<TTagesvorlageTyp, IGeoeffneteOeffnungsregel>>;

export type TSchichtmodellKontext = IFilialPfad & {
  readonly schichtmodelle: readonly ISchichtmodellBestand[];
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly error: string | null;
};

type TSchichtmodellState = {
  readonly kontexte: Readonly<Record<string, TSchichtmodellKontext>>;
  readonly inProgress: boolean;
  readonly error: string | null;
};

const initialState: TSchichtmodellState = {
  kontexte: {},
  inProgress: false,
  error: null,
};

function getSchluessel(pfad: IFilialPfad): string {
  return JSON.stringify([pfad.unternehmerId, pfad.firmaId, pfad.filialeId]);
}

export const SchichtmodellStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TSchichtmodellState>(initialState),
  withMethods(
    (store, service = inject(SchichtmodellService), benutzerStore = inject(BenutzerStore)) => {
      function setKontext(pfad: IFilialPfad, kontext: TSchichtmodellKontext): void {
        patchState(store, {
          kontexte: { ...store.kontexte(), [getSchluessel(pfad)]: kontext },
        });
      }

      function requireKontext(pfad: IFilialPfad): TSchichtmodellKontext {
        const kontext = getSchichtmodellKontext(pfad);
        if (!kontext?.isLoaded) {
          throw new Error('Die Schichtmodelle müssen vor dem Schreiben geladen werden.');
        }
        return kontext;
      }

      function requireUid(): string {
        const uid = benutzerStore.benutzerId();
        if (!uid) throw new Error('Für den Schreibvorgang fehlt die Benutzeridentität.');
        return uid;
      }

      async function executeWrite(aktion: () => Promise<void>): Promise<void> {
        if (store.inProgress()) {
          throw new Error('Ein Schichtmodell-Schreibvorgang läuft bereits.');
        }
        patchState(store, { inProgress: true, error: null });
        try {
          await aktion();
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      // ===== Methoden: Laden ======================

      /**
       * Lädt die Schichtmodelle einer Filiale.
       */
      async function loadSchichtmodelle(pfad: IFilialPfad): Promise<void> {
        const vorhanden = getSchichtmodellKontext(pfad);
        if (vorhanden?.isLoaded || vorhanden?.download) return;
        setKontext(pfad, {
          ...pfad,
          schichtmodelle: vorhanden?.schichtmodelle ?? [],
          download: true,
          isLoaded: false,
          error: null,
        });
        try {
          const schichtmodelle = await service.loadSchichtmodelle(pfad);
          setKontext(pfad, {
            ...pfad,
            schichtmodelle,
            download: false,
            isLoaded: true,
            error: null,
          });
        } catch (error: unknown) {
          setKontext(pfad, {
            ...pfad,
            schichtmodelle: vorhanden?.schichtmodelle ?? [],
            download: false,
            isLoaded: false,
            error: getFirebaseErrorMessage(error),
          });
          throw error;
        }
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt ein Schichtmodell im geladenen Filialkontext an.
       */
      async function createSchichtmodell(
        pfad: IFilialPfad,
        anlage: ISchichtmodellAnlage,
        oeffnungen: TOeffnungen,
      ): Promise<void> {
        const kontext = requireKontext(pfad);
        await executeWrite(async () => {
          const bestand = await service.createSchichtmodell(pfad, anlage, oeffnungen, requireUid());
          setKontext(pfad, {
            ...kontext,
            schichtmodelle: [...kontext.schichtmodelle, bestand],
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
        oeffnungen: TOeffnungen,
      ): Promise<void> {
        const kontext = requireKontext(pfad);
        const bestand = kontext.schichtmodelle.find((eintrag) => {
          return eintrag.schichtmodell.id === schichtmodellId;
        });
        if (!bestand) throw new Error('Das Schichtmodell wurde nicht gefunden.');
        await executeWrite(async () => {
          const aktualisiert = await service.updateSchichtmodell(
            pfad,
            bestand,
            aktualisierung,
            oeffnungen,
            requireUid(),
          );
          setKontext(pfad, {
            ...kontext,
            schichtmodelle: kontext.schichtmodelle.map((eintrag) => {
              return eintrag.schichtmodell.id === schichtmodellId ? aktualisiert : eintrag;
            }),
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
        const kontext = requireKontext(pfad);
        await executeWrite(async () => {
          const uid = requireUid();
          await service.deactivateSchichtmodell(pfad, schichtmodellId, uid);
          setKontext(pfad, {
            ...kontext,
            schichtmodelle: kontext.schichtmodelle.map((eintrag) => {
              return eintrag.schichtmodell.id === schichtmodellId
                ? {
                    ...eintrag,
                    schichtmodell: {
                      ...eintrag.schichtmodell,
                      aktiv: false,
                      aktualisiertVonUid: uid,
                    },
                  }
                : eintrag;
            }),
          });
        });
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Liefert den geladenen Schichtmodellkontext einer Filiale.
       */
      function getSchichtmodellKontext(pfad: IFilialPfad): TSchichtmodellKontext | null {
        return store.kontexte()[getSchluessel(pfad)] ?? null;
      }

      /**
       * Setzt alle Schichtmodellkontexte und Fehlermeldungen zurück.
       */
      function resetSchichtmodelle(): void {
        patchState(store, initialState);
      }

      return {
        loadSchichtmodelle,
        createSchichtmodell,
        updateSchichtmodell,
        deactivateSchichtmodell,
        getSchichtmodellKontext,
        resetSchichtmodelle,
      };
    },
  ),
);
