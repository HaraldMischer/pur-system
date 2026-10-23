// pur-system/src/app/stores/domain/mitarbeiterbelegung.store.ts

import { DestroyRef, computed, inject, untracked } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { IFirmaPfad } from '../../commons/models/app/firestore-pfad.types';
import type { IMitarbeiterbelegungDokument } from '../../commons/models/domain/mitarbeiterbelegung';
import type { ISchichtZeitdaten } from '../../commons/models/domain/schicht';
import { createDienstplanZeitraum } from '../../commons/utils/dienstplan/dienstplan-zeitraum';
import {
  createMitarbeiterbelegungId,
  createMitarbeiterbelegungReferenzSchluessel,
  getMitarbeiterbelegungKonflikte,
  getMitarbeiterbelegungZeitraumTage,
  getRelevanteMitarbeiterbelegungen,
  hatMitarbeiterbelegungUeberschneidung,
} from '../../commons/utils/dienstplan/mitarbeiterbelegung';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { DebugLogService } from '../../services/core/debug-log.service';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { DienstplanService } from '../../services/domain/dienstplan.service';

// ===== Top-Level Helper =====================

const MAX_DOKUMENT_IDS_PRO_LISTENER = 30;

export type TMitarbeiterbelegungSnapshot = {
  readonly unternehmerId: string | null;
  readonly firmaId: string | null;
  readonly filialIds: readonly string[];
  readonly monat: string | null;
  readonly mitarbeiterIds: readonly string[];
  readonly belegungstage: Readonly<Record<string, IMitarbeiterbelegungDokument>>;
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly error: string | null;
};

type TMitarbeiterbelegungState = TMitarbeiterbelegungSnapshot;

const initialState: TMitarbeiterbelegungState = {
  unternehmerId: null,
  firmaId: null,
  filialIds: [],
  monat: null,
  mitarbeiterIds: [],
  belegungstage: {},
  download: false,
  isLoaded: false,
  error: null,
};

function createBeobachtungsschluessel(
  pfad: IFirmaPfad,
  filialIds: readonly string[],
  monat: string,
  mitarbeiterIds: readonly string[],
): string {
  return JSON.stringify([
    pfad.unternehmerId,
    pfad.firmaId,
    [...new Set(filialIds)].sort(),
    monat,
    [...new Set(mitarbeiterIds)].sort(),
  ]);
}

function teileInGruppen<T>(werte: readonly T[], gruppengroesse: number): readonly T[][] {
  const gruppen: T[][] = [];
  for (let index = 0; index < werte.length; index += gruppengroesse) {
    gruppen.push(werte.slice(index, index + gruppengroesse));
  }
  return gruppen;
}

