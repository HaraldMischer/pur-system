// pur-system/src/app/stores/app/stammdaten.store.ts

import { DestroyRef, Injector, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import {
  IBenutzerProfilDokument,
  IBenutzerProfilEintrag,
} from '../../commons/models/domain/benutzer';
import { IFirmaEintrag } from '../../commons/models/domain/firma';
import { IFilialeEintrag } from '../../commons/models/domain/filiale';
import { IUnternehmerEintrag } from '../../commons/models/domain/unternehmer';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { DebugLogService } from '../../services/core/debug-log.service';
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

function istVorhanden<T>(eintrag: T | null): eintrag is T {
  return eintrag !== null;
}

function sortEintraege<T extends { anzeigename: string }>(eintraege: readonly T[]): readonly T[] {
  return [...eintraege].sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
}

function getFirmenAnzahl(firmenNachUnternehmer: TFirmenNachUnternehmer): number {
  return Object.values(firmenNachUnternehmer).reduce((anzahl, firmen) => {
    return anzahl + firmen.length;
  }, 0);
}

function getFilialenAnzahl(filialenNachFirma: TFilialenNachFirma): number {
  return Object.values(filialenNachFirma).reduce((gesamt, firmen) => {
    return (
      gesamt +
      Object.values(firmen).reduce((anzahl, filialen) => {
        return anzahl + filialen.length;
      }, 0)
    );
  }, 0);
}

export const StammdatenStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TStammdatenState>(initialState),
  withMethods(
    (
      store,
      injector = inject(Injector),
      debugLogService = inject(DebugLogService),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;
      let ladeauftrag: { benutzerId: string; promise: Promise<void> } | null = null;

      // ===== Methoden: Laden ======================

      /**
       * Lädt die für ein Benutzerprofil erlaubten Stammdaten einmalig für die Sitzung.
       *
       * Master erhalten alle Unternehmer, Firmen, Filialen und Benutzerprofile. Andere Rollen
       * erhalten ausschließlich die in ihrem Profil freigegebenen Unternehmensdaten.
       *
       * @param benutzerId - UID des angemeldeten Benutzers.
       * @param profil - Das bereits geladene Benutzerprofil mit den erlaubten Datenzugriffen.
       * @returns Ein Promise, das nach Abschluss der Stammdateninitialisierung beendet ist.
       */
      function loadStammdaten(benutzerId: string, profil: IBenutzerProfilDokument): Promise<void> {
        if (store.benutzerId() === benutzerId && store.isLoaded()) {
          return Promise.resolve();
        }
        if (ladeauftrag?.benutzerId === benutzerId) {
          return ladeauftrag.promise;
        }

        const aktuell = ++generation;
        patchState(store, {
          ...initialState,
          benutzerId,
          download: true,
        });
        const promise = executeLoad(benutzerId, profil, aktuell);
        ladeauftrag = { benutzerId, promise };
        return promise;
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
        ladeauftrag = null;
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
        profil: IBenutzerProfilDokument,
        aktuell: number,
      ): Promise<void> {
        try {
          const benutzerService = injector.get(BenutzerService);
          debugLogService.logDatenflussTitel(`2. STAMMDATEN | ${profil.userRole.toUpperCase()} `);
          const unternehmer = await loadUnternehmer(profil);
          debugLogService.logDatenGeladen('Unternehmer', unternehmer.length, unternehmer);
          const firmenNachUnternehmer = await loadFirmen(profil, unternehmer);
          debugLogService.logDatenGeladen(
            'Firmen',
            getFirmenAnzahl(firmenNachUnternehmer),
            firmenNachUnternehmer,
          );
          const filialenNachFirma = await loadFilialen(profil, firmenNachUnternehmer);
          debugLogService.logDatenGeladen(
            'Filialen',
            getFilialenAnzahl(filialenNachFirma),
            filialenNachFirma,
          );
          const benutzerprofile =
            profil.userRole === 'master' ? await benutzerService.loadBenutzerProfile() : [];
          if (profil.userRole === 'master') {
            debugLogService.logDatenGeladen(
              'Benutzerprofile',
              benutzerprofile.length,
              benutzerprofile,
            );
          }

          if (aktuell !== generation || store.benutzerId() !== benutzerId) return;
          patchState(store, {
            unternehmer,
            firmenNachUnternehmer,
            filialenNachFirma,
            benutzerprofile,
            download: false,
            isLoaded: true,
            error: null,
          });
          debugLogService.logDatenflussTitel('STAMMDATEN VOLLSTÄNDIG GELADEN ');
        } catch (error: unknown) {
          if (aktuell !== generation || store.benutzerId() !== benutzerId) return;
          patchState(store, {
            download: false,
            isLoaded: false,
            error: getFirebaseErrorMessage(error),
          });
        } finally {
          if (ladeauftrag?.benutzerId === benutzerId) {
            ladeauftrag = null;
          }
        }
      }

      async function loadUnternehmer(
        profil: IBenutzerProfilDokument,
      ): Promise<readonly IUnternehmerEintrag[]> {
        const unternehmerService = injector.get(UnternehmerService);
        if (profil.userRole === 'master') {
          return unternehmerService.loadUnternehmer();
        }

        const eintraege = await Promise.all(
          Object.keys(profil.zugriffe).map((unternehmerId) => {
            return unternehmerService.loadUnternehmerEintrag(unternehmerId);
          }),
        );
        return sortEintraege(eintraege.filter(istVorhanden));
      }

      async function loadFirmen(
        profil: IBenutzerProfilDokument,
        unternehmer: readonly IUnternehmerEintrag[],
      ): Promise<TFirmenNachUnternehmer> {
        const firmaService = injector.get(FirmaService);
        const listen = await Promise.all(
          unternehmer.map(async (eintrag) => {
            const firmen =
              profil.userRole === 'master'
                ? await firmaService.loadFirmen(eintrag.id)
                : (
                    await Promise.all(
                      Object.keys(profil.zugriffe[eintrag.id] ?? {}).map((firmaId) => {
                        return firmaService.loadFirmaEintrag(eintrag.id, firmaId);
                      }),
                    )
                  ).filter(istVorhanden);
            return [eintrag.id, sortEintraege(firmen)] as const;
          }),
        );
        return Object.fromEntries(listen);
      }

      async function loadFilialen(
        profil: IBenutzerProfilDokument,
        firmenNachUnternehmer: TFirmenNachUnternehmer,
      ): Promise<TFilialenNachFirma> {
        const filialeService = injector.get(FilialeService);
        const unternehmerListen = await Promise.all(
          Object.entries(firmenNachUnternehmer).map(async ([unternehmerId, firmen]) => {
            const firmaListen = await Promise.all(
              firmen.map(async (firma) => {
                const filialen =
                  profil.userRole === 'master'
                    ? await filialeService.loadFilialen(unternehmerId, firma.id)
                    : (
                        await Promise.all(
                          (profil.zugriffe[unternehmerId]?.[firma.id] ?? []).map((filialeId) => {
                            return filialeService.loadFilialeEintrag(
                              unternehmerId,
                              firma.id,
                              filialeId,
                            );
                          }),
                        )
                      ).filter(istVorhanden);
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
