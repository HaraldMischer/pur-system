// pur-system/src/app/stores/app/stammdaten.store.ts

import { DestroyRef, Injector, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { IBenutzerProfilEintrag, TBenutzerZugriffe } from '../../commons/models/domain/benutzer';
import { IFirmaEintrag } from '../../commons/models/domain/firma';
import { IFilialeEintrag } from '../../commons/models/domain/filiale';
import { IUnternehmerEintrag } from '../../commons/models/domain/unternehmer';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { BenutzerService } from '../../services/domain/benutzer.service';
import { FilialeService } from '../../services/domain/filiale.service';
import { FirmaService } from '../../services/domain/firma.service';
import { UnternehmerService } from '../../services/domain/unternehmer.service';

// ===== Top-Level Helper =====================

type TFirmenNachUnternehmer = Readonly<Record<string, readonly IFirmaEintrag[]>>;
type TFilialenNachFirma = Readonly<
  Record<string, Readonly<Record<string, readonly IFilialeEintrag[]>>>
>;

export type TStammdatenLadeauftrag = {
  readonly alleStrukturdaten: boolean;
  readonly zugriffe: TBenutzerZugriffe;
  readonly benutzerprofile: boolean;
  readonly lesestrategie: TFirestoreLesestrategie;
};

export type TStammdatenSnapshot = {
  readonly benutzerId: string | null;
  readonly unternehmer: readonly IUnternehmerEintrag[];
  readonly firmenNachUnternehmer: TFirmenNachUnternehmer;
  readonly filialenNachFirma: TFilialenNachFirma;
  readonly benutzerprofile: readonly IBenutzerProfilEintrag[];
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly error: string | null;
};

type TStammdatenState = TStammdatenSnapshot;

const initialState: TStammdatenState = {
  benutzerId: null,
  unternehmer: [],
  firmenNachUnternehmer: {},
  filialenNachFirma: {},
  benutzerprofile: [],
  download: false,
  isLoaded: false,
  error: null,
};

function sortEintraege<T extends { anzeigename: string }>(eintraege: readonly T[]): readonly T[] {
  return [...eintraege].sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
}

function getLadeauftragKontext(ladeauftrag: TStammdatenLadeauftrag): string {
  const zugriffe = Object.entries(ladeauftrag.zugriffe)
    .sort(([ersteId], [zweiteId]) => ersteId.localeCompare(zweiteId))
    .map(([unternehmerId, firmen]) => {
      const firmenKontext = Object.entries(firmen)
        .sort(([ersteId], [zweiteId]) => ersteId.localeCompare(zweiteId))
        .map(([firmaId, filialIds]) => {
          return [firmaId, [...filialIds].sort()];
        });
      return [unternehmerId, firmenKontext];
    });

  return JSON.stringify([
    ladeauftrag.alleStrukturdaten,
    ladeauftrag.benutzerprofile,
    ladeauftrag.lesestrategie,
    zugriffe,
  ]);
}

function requireEintrag<T>(eintrag: T | null): T {
  if (!eintrag) {
    throw { code: 'app/invalid-user-profile' };
  }
  return eintrag;
}

export const StammdatenStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TStammdatenState>(initialState),
  withMethods(
    (
      store,
      injector = inject(Injector),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;
      let geladenerKontext: string | null = null;
      let laufenderLadeauftrag: { kontext: string; promise: Promise<void> } | null = null;

      // ===== Methoden: Laden ======================

      /**
       * Lädt die durch einen rollenunabhängigen Ladeauftrag festgelegten Stammdaten.
       *
       * @param benutzerId - UID des angemeldeten Benutzers.
       * @param ladeauftrag - Technische Auswahl der zu ladenden Struktur- und Profildaten.
       * @returns Ein Promise, das nach Abschluss der Stammdateninitialisierung beendet ist.
       * @throws Gibt Ladefehler oder fehlende zugeordnete Dokumente weiter.
       */
      function loadStammdaten(
        benutzerId: string,
        ladeauftrag: TStammdatenLadeauftrag,
      ): Promise<void> {
        const kontext = JSON.stringify([benutzerId, getLadeauftragKontext(ladeauftrag)]);
        if (store.benutzerId() === benutzerId && store.isLoaded() && geladenerKontext === kontext) {
          return Promise.resolve();
        }
        if (laufenderLadeauftrag?.kontext === kontext) {
          return laufenderLadeauftrag.promise;
        }

        const aktuell = ++generation;
        patchState(store, {
          ...initialState,
          benutzerId,
          download: true,
        });
        const promise = executeLoad(benutzerId, ladeauftrag, kontext, aktuell);
        laufenderLadeauftrag = { kontext, promise };
        return promise;
      }

      /**
       * Lädt gezielt zusätzliche Filialen für einen bereits initialisierten Firmenkontext.
       *
       * @param benutzerId - UID des angemeldeten Benutzers.
       * @param unternehmerId - ID des zugeordneten Unternehmers.
       * @param firmaId - ID der zugeordneten Firma.
       * @param filialIds - IDs der nachzuladenden Filialen.
       * @param strategie - Datenquellenstrategie für den Ladevorgang.
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Gibt Ladefehler oder fehlende Filialdokumente weiter.
       */
      async function loadFilialenNachIds(
        benutzerId: string,
        unternehmerId: string,
        firmaId: string,
        filialIds: readonly string[],
        strategie: TFirestoreLesestrategie,
      ): Promise<void> {
        if (store.benutzerId() !== benutzerId || !store.isLoaded()) {
          throw { code: 'app/invalid-user-profile' };
        }

        const eindeutigeFilialIds = [...new Set(filialIds)];
        if (eindeutigeFilialIds.length === 0) return;

        const aktuell = generation;
        patchState(store, { download: true, isLoaded: false, error: null });
        try {
          const filialeService = injector.get(FilialeService);
          const filialen = await Promise.all(
            eindeutigeFilialIds.map(async (filialId) => {
              return requireEintrag(
                await filialeService.loadFilialeEintrag(
                  unternehmerId,
                  firmaId,
                  filialId,
                  strategie,
                ),
              );
            }),
          );
          if (aktuell !== generation || store.benutzerId() !== benutzerId) return;

          const nachgeladeneIds = new Set(filialen.map((filiale) => filiale.id));
          const vorhandeneFilialen = getFilialen(unternehmerId, firmaId).filter((filiale) => {
            return !nachgeladeneIds.has(filiale.id);
          });
          patchState(store, {
            filialenNachFirma: {
              ...store.filialenNachFirma(),
              [unternehmerId]: {
                ...(store.filialenNachFirma()[unternehmerId] ?? {}),
                [firmaId]: sortEintraege([...vorhandeneFilialen, ...filialen]),
              },
            },
            download: false,
            isLoaded: true,
            error: null,
          });
        } catch (error: unknown) {
          if (aktuell === generation && store.benutzerId() === benutzerId) {
            patchState(store, {
              download: false,
              isLoaded: false,
              error: getFirebaseErrorMessage(error),
            });
          }
          throw error;
        }
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Übernimmt einen neu angelegten oder geänderten Unternehmer in den Sitzungsspeicher.
       *
       * @param eintrag - Der zu übernehmende Unternehmereintrag.
       */
      function upsertUnternehmer(eintrag: IUnternehmerEintrag): void {
        const unternehmer = store.unternehmer().filter((wert) => wert.id !== eintrag.id);
        patchState(store, { unternehmer: sortEintraege([...unternehmer, eintrag]) });
      }

      /**
       * Übernimmt eine neu angelegte oder geänderte Firma in den Sitzungsspeicher.
       *
       * @param unternehmerId - ID des übergeordneten Unternehmers.
       * @param eintrag - Der zu übernehmende Firmeneintrag.
       */
      function upsertFirma(unternehmerId: string, eintrag: IFirmaEintrag): void {
        const firmen = getFirmen(unternehmerId).filter((wert) => wert.id !== eintrag.id);
        patchState(store, {
          firmenNachUnternehmer: {
            ...store.firmenNachUnternehmer(),
            [unternehmerId]: sortEintraege([...firmen, eintrag]),
          },
        });
      }

      /**
       * Übernimmt eine neu angelegte oder geänderte Filiale in den Sitzungsspeicher.
       *
       * @param unternehmerId - ID des übergeordneten Unternehmers.
       * @param firmaId - ID der übergeordneten Firma.
       * @param eintrag - Der zu übernehmende Filialeintrag.
       */
      function upsertFiliale(
        unternehmerId: string,
        firmaId: string,
        eintrag: IFilialeEintrag,
      ): void {
        const filialen = getFilialen(unternehmerId, firmaId).filter(
          (wert) => wert.id !== eintrag.id,
        );
        patchState(store, {
          filialenNachFirma: {
            ...store.filialenNachFirma(),
            [unternehmerId]: {
              ...(store.filialenNachFirma()[unternehmerId] ?? {}),
              [firmaId]: sortEintraege([...filialen, eintrag]),
            },
          },
        });
      }

      /**
       * Übernimmt ein neu angelegtes oder geändertes Benutzerprofil in den Sitzungsspeicher.
       *
       * @param eintrag - Das zu übernehmende Benutzerprofil.
       */
      function upsertBenutzerprofil(eintrag: IBenutzerProfilEintrag): void {
        const profile = store.benutzerprofile().filter((wert) => wert.uid !== eintrag.uid);
        patchState(store, { benutzerprofile: sortEintraege([...profile, eintrag]) });
      }

      /**
       * Entfernt einen Unternehmer und seine untergeordneten Cache-Einträge.
       *
       * @param unternehmerId - ID des entfernten Unternehmers.
       */
      function removeUnternehmer(unternehmerId: string): void {
        const firmenNachUnternehmer = { ...store.firmenNachUnternehmer() };
        const filialenNachFirma = { ...store.filialenNachFirma() };
        delete firmenNachUnternehmer[unternehmerId];
        delete filialenNachFirma[unternehmerId];
        patchState(store, {
          unternehmer: store.unternehmer().filter((eintrag) => eintrag.id !== unternehmerId),
          firmenNachUnternehmer,
          filialenNachFirma,
        });
      }

      /**
       * Entfernt eine Firma und ihre untergeordneten Cache-Einträge.
       *
       * @param unternehmerId - ID des übergeordneten Unternehmers.
       * @param firmaId - ID der entfernten Firma.
       */
      function removeFirma(unternehmerId: string, firmaId: string): void {
        const filialenDesUnternehmers = {
          ...(store.filialenNachFirma()[unternehmerId] ?? {}),
        };
        delete filialenDesUnternehmers[firmaId];
        patchState(store, {
          firmenNachUnternehmer: {
            ...store.firmenNachUnternehmer(),
            [unternehmerId]: getFirmen(unternehmerId).filter((eintrag) => eintrag.id !== firmaId),
          },
          filialenNachFirma: {
            ...store.filialenNachFirma(),
            [unternehmerId]: filialenDesUnternehmers,
          },
        });
      }

      /**
       * Entfernt eine Filiale aus dem Sitzungsspeicher.
       *
       * @param unternehmerId - ID des übergeordneten Unternehmers.
       * @param firmaId - ID der übergeordneten Firma.
       * @param filialId - ID der entfernten Filiale.
       */
      function removeFiliale(unternehmerId: string, firmaId: string, filialId: string): void {
        patchState(store, {
          filialenNachFirma: {
            ...store.filialenNachFirma(),
            [unternehmerId]: {
              ...(store.filialenNachFirma()[unternehmerId] ?? {}),
              [firmaId]: getFilialen(unternehmerId, firmaId).filter(
                (eintrag) => eintrag.id !== filialId,
              ),
            },
          },
        });
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Liefert die geladenen Firmen eines Unternehmers.
       *
       * @param unternehmerId - ID des übergeordneten Unternehmers.
       * @returns Die im Sitzungsspeicher vorhandenen Firmen.
       */
      function getFirmen(unternehmerId: string): readonly IFirmaEintrag[] {
        return store.firmenNachUnternehmer()[unternehmerId] ?? [];
      }

      /**
       * Liefert die geladenen Filialen einer Firma.
       *
       * @param unternehmerId - ID des übergeordneten Unternehmers.
       * @param firmaId - ID der übergeordneten Firma.
       * @returns Die im Sitzungsspeicher vorhandenen Filialen.
       */
      function getFilialen(unternehmerId: string, firmaId: string): readonly IFilialeEintrag[] {
        return store.filialenNachFirma()[unternehmerId]?.[firmaId] ?? [];
      }

      /**
       * Setzt sämtliche sitzungsbezogenen Stammdaten zurück.
       */
      function reset(): void {
        generation++;
        geladenerKontext = null;
        laufenderLadeauftrag = null;
        patchState(store, initialState);
      }

      /**
       * Liefert eine Momentaufnahme des aktuellen Stammdatenzustands.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TStammdatenSnapshot {
        return untracked(() => ({
          benutzerId: store.benutzerId(),
          unternehmer: store.unternehmer(),
          firmenNachUnternehmer: store.firmenNachUnternehmer(),
          filialenNachFirma: store.filialenNachFirma(),
          benutzerprofile: store.benutzerprofile(),
          download: store.download(),
          isLoaded: store.isLoaded(),
          error: store.error(),
        }));
      }

      // ===== Interne Helfer =======================

      async function executeLoad(
        benutzerId: string,
        ladeauftrag: TStammdatenLadeauftrag,
        kontext: string,
        aktuell: number,
      ): Promise<void> {
        try {
          const benutzerService = injector.get(BenutzerService);
          const benutzerprofilePromise = ladeauftrag.benutzerprofile
            ? benutzerService.loadBenutzerProfile(ladeauftrag.lesestrategie)
            : Promise.resolve([]);
          const [strukturdaten, benutzerprofile] = await Promise.all([
            loadStrukturdaten(ladeauftrag),
            benutzerprofilePromise,
          ]);
          const { unternehmer, firmenNachUnternehmer, filialenNachFirma } = strukturdaten;

          if (aktuell !== generation || store.benutzerId() !== benutzerId) return;
          geladenerKontext = kontext;
          patchState(store, {
            unternehmer,
            firmenNachUnternehmer,
            filialenNachFirma,
            benutzerprofile,
            download: false,
            isLoaded: true,
            error: null,
          });
        } catch (error: unknown) {
          if (aktuell !== generation || store.benutzerId() !== benutzerId) return;
          patchState(store, {
            download: false,
            isLoaded: false,
            error: getFirebaseErrorMessage(error),
          });
          throw error;
        } finally {
          if (laufenderLadeauftrag?.kontext === kontext) {
            laufenderLadeauftrag = null;
          }
        }
      }

      async function loadStrukturdaten(ladeauftrag: TStammdatenLadeauftrag): Promise<{
        unternehmer: readonly IUnternehmerEintrag[];
        firmenNachUnternehmer: TFirmenNachUnternehmer;
        filialenNachFirma: TFilialenNachFirma;
      }> {
        const unternehmer = await loadUnternehmer(ladeauftrag);
        const firmenNachUnternehmer = await loadFirmen(ladeauftrag, unternehmer);
        const filialenNachFirma = await loadFilialen(ladeauftrag, firmenNachUnternehmer);
        return { unternehmer, firmenNachUnternehmer, filialenNachFirma };
      }

      async function loadUnternehmer(
        ladeauftrag: TStammdatenLadeauftrag,
      ): Promise<readonly IUnternehmerEintrag[]> {
        const unternehmerService = injector.get(UnternehmerService);
        if (ladeauftrag.alleStrukturdaten) {
          return unternehmerService.loadUnternehmer(ladeauftrag.lesestrategie);
        }

        const eintraege = await Promise.all(
          Object.keys(ladeauftrag.zugriffe).map(async (unternehmerId) => {
            return requireEintrag(
              await unternehmerService.loadUnternehmerEintrag(
                unternehmerId,
                ladeauftrag.lesestrategie,
              ),
            );
          }),
        );
        return sortEintraege(eintraege);
      }

      async function loadFirmen(
        ladeauftrag: TStammdatenLadeauftrag,
        unternehmer: readonly IUnternehmerEintrag[],
      ): Promise<TFirmenNachUnternehmer> {
        const firmaService = injector.get(FirmaService);
        const listen = await Promise.all(
          unternehmer.map(async (eintrag) => {
            const firmen = ladeauftrag.alleStrukturdaten
              ? await firmaService.loadFirmen(eintrag.id, ladeauftrag.lesestrategie)
              : await Promise.all(
                  Object.keys(ladeauftrag.zugriffe[eintrag.id] ?? {}).map(async (firmaId) => {
                    return requireEintrag(
                      await firmaService.loadFirmaEintrag(
                        eintrag.id,
                        firmaId,
                        ladeauftrag.lesestrategie,
                      ),
                    );
                  }),
                );
            return [eintrag.id, sortEintraege(firmen)] as const;
          }),
        );
        return Object.fromEntries(listen);
      }

      async function loadFilialen(
        ladeauftrag: TStammdatenLadeauftrag,
        firmenNachUnternehmer: TFirmenNachUnternehmer,
      ): Promise<TFilialenNachFirma> {
        const filialeService = injector.get(FilialeService);
        const unternehmerListen = await Promise.all(
          Object.entries(firmenNachUnternehmer).map(async ([unternehmerId, firmen]) => {
            const firmaListen = await Promise.all(
              firmen.map(async (firma) => {
                const filialen = ladeauftrag.alleStrukturdaten
                  ? await filialeService.loadFilialen(
                      unternehmerId,
                      firma.id,
                      ladeauftrag.lesestrategie,
                    )
                  : await Promise.all(
                      (ladeauftrag.zugriffe[unternehmerId]?.[firma.id] ?? []).map(
                        async (filialeId) => {
                          return requireEintrag(
                            await filialeService.loadFilialeEintrag(
                              unternehmerId,
                              firma.id,
                              filialeId,
                              ladeauftrag.lesestrategie,
                            ),
                          );
                        },
                      ),
                    );
                return [firma.id, sortEintraege(filialen)] as const;
              }),
            );
            return [unternehmerId, Object.fromEntries(firmaListen)] as const;
          }),
        );
        return Object.fromEntries(unternehmerListen);
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'StammdatenStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadStammdaten,
        loadFilialenNachIds,
        upsertUnternehmer,
        upsertFirma,
        upsertFiliale,
        upsertBenutzerprofil,
        removeUnternehmer,
        removeFirma,
        removeFiliale,
        getFirmen,
        getFilialen,
        reset,
        snapshot,
      };
    },
  ),
);
