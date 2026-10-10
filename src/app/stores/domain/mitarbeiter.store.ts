// pur-system/src/app/stores/domain/mitarbeiter.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { environment } from '../../../environments/environment';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
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

export type TMitarbeiterKontextBestand = {
  readonly unternehmerId: string;
  readonly firmaId: string;
  readonly filialId: string | null;
  readonly filialIds: readonly string[] | null;
  readonly mitarbeiter: readonly IMitarbeiterEintrag[];
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly error: string | null;
};

export type TMitarbeiterSnapshot = {
  readonly kontexte: Readonly<Record<string, TMitarbeiterKontextBestand>>;
  readonly referenzierteMitarbeiter: Readonly<Record<string, IMitarbeiterEintrag>>;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TMitarbeiterState = TMitarbeiterSnapshot;

const initialState: TMitarbeiterState = {
  kontexte: {},
  referenzierteMitarbeiter: {},
  inProgress: false,
  error: null,
};

function getKontextSchluessel(unternehmerId: string, firmaId: string, filialId?: string): string {
  return JSON.stringify([unternehmerId, firmaId, filialId ?? null]);
}

function getFilialenKontextSchluessel(
  unternehmerId: string,
  firmaId: string,
  filialIds: readonly string[],
): string {
  return JSON.stringify([unternehmerId, firmaId, [...filialIds].sort()]);
}

function getMitarbeiterSchluessel(
  unternehmerId: string,
  firmaId: string,
  mitarbeiterId: string,
): string {
  return JSON.stringify([unternehmerId, firmaId, mitarbeiterId]);
}

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
      const ladeauftraege = new Map<string, { generation: number; promise: Promise<void> }>();
      const referenzLadeauftraege = new Map<
        string,
        { generation: number; promise: Promise<IMitarbeiterEintrag | null> }
      >();

      // ===== Methoden: Laden ======================

      /**
       * Lädt die Mitarbeiter eines Firmen- oder Filialkontexts in den Sitzungsspeicher.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der übergeordneten Firma.
       * @param filialId - Optionale Filial-ID zur Begrenzung eines Filialkontos.
       * @param strategie - Datenquellenstrategie für den Ladevorgang.
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
       */
      function loadMitarbeiter(
        unternehmerId: string,
        firmaId: string,
        filialId?: string,
        strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
      ): Promise<void> {
        const schluessel = getKontextSchluessel(unternehmerId, firmaId, filialId);
        const auftragSchluessel = JSON.stringify([schluessel, strategie]);
        return loadMitarbeiterKontext(
          schluessel,
          auftragSchluessel,
          {
            unternehmerId,
            firmaId,
            filialId: filialId ?? null,
            filialIds: null,
          },
          () => {
            return mitarbeiterService.loadMitarbeiter(unternehmerId, firmaId, filialId, strategie);
          },
        );
      }

      /**
       * Lädt die eindeutige Mitarbeitermenge mehrerer Filialen in einen gemeinsamen Kontext.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der übergeordneten Firma.
       * @param filialIds - Filial-IDs des gemeinsamen Ladekontexts.
       * @param strategie - Datenquellenstrategie für den Ladevorgang.
       * @returns Ein Promise, das nach dem vollständigen Laden abgeschlossen ist.
       * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
       */
      function loadMitarbeiterNachFilialen(
        unternehmerId: string,
        firmaId: string,
        filialIds: readonly string[],
        strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
      ): Promise<void> {
        const eindeutigeFilialIds = [...new Set(filialIds)].sort();
        const schluessel = getFilialenKontextSchluessel(
          unternehmerId,
          firmaId,
          eindeutigeFilialIds,
        );
        const auftragSchluessel = JSON.stringify([schluessel, strategie]);
        return loadMitarbeiterKontext(
          schluessel,
          auftragSchluessel,
          {
            unternehmerId,
            firmaId,
            filialId: null,
            filialIds: eindeutigeFilialIds,
          },
          () => {
            return mitarbeiterService.loadMitarbeiterNachFilialen(
              unternehmerId,
              firmaId,
              eindeutigeFilialIds,
              strategie,
            );
          },
        );
      }

      /**
       * Lädt ausschließlich noch nicht im Store vorhandene Mitarbeiter über ihre Dokument-IDs.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der Firma.
       * @param mitarbeiterIds - Eindeutige Mitarbeiter-IDs aus fachlichen Referenzen.
       * @returns Ein Promise, das nach allen gezielten Netzwerkzugriffen abgeschlossen ist.
       * @throws Gibt Fehler eines gezielten Firestore-Zugriffs an die aufrufende Stelle weiter.
       */
      async function loadMitarbeiterNachIds(
        unternehmerId: string,
        firmaId: string,
        mitarbeiterIds: readonly string[],
      ): Promise<void> {
        const fehlendeIds = [...new Set(mitarbeiterIds)].filter((mitarbeiterId) => {
          return (
            Boolean(mitarbeiterId) && !getMitarbeiterById(unternehmerId, firmaId, mitarbeiterId)
          );
        });
        await Promise.all(
          fehlendeIds.map((mitarbeiterId) => {
            return loadMitarbeiterReferenz(unternehmerId, firmaId, mitarbeiterId);
          }),
        );
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt einen Mitarbeiter unter einem eindeutig geladenen Firmenkontext an.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @param firmaId - Die Dokument-ID der ausgewählten Firma.
       * @param anlage - Die Daten des neu anzulegenden Mitarbeiters.
       * @returns Das Anlageergebnis mit der erzeugten Dokument-ID.
       * @throws Wenn der Firmenkontext nicht eindeutig geladen ist oder das Speichern fehlschlägt.
       */
      async function createMitarbeiter(
        unternehmerId: string,
        firmaId: string,
        anlage: IMitarbeiterAnlage,
      ): Promise<IMitarbeiterAnlageErgebnis> {
        const [schluessel, kontext] = getEindeutigenFirmenkontext(unternehmerId, firmaId);
        const aktuelleGeneration = generation;

        patchState(store, { inProgress: true, error: null });
        try {
          const ergebnis = await mitarbeiterService.createMitarbeiter(
            unternehmerId,
            firmaId,
            anlage,
          );
          if (aktuelleGeneration !== generation) {
            return ergebnis;
          }
          const mitarbeiter: IMitarbeiterEintrag = {
            ...anlage,
            id: ergebnis.id,
            unternehmerId,
            firmaId,
          };
          if (!kontext.filialId || mitarbeiter.filialIds.includes(kontext.filialId)) {
            setKontext(schluessel, {
              ...kontext,
              mitarbeiter: sortMitarbeiter([...kontext.mitarbeiter, mitarbeiter]),
            });
          }
          return ergebnis;
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

      /**
       * Aktualisiert einen Mitarbeiter innerhalb seines eindeutig geladenen Firmenkontexts.
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
        const [schluessel, kontext] = getEindeutigenFirmenkontext(unternehmerId, firmaId);
        if (!kontext.mitarbeiter.some((eintrag) => eintrag.id === mitarbeiterId)) {
          throw new Error('Der Mitarbeiter ist nicht im geladenen Firmenkontext enthalten.');
        }
        const aktuelleGeneration = generation;

        patchState(store, { inProgress: true, error: null });
        try {
          await mitarbeiterService.updateMitarbeiter(
            unternehmerId,
            firmaId,
            mitarbeiterId,
            aktualisierung,
          );
          if (aktuelleGeneration !== generation) {
            return;
          }
          const mitarbeiter = kontext.mitarbeiter
            .map((eintrag) => {
              return eintrag.id === mitarbeiterId ? { ...eintrag, ...aktualisierung } : eintrag;
            })
            .filter((eintrag) => {
              return !kontext.filialId || eintrag.filialIds.includes(kontext.filialId);
            });
          setKontext(schluessel, {
            ...kontext,
            mitarbeiter: sortMitarbeiter(mitarbeiter),
          });
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

      /**
       * Führt mehrere doppelte Mitarbeiter in einen Zielmitarbeiter derselben Firma über.
       *
       * @param unternehmerId - Die Dokument-ID des ausgewählten Unternehmers.
       * @param firmaId - Die Dokument-ID der ausgewählten Firma.
       * @param quellMitarbeiterIds - Mitarbeiter-IDs der Duplikate.
       * @param zielMitarbeiterId - Mitarbeiter-ID des bestehen bleibenden Mitarbeiters.
       * @returns Ein Promise, das nach der bestätigten Zusammenführung abgeschlossen ist.
       * @throws Wenn Kontext oder Mitarbeiter fehlen oder das Zusammenführen fehlschlägt.
       */
      async function mergeMitarbeiter(
        unternehmerId: string,
        firmaId: string,
        quellMitarbeiterIds: readonly string[],
        zielMitarbeiterId: string,
      ): Promise<void> {
        const [schluessel, kontext] = getEindeutigenFirmenkontext(unternehmerId, firmaId);
        const eindeutigeQuellIds = [...new Set(quellMitarbeiterIds)];
        const quellIds = new Set(eindeutigeQuellIds);
        const quellen = eindeutigeQuellIds
          .map((quellMitarbeiterId) => {
            return kontext.mitarbeiter.find((eintrag) => {
              return eintrag.id === quellMitarbeiterId;
            });
          })
          .filter((eintrag) => eintrag !== undefined);
        const ziel = kontext.mitarbeiter.find((eintrag) => {
          return eintrag.id === zielMitarbeiterId;
        });
        if (
          eindeutigeQuellIds.length === 0 ||
          quellen.length !== eindeutigeQuellIds.length ||
          !ziel ||
          quellIds.has(ziel.id)
        ) {
          throw new Error('Duplikate oder Zielmitarbeiter sind für die Zusammenführung ungültig.');
        }
        const aktuelleGeneration = generation;

        patchState(store, { inProgress: true, error: null });
        try {
          await mitarbeiterService.mergeMitarbeiter(
            unternehmerId,
            firmaId,
            eindeutigeQuellIds,
            zielMitarbeiterId,
          );
          if (aktuelleGeneration !== generation) return;

          const filialIds = [
            ...new Set([...ziel.filialIds, ...quellen.flatMap((quelle) => quelle.filialIds)]),
          ];
          const rollen = [
            ...new Set([...ziel.rollen, ...quellen.flatMap((quelle) => quelle.rollen)]),
          ];
          const mitarbeiter = kontext.mitarbeiter
            .filter((eintrag) => !quellIds.has(eintrag.id))
            .map((eintrag) => {
              return eintrag.id === zielMitarbeiterId ? { ...eintrag, filialIds, rollen } : eintrag;
            });
          setKontext(schluessel, { ...kontext, mitarbeiter: sortMitarbeiter(mitarbeiter) });
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

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Liefert die Mitarbeiter eines Firmen- oder Filialkontexts.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der Firma.
       * @param filialId - Optionale Filial-ID des Kontexts.
       * @returns Die im Kontext vorhandenen Mitarbeiter.
       */
      function getMitarbeiter(
        unternehmerId: string,
        firmaId: string,
        filialId?: string,
      ): readonly IMitarbeiterEintrag[] {
        return getKontext(unternehmerId, firmaId, filialId)?.mitarbeiter ?? [];
      }

      /**
       * Liefert die gemeinsam geladenen Mitarbeiter mehrerer Filialen.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der Firma.
       * @param filialIds - Filial-IDs des gemeinsamen Ladekontexts.
       * @returns Die im gemeinsamen Kontext vorhandenen Mitarbeiter.
       */
      function getMitarbeiterNachFilialen(
        unternehmerId: string,
        firmaId: string,
        filialIds: readonly string[],
      ): readonly IMitarbeiterEintrag[] {
        const schluessel = getFilialenKontextSchluessel(unternehmerId, firmaId, [
          ...new Set(filialIds),
        ]);
        return store.kontexte()[schluessel]?.mitarbeiter ?? [];
      }

      /**
       * Liefert einen bereits geladenen Mitarbeiter unabhängig vom ursprünglichen Ladekontext.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der Firma.
       * @param mitarbeiterId - Die Dokument-ID des Mitarbeiters.
       * @returns Der vorhandene Mitarbeiter oder `null`.
       */
      function getMitarbeiterById(
        unternehmerId: string,
        firmaId: string,
        mitarbeiterId: string,
      ): IMitarbeiterEintrag | null {
        for (const kontext of Object.values(store.kontexte())) {
          if (kontext.unternehmerId !== unternehmerId || kontext.firmaId !== firmaId) continue;
          const mitarbeiter = kontext.mitarbeiter.find((eintrag) => {
            return eintrag.id === mitarbeiterId;
          });
          if (mitarbeiter) return mitarbeiter;
        }
        return (
          store.referenzierteMitarbeiter()[
            getMitarbeiterSchluessel(unternehmerId, firmaId, mitarbeiterId)
          ] ?? null
        );
      }

      /**
       * Prüft, ob ein Firmen- oder Filialkontext vollständig geladen wurde.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der Firma.
       * @param filialId - Optionale Filial-ID des Kontexts.
       * @returns `true`, wenn der Kontext vollständig geladen wurde.
       */
      function isMitarbeiterKontextLoaded(
        unternehmerId: string,
        firmaId: string,
        filialId?: string,
      ): boolean {
        return getKontext(unternehmerId, firmaId, filialId)?.isLoaded ?? false;
      }

      /**
       * Prüft, ob ein Firmen- oder Filialkontext gerade geladen wird.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der Firma.
       * @param filialId - Optionale Filial-ID des Kontexts.
       * @returns `true`, wenn der Kontext gerade geladen wird.
       */
      function isMitarbeiterKontextLoading(
        unternehmerId: string,
        firmaId: string,
        filialId?: string,
      ): boolean {
        return getKontext(unternehmerId, firmaId, filialId)?.download ?? false;
      }

      /**
       * Liefert den Ladefehler eines Firmen- oder Filialkontexts.
       *
       * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
       * @param firmaId - Die Dokument-ID der Firma.
       * @param filialId - Optionale Filial-ID des Kontexts.
       * @returns Die Fehlermeldung des Kontexts oder `null`.
       */
      function getMitarbeiterKontextError(
        unternehmerId: string,
        firmaId: string,
        filialId?: string,
      ): string | null {
        return getKontext(unternehmerId, firmaId, filialId)?.error ?? null;
      }

      /**
       * Setzt sämtliche sitzungsbezogenen Mitarbeiterkontexte zurück.
       */
      function resetMitarbeiter(): void {
        generation += 1;
        ladeauftraege.clear();
        referenzLadeauftraege.clear();
        patchState(store, initialState);
      }

      /**
       * Entfernt die aktuelle Fehlermeldung eines Schreibvorgangs.
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
          kontexte: store.kontexte(),
          referenzierteMitarbeiter: store.referenzierteMitarbeiter(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      // ===== Interne Helfer =======================

      function loadMitarbeiterReferenz(
        unternehmerId: string,
        firmaId: string,
        mitarbeiterId: string,
      ): Promise<IMitarbeiterEintrag | null> {
        const schluessel = getMitarbeiterSchluessel(unternehmerId, firmaId, mitarbeiterId);
        const laufenderAuftrag = referenzLadeauftraege.get(schluessel);
        if (laufenderAuftrag) return laufenderAuftrag.promise;

        const aktuelleGeneration = generation;
        const promise = executeMitarbeiterReferenzLoad(
          unternehmerId,
          firmaId,
          mitarbeiterId,
          schluessel,
          aktuelleGeneration,
        );
        referenzLadeauftraege.set(schluessel, { generation: aktuelleGeneration, promise });
        return promise;
      }

      async function executeMitarbeiterReferenzLoad(
        unternehmerId: string,
        firmaId: string,
        mitarbeiterId: string,
        schluessel: string,
        aktuelleGeneration: number,
      ): Promise<IMitarbeiterEintrag | null> {
        try {
          const mitarbeiter = await mitarbeiterService.loadMitarbeiterEintrag(
            unternehmerId,
            firmaId,
            mitarbeiterId,
            'networkOnly',
          );
          if (aktuelleGeneration !== generation || !mitarbeiter) return mitarbeiter;
          patchState(store, {
            referenzierteMitarbeiter: {
              ...store.referenzierteMitarbeiter(),
              [schluessel]: mitarbeiter,
            },
          });
          return mitarbeiter;
        } finally {
          if (referenzLadeauftraege.get(schluessel)?.generation === aktuelleGeneration) {
            referenzLadeauftraege.delete(schluessel);
          }
        }
      }

      function loadMitarbeiterKontext(
        schluessel: string,
        auftragSchluessel: string,
        kontext: Pick<
          TMitarbeiterKontextBestand,
          'unternehmerId' | 'firmaId' | 'filialId' | 'filialIds'
        >,
        load: () => Promise<readonly IMitarbeiterEintrag[]>,
      ): Promise<void> {
        const vorhandenerKontext = store.kontexte()[schluessel];
        if (vorhandenerKontext?.isLoaded) {
          return Promise.resolve();
        }

        const laufenderAuftrag = ladeauftraege.get(auftragSchluessel);
        if (laufenderAuftrag) {
          return laufenderAuftrag.promise;
        }

        const aktuelleGeneration = generation;
        setKontext(schluessel, {
          ...kontext,
          mitarbeiter: [],
          download: true,
          isLoaded: false,
          error: null,
        });
        const promise = executeLoad(
          schluessel,
          auftragSchluessel,
          kontext,
          load,
          aktuelleGeneration,
        );
        ladeauftraege.set(auftragSchluessel, { generation: aktuelleGeneration, promise });
        return promise;
      }

      async function executeLoad(
        schluessel: string,
        auftragSchluessel: string,
        kontext: Pick<
          TMitarbeiterKontextBestand,
          'unternehmerId' | 'firmaId' | 'filialId' | 'filialIds'
        >,
        load: () => Promise<readonly IMitarbeiterEintrag[]>,
        aktuelleGeneration: number,
      ): Promise<void> {
        try {
          const mitarbeiter = await load();
          if (aktuelleGeneration !== generation) {
            return;
          }
          const sortierteMitarbeiter = sortMitarbeiter(mitarbeiter);
          setKontext(schluessel, {
            ...kontext,
            mitarbeiter: sortierteMitarbeiter,
            download: false,
            isLoaded: true,
            error: null,
          });
        } catch (error: unknown) {
          if (aktuelleGeneration === generation) {
            const kontext = store.kontexte()[schluessel];
            if (kontext) {
              setKontext(schluessel, {
                ...kontext,
                download: false,
                error: getFirebaseErrorMessage(error),
              });
            }
          }
          throw error;
        } finally {
          if (ladeauftraege.get(auftragSchluessel)?.generation === aktuelleGeneration) {
            ladeauftraege.delete(auftragSchluessel);
          }
        }
      }

      function getKontext(
        unternehmerId: string,
        firmaId: string,
        filialId?: string,
      ): TMitarbeiterKontextBestand | undefined {
        return store.kontexte()[getKontextSchluessel(unternehmerId, firmaId, filialId)];
      }

      function getEindeutigenFirmenkontext(
        unternehmerId: string,
        firmaId: string,
      ): readonly [string, TMitarbeiterKontextBestand] {
        const kontexte = Object.entries(store.kontexte()).filter(([, kontext]) => {
          return (
            kontext.unternehmerId === unternehmerId &&
            kontext.firmaId === firmaId &&
            kontext.filialIds === null &&
            kontext.isLoaded
          );
        });
        if (kontexte.length !== 1) {
          throw new Error(
            'Die Mitarbeiter müssen vor dem Schreiben in einem eindeutigen Firmenkontext vollständig geladen werden.',
          );
        }
        return kontexte[0];
      }

      function setKontext(schluessel: string, kontext: TMitarbeiterKontextBestand): void {
        patchState(store, {
          kontexte: {
            ...store.kontexte(),
            [schluessel]: kontext,
          },
        });
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'MitarbeiterStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadMitarbeiter,
        loadMitarbeiterNachFilialen,
        loadMitarbeiterNachIds,
        createMitarbeiter,
        updateMitarbeiter,
        mergeMitarbeiter,
        getMitarbeiter,
        getMitarbeiterNachFilialen,
        getMitarbeiterById,
        isMitarbeiterKontextLoaded,
        isMitarbeiterKontextLoading,
        getMitarbeiterKontextError,
        resetMitarbeiter,
        clearError,
        snapshot,
      };
    },
  ),
);