export const MitarbeiterbelegungStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TMitarbeiterbelegungState>(initialState),
  withComputed((store) => {
    const istVerfuegbar = computed(() => {
      return store.isLoaded() && !store.download() && store.error() === null;
    });
    const belegungen = computed(() => {
      return Object.values(store.belegungstage()).flatMap((tag) => tag.belegungen);
    });
    const konflikte = computed(() => {
      const dokumenteNachMitarbeiter = new Map<string, IMitarbeiterbelegungDokument[]>();
      Object.values(store.belegungstage()).forEach((dokument) => {
        dokumenteNachMitarbeiter.set(dokument.mitarbeiterId, [
          ...(dokumenteNachMitarbeiter.get(dokument.mitarbeiterId) ?? []),
          dokument,
        ]);
      });
      return [...dokumenteNachMitarbeiter.values()].flatMap((dokumente) => {
        return getMitarbeiterbelegungKonflikte(
          dokumente.flatMap((dokument) => dokument.belegungen),
        );
      });
    });
    const konfliktSchichtSchluessel = computed(() => {
      return new Set(
        konflikte().flatMap((konflikt) => {
          return konflikt.belegungen.map(createMitarbeiterbelegungReferenzSchluessel);
        }),
      );
    });
    return { istVerfuegbar, belegungen, konflikte, konfliktSchichtSchluessel };
  }),
  withMethods(
    (
      store,
      dienstplanService = inject(DienstplanService),
      debugLogService = inject(DebugLogService),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;
      let beobachtungsschluessel: string | null = null;
      let unsubscribeListener: Array<() => void> = [];

      // ===== Methoden: Laden ======================

      /**
       * Beobachtet den begrenzten Mitarbeiterbelegungsstand einer Firmenplanung.
       *
       * @param pfad - Vollständiger Firmenpfad.
       * @param filialIds - Aktuell sichtbare Filialen.
       * @param monat - Ausgewählter Monat im Format `YYYY-MM`.
       * @param mitarbeiterIds - Aktuell sichtbare Mitarbeiter.
       */
      function observeMitarbeiterbelegungen(
        pfad: IFirmaPfad,
        filialIds: readonly string[],
        monat: string,
        mitarbeiterIds: readonly string[],
      ): void {
        const normalisierteFilialIds = [...new Set(filialIds)].sort();
        const normalisierteMitarbeiterIds = [...new Set(mitarbeiterIds)].sort();
        const neuerSchluessel = createBeobachtungsschluessel(
          pfad,
          normalisierteFilialIds,
          monat,
          normalisierteMitarbeiterIds,
        );
        if (beobachtungsschluessel === neuerSchluessel) return;

        beendeListener();
        const aktuelleGeneration = ++generation;
        beobachtungsschluessel = neuerSchluessel;
        patchState(store, {
          ...pfad,
          filialIds: normalisierteFilialIds,
          monat,
          mitarbeiterIds: normalisierteMitarbeiterIds,
          belegungstage: {},
          download: true,
          isLoaded: false,
          error: null,
        });

        let dokumentIds: readonly string[];
        try {
          const zeitraum = createDienstplanZeitraum(monat);
          const tage = getMitarbeiterbelegungZeitraumTage(
            zeitraum.zeitraumStart,
            zeitraum.zeitraumEnde,
          );
          dokumentIds = normalisierteMitarbeiterIds.flatMap((mitarbeiterId) => {
            return tage.map((datum) => createMitarbeiterbelegungId(mitarbeiterId, datum));
          });
        } catch (error: unknown) {
          handleBeobachtungsfehler(aktuelleGeneration, error);
          return;
        }

        const gruppen = teileInGruppen(dokumentIds, MAX_DOKUMENT_IDS_PRO_LISTENER);
        if (gruppen.length === 0) {
          patchState(store, { download: false, isLoaded: true });
          return;
        }
        const gruppenstaende = new Map<
          number,
          readonly {
            id: string;
            daten: IMitarbeiterbelegungDokument;
          }[]
        >();
        const initialGeladeneGruppen = new Set<number>();
        gruppen.forEach((gruppe, gruppenIndex) => {
          const unsubscribe = dienstplanService.observeMitarbeiterbelegungen(
            pfad,
            gruppe,
            (dokumente) => {
              if (aktuelleGeneration !== generation) return;
              try {
                dokumente.forEach((dokument) => validateBelegungstag(dokument.id, dokument.daten));
                gruppenstaende.set(gruppenIndex, dokumente);
                initialGeladeneGruppen.add(gruppenIndex);
                const belegungstage = Object.fromEntries(
                  [...gruppenstaende.values()].flat().map((dokument) => {
                    return [dokument.id, dokument.daten];
                  }),
                );
                const istVollstaendig = initialGeladeneGruppen.size === gruppen.length;
                patchState(store, {
                  belegungstage,
                  download: !istVollstaendig,
                  isLoaded: istVollstaendig,
                  error: null,
                });
              } catch (error: unknown) {
                handleBeobachtungsfehler(aktuelleGeneration, error);
              }
            },
            (error) => {
              handleBeobachtungsfehler(aktuelleGeneration, error);
            },
          );
          unsubscribeListener.push(unsubscribe);
        });
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Beendet die aktuelle Beobachtung und entfernt ihren Zustand.
       */
      function stopMitarbeiterbelegungen(): void {
        generation += 1;
        beobachtungsschluessel = null;
        beendeListener();
        patchState(store, initialState);
      }

      /**
       * Liefert den aktuell beobachteten Belegungstag eines Mitarbeiters.
       *
       * @param mitarbeiterId - ID des Mitarbeiters.
       * @param datum - Lokales Kalenderdatum.
       * @returns Belegungstag oder `null`, wenn kein Dokument vorhanden ist.
       */
      function getMitarbeiterbelegung(
        mitarbeiterId: string,
        datum: string,
      ): IMitarbeiterbelegungDokument | null {
        return store.belegungstage()[createMitarbeiterbelegungId(mitarbeiterId, datum)] ?? null;
      }

      /**
       * Prüft einen Mitarbeiterzeitraum gegen den vollständig geladenen Live-Belegungsstand.
       *
       * @param mitarbeiterId - Zu prüfender Mitarbeiter.
       * @param zeitraum - Beginn und Ende der geplanten Schicht.
       * @param ausgenommenerSchichtSchluessel - Optional nicht gegen sich selbst zu prüfende Schicht.
       * @returns `true`, wenn der Stand unzuverlässig oder der Zeitraum bereits belegt ist.
       */
      function hatMitarbeiterZeitkonflikt(
        mitarbeiterId: string,
        zeitraum: ISchichtZeitdaten,
        ausgenommenerSchichtSchluessel?: string,
      ): boolean {
        if (!store.isLoaded() || store.error() !== null) return true;
        const belegungen = Object.values(store.belegungstage())
          .filter((dokument) => dokument.mitarbeiterId === mitarbeiterId)
          .flatMap((dokument) => dokument.belegungen);
        return getRelevanteMitarbeiterbelegungen(belegungen).some((belegung) => {
          return (
            createMitarbeiterbelegungReferenzSchluessel(belegung) !==
              ausgenommenerSchichtSchluessel &&
            hatMitarbeiterbelegungUeberschneidung(belegung, {
              ...belegung,
              beginn: zeitraum.beginn,
              ende: zeitraum.ende,
            })
          );
        });
      }

      /**
       * Liefert eine Momentaufnahme des Belegungs-Stores.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TMitarbeiterbelegungSnapshot {
        return untracked(() => ({
          unternehmerId: store.unternehmerId(),
          firmaId: store.firmaId(),
          filialIds: store.filialIds(),
          monat: store.monat(),
          mitarbeiterIds: store.mitarbeiterIds(),
          belegungstage: store.belegungstage(),
          download: store.download(),
          isLoaded: store.isLoaded(),
          error: store.error(),
        }));
      }

      // ===== Interne Helfer =======================

      function beendeListener(): void {
        unsubscribeListener.forEach((unsubscribe) => unsubscribe());
        unsubscribeListener = [];
      }

      function handleBeobachtungsfehler(aktuelleGeneration: number, error: unknown): void {
        if (aktuelleGeneration !== generation) return;
        generation += 1;
        beobachtungsschluessel = null;
        beendeListener();
        debugLogService.log(
          'Store',
          'Mitarbeiterbelegungen konnten nicht beobachtet werden.',
          error,
        );
        patchState(store, {
          download: false,
          isLoaded: false,
          error: `Der Belegungsindex konnte nicht live geladen werden. ${getFirebaseErrorMessage(error)}`,
        });
      }

      function validateBelegungstag(
        dokumentId: string,
        dokument: IMitarbeiterbelegungDokument,
      ): void {
        if (
          createMitarbeiterbelegungId(dokument.mitarbeiterId, dokument.datum) !== dokumentId ||
          !Array.isArray(dokument.belegungen) ||
          dokument.belegungen.some((belegung) => {
            return (
              belegung.mitarbeiterId !== dokument.mitarbeiterId ||
              !/^\d{4}-\d{2}-\d{2}$/.test(belegung.datum) ||
              !belegung.filialeId ||
              !belegung.dienstplanId ||
              !belegung.versionId ||
              !belegung.schichtId ||
              !['entwurf', 'veroeffentlicht', 'archiviert'].includes(belegung.status) ||
              typeof belegung.beginn?.toMillis !== 'function' ||
              typeof belegung.ende?.toMillis !== 'function'
            );
          })
        ) {
          throw new Error('Der empfangene Belegungstag ist fachlich ungültig.');
        }
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'MitarbeiterbelegungStore',
        snapshot,
      );
      destroyRef.onDestroy(() => {
        stopMitarbeiterbelegungen();
        unregisterSnapshot();
      });

      return {
        observeMitarbeiterbelegungen,
        stopMitarbeiterbelegungen,
        getMitarbeiterbelegung,
        hatMitarbeiterZeitkonflikt,
        snapshot,
      };
    },
  ),
);
