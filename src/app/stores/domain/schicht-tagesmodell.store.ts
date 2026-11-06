// pur-system/src/app/stores/domain/schicht-tagesmodell.store.ts

import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import type { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import type { IGeoeffneteOeffnungsregel } from '../../commons/models/domain/filialeinstellung';
import type {
  ISchichttagesmodellAktualisierung,
  ISchichttagesmodellAnlage,
  ISchichttagesmodellBestand,
  TTagesvorlageTyp,
} from '../../commons/models/domain/schicht-tagesmodell';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { SchichtTagesmodellService } from '../../services/domain/schicht-tagesmodell.service';
import { BenutzerStore } from '../app/benutzer.store';

type TOeffnungen = Readonly<Record<TTagesvorlageTyp, IGeoeffneteOeffnungsregel>>;

export type TSchichtTagesmodellKontext = IFilialPfad & {
  readonly schichttagesmodelle: readonly ISchichttagesmodellBestand[];
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly error: string | null;
};

type TSchichtTagesmodellState = {
  readonly kontexte: Readonly<Record<string, TSchichtTagesmodellKontext>>;
  readonly inProgress: boolean;
  readonly error: string | null;
};

const initialState: TSchichtTagesmodellState = {
  kontexte: {},
  inProgress: false,
  error: null,
};

function getSchluessel(pfad: IFilialPfad): string {
  return JSON.stringify([pfad.unternehmerId, pfad.firmaId, pfad.filialeId]);
}

export const SchichtTagesmodellStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TSchichtTagesmodellState>(initialState),
  withMethods(
    (store, service = inject(SchichtTagesmodellService), benutzerStore = inject(BenutzerStore)) => {
      function setKontext(pfad: IFilialPfad, kontext: TSchichtTagesmodellKontext): void {
        patchState(store, {
          kontexte: { ...store.kontexte(), [getSchluessel(pfad)]: kontext },
        });
      }

      function requireKontext(pfad: IFilialPfad): TSchichtTagesmodellKontext {
        const kontext = getSchichtTagesmodellKontext(pfad);
        if (!kontext?.isLoaded) {
          throw new Error('Die Schicht-Tagesmodelle müssen vor dem Schreiben geladen werden.');
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
          throw new Error('Ein Schicht-Tagesmodell-Schreibvorgang läuft bereits.');
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
       * Lädt die Schicht-Tagesmodelle einer Filiale.
       */
      async function loadSchichtTagesmodelle(pfad: IFilialPfad): Promise<void> {
        const vorhanden = getSchichtTagesmodellKontext(pfad);
        if (vorhanden?.isLoaded || vorhanden?.download) return;
        setKontext(pfad, {
          ...pfad,
          schichttagesmodelle: vorhanden?.schichttagesmodelle ?? [],
          download: true,
          isLoaded: false,
          error: null,
        });
        try {
          const schichttagesmodelle = await service.loadSchichtTagesmodelle(pfad);
          setKontext(pfad, {
            ...pfad,
            schichttagesmodelle,
            download: false,
            isLoaded: true,
            error: null,
          });
        } catch (error: unknown) {
          setKontext(pfad, {
            ...pfad,
            schichttagesmodelle: vorhanden?.schichttagesmodelle ?? [],
            download: false,
            isLoaded: false,
            error: getFirebaseErrorMessage(error),
          });
          throw error;
        }
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt ein Schicht-Tagesmodell im geladenen Filialkontext an.
       */
      async function createSchichtTagesmodell(
        pfad: IFilialPfad,
        anlage: ISchichttagesmodellAnlage,
        oeffnungen: TOeffnungen,
      ): Promise<void> {
        const kontext = requireKontext(pfad);
        await executeWrite(async () => {
          const bestand = await service.createSchichtTagesmodell(
            pfad,
            anlage,
            oeffnungen,
            requireUid(),
          );
          setKontext(pfad, {
            ...kontext,
            schichttagesmodelle: [...kontext.schichttagesmodelle, bestand],
          });
        });
      }

      /**
       * Aktualisiert ein Schicht-Tagesmodell im geladenen Filialkontext.
       */
      async function updateSchichtTagesmodell(
        pfad: IFilialPfad,
        schichttagesmodellId: string,
        aktualisierung: ISchichttagesmodellAktualisierung,
        oeffnungen: TOeffnungen,
      ): Promise<void> {
        const kontext = requireKontext(pfad);
        const bestand = kontext.schichttagesmodelle.find((eintrag) => {
          return eintrag.schichtmodell.id === schichttagesmodellId;
        });
        if (!bestand) throw new Error('Das Schicht-Tagesmodell wurde nicht gefunden.');
        await executeWrite(async () => {
          const aktualisiert = await service.updateSchichtTagesmodell(
            pfad,
            bestand,
            aktualisierung,
            oeffnungen,
            requireUid(),
          );
          setKontext(pfad, {
            ...kontext,
            schichttagesmodelle: kontext.schichttagesmodelle.map((eintrag) => {
              return eintrag.schichtmodell.id === schichttagesmodellId ? aktualisiert : eintrag;
            }),
          });
        });
      }

      /**
       * Deaktiviert ein Schicht-Tagesmodell im geladenen Filialkontext.
       */
      async function deactivateSchichtTagesmodell(
        pfad: IFilialPfad,
        schichttagesmodellId: string,
      ): Promise<void> {
        const kontext = requireKontext(pfad);
        await executeWrite(async () => {
          const uid = requireUid();
          await service.deactivateSchichtTagesmodell(pfad, schichttagesmodellId, uid);
          setKontext(pfad, {
            ...kontext,
            schichttagesmodelle: kontext.schichttagesmodelle.map((eintrag) => {
              return eintrag.schichtmodell.id === schichttagesmodellId
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
       * Liefert den geladenen Tagesmodellkontext einer Filiale.
       */
      function getSchichtTagesmodellKontext(pfad: IFilialPfad): TSchichtTagesmodellKontext | null {
        return store.kontexte()[getSchluessel(pfad)] ?? null;
      }

      /**
       * Setzt alle Tagesmodellkontexte und Fehlermeldungen zurück.
       */
      function resetSchichtTagesmodelle(): void {
        patchState(store, initialState);
      }

      return {
        loadSchichtTagesmodelle,
        createSchichtTagesmodell,
        updateSchichtTagesmodell,
        deactivateSchichtTagesmodell,
        getSchichtTagesmodellKontext,
        resetSchichtTagesmodelle,
      };
    },
  ),
);
