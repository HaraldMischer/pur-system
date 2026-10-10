// pur-system/src/app/stores/domain/dienstplan.store.ts

import { DestroyRef, computed, inject, untracked } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { environment } from '../../../environments/environment';
import {
  IDienstplanPfad,
  IDienstplanVersionPfad,
  IFilialPfad,
} from '../../commons/models/app/firestore-pfad.types';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  IDienstplanBestand,
  IDienstplanEintrag,
  IDienstplanVersionEintrag,
} from '../../commons/models/domain/dienstplan';
import {
  ISchichtAktualisierung,
  ISchichtAnlage,
  ISchichtEintrag,
} from '../../commons/models/domain/schicht';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { BenutzerStore } from '../app/benutzer.store';
import { StammdatenStore } from '../app/stammdaten.store';
import { MitarbeiterStore } from './mitarbeiter.store';
import { DebugLogService } from '../../services/core/debug-log.service';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { DienstplanService } from '../../services/domain/dienstplan.service';

// ===== Top-Level Helper =====================

type TDienstplanLademodus = 'veroeffentlicht' | 'vollstaendig';

export type TDienstplanKontextBestand = IDienstplanBestand & {
  readonly unternehmerId: string;
  readonly firmaId: string;
  readonly filialeId: string;
  readonly monatsmodi: Readonly<Record<string, TDienstplanLademodus>>;
  readonly vollstaendigGeladen: boolean;
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly error: string | null;
};

export type TDienstplanSnapshot = {
  readonly kontexte: Readonly<Record<string, TDienstplanKontextBestand>>;
  readonly selectedUnternehmerId: string | null;
  readonly selectedFirmaId: string | null;
  readonly selectedFilialeId: string | null;
  readonly selectedMonat: string | null;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TDienstplanState = TDienstplanSnapshot;

const initialState: TDienstplanState = {
  kontexte: {},
  selectedUnternehmerId: null,
  selectedFirmaId: null,
  selectedFilialeId: null,
  selectedMonat: null,
  inProgress: false,
  error: null,
};

function getKontextSchluessel(pfad: IFilialPfad): string {
  return JSON.stringify([pfad.unternehmerId, pfad.firmaId, pfad.filialeId]);
}

function createLeerenKontext(pfad: IFilialPfad): TDienstplanKontextBestand {
  return {
    ...pfad,
    dienstplaene: [],
    versionen: [],
    schichten: [],
    monatsmodi: {},
    vollstaendigGeladen: false,
    download: false,
    isLoaded: false,
    error: null,
  };
}

export const DienstplanStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TDienstplanState>(initialState),
  withComputed((store) => {
    const selectedKontext = computed(() => {
      const pfad = getSelectedPfad(store);
      return pfad ? (store.kontexte()[getKontextSchluessel(pfad)] ?? null) : null;
    });
    const selectedDienstplan = computed(() => {
      const monat = store.selectedMonat();
      return selectedKontext()?.dienstplaene.find((dienstplan) => dienstplan.id === monat) ?? null;
    });
    const selectedVersionen = computed(() => {
      const dienstplan = selectedDienstplan();
      return dienstplan
        ? (selectedKontext()?.versionen.filter(
            (version) => version.dienstplanId === dienstplan.id,
          ) ?? [])
        : [];
    });
    const selectedSchichten = computed(() => {
      const versionIds = new Set(selectedVersionen().map((version) => version.id));
      return (
        selectedKontext()?.schichten.filter((schicht) => versionIds.has(schicht.versionId)) ?? []
      );
    });
    const download = computed(() => {
      return selectedKontext()?.download ?? false;
    });
    const isLoaded = computed(() => {
      const monat = store.selectedMonat();
      const kontext = selectedKontext();
      return Boolean(
        kontext && monat && (kontext.vollstaendigGeladen || kontext.monatsmodi[monat]),
      );
    });

    return {
      selectedKontext,
      selectedDienstplan,
      selectedVersionen,
      selectedSchichten,
      download,
      isLoaded,
    };
  }),
  withMethods(
    (
      store,
      dienstplanService = inject(DienstplanService),
      benutzerStore = inject(BenutzerStore),
      stammdatenStore = inject(StammdatenStore),
      mitarbeiterStore = inject(MitarbeiterStore),
      debugLogService = inject(DebugLogService),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;
      let filialdatenTitelAusgegeben = false;
      const ladeauftraege = new Map<
        string,
        { generation: number; kontextSchluessel: string; promise: Promise<void> }
      >();

      // ===== Methoden: Laden ======================

      /**
       * Lädt einen Monatsplan mit den für die aktuelle Ansicht erlaubten Versionen.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @param monat - Monat im Format `YYYY-MM`.
       * @param nurVeroeffentlicht - Begrenzt den Ladevorgang auf den veröffentlichten Stand.
       * @param strategie - Datenquellenstrategie für den Ladevorgang.
       */
      function loadDienstplanMonat(
        pfad: IFilialPfad,
        monat: string,
        nurVeroeffentlicht: boolean,
        strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
      ): Promise<void> {
        const modus: TDienstplanLademodus = nurVeroeffentlicht ? 'veroeffentlicht' : 'vollstaendig';
        const kontext = getKontext(pfad);
        if (
          kontext?.vollstaendigGeladen ||
          kontext?.monatsmodi[monat] === 'vollstaendig' ||
          kontext?.monatsmodi[monat] === modus
        ) {
          return Promise.resolve();
        }
        const auftragSchluessel = JSON.stringify([
          getKontextSchluessel(pfad),
          monat,
          modus,
          strategie,
        ]);
        return loadKontext(pfad, auftragSchluessel, async () => {
          const bestand = await dienstplanService.loadDienstplanMonat(
            { ...pfad, dienstplanId: monat },
            nurVeroeffentlicht,
            strategie,
          );
          await loadReferenzierteMitarbeiter(pfad, bestand);
          logDienstplanBestand(pfad, bestand);
          return { bestand, monat, modus };
        });
      }

      /**
       * Lädt den vollständigen Dienstplanbestand einer Filiale.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @param strategie - Datenquellenstrategie für den Ladevorgang.
       */
      function loadDienstplanBestand(
        pfad: IFilialPfad,
        strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
      ): Promise<void> {
        if (getKontext(pfad)?.vollstaendigGeladen) {
          return Promise.resolve();
        }
        const auftragSchluessel = JSON.stringify([
          getKontextSchluessel(pfad),
          'vollstaendiger-bestand',
          strategie,
        ]);
        return loadKontext(pfad, auftragSchluessel, async () => {
          const bestand = await dienstplanService.loadDienstplanBestand(pfad, strategie);
          await loadReferenzierteMitarbeiter(pfad, bestand);
          logDienstplanBestand(pfad, bestand);
          return { bestand, vollstaendig: true };
        });
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt einen initialen Monatsplan im vollständig geladenen Filialkontext an.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @param monat - Monat im Format `YYYY-MM`.
       */
      async function createDienstplan(pfad: IFilialPfad, monat: string): Promise<void> {
        const kontext = requireSchreibkontext(pfad, monat, false);
        if (kontext.dienstplaene.some((dienstplan) => dienstplan.id === monat)) {
          throw new Error('Für diesen Monat ist bereits ein Dienstplan vorhanden.');
        }
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          const ergebnis = await dienstplanService.createDienstplan(pfad, monat, benutzerUid);
          setKontext(pfad, {
            ...kontext,
            dienstplaene: [...kontext.dienstplaene, ergebnis.dienstplan].sort((a, b) => {
              return a.id.localeCompare(b.id);
            }),
            versionen: [...kontext.versionen, ergebnis.version].sort(sortVersionen),
            monatsmodi: { ...kontext.monatsmodi, [monat]: 'vollstaendig' },
          });
        });
      }

      /**
       * Legt eine Schicht in einer Entwurfsversion an.
       *
       * @param pfad - Vollständiger Pfad der Entwurfsversion.
       * @param anlage - Fachliche Schichtdaten.
       */
      async function createSchicht(
        pfad: IDienstplanVersionPfad,
        anlage: ISchichtAnlage,
      ): Promise<void> {
        const { kontext, version } = requireEntwurf(pfad);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          const ergebnis = await dienstplanService.createSchicht(
            pfad,
            version.revision,
            anlage,
            benutzerUid,
          );
          setKontext(pfad, {
            ...kontext,
            versionen: updateVersionRevision(
              kontext.versionen,
              version.id,
              ergebnis.versionRevision,
            ),
            schichten: [...kontext.schichten, ergebnis.schicht].sort(sortSchichten),
          });
        });
      }

      /**
       * Aktualisiert eine Schicht in einer Entwurfsversion.
       *
       * @param pfad - Vollständiger Pfad der Entwurfsversion.
       * @param schichtId - Dokument-ID der Schicht.
       * @param aktualisierung - Vollständige bearbeitbare Schichtdaten.
       */
      async function updateSchicht(
        pfad: IDienstplanVersionPfad,
        schichtId: string,
        aktualisierung: ISchichtAktualisierung,
      ): Promise<void> {
        const { kontext, version } = requireEntwurf(pfad);
        const schicht = kontext.schichten.find((eintrag) => {
          return eintrag.id === schichtId && eintrag.versionId === version.id;
        });
        if (!schicht) {
          throw new Error('Die Schicht wurde im geladenen Entwurf nicht gefunden.');
        }
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          const ergebnis = await dienstplanService.updateSchicht(
            pfad,
            schicht,
            version.revision,
            aktualisierung,
            benutzerUid,
          );
          setKontext(pfad, {
            ...kontext,
            versionen: updateVersionRevision(
              kontext.versionen,
              version.id,
              ergebnis.versionRevision,
            ),
            schichten: kontext.schichten
              .map((eintrag) => {
                return eintrag.id === schichtId ? ergebnis.schicht : eintrag;
              })
              .sort(sortSchichten),
          });
        });
      }

      /**
       * Löscht eine Schicht aus einer Entwurfsversion.
       *
       * @param pfad - Vollständiger Pfad der Entwurfsversion.
       * @param schichtId - Dokument-ID der Schicht.
       */
      async function deleteSchicht(pfad: IDienstplanVersionPfad, schichtId: string): Promise<void> {
        const { kontext, version } = requireEntwurf(pfad);
        const schicht = kontext.schichten.find((eintrag) => {
          return eintrag.id === schichtId && eintrag.versionId === version.id;
        });
        if (!schicht) {
          throw new Error('Die Schicht wurde im geladenen Entwurf nicht gefunden.');
        }
        const benutzerUid = requireBenutzerUid();
        await executeWrite(async () => {
          const ergebnis = await dienstplanService.deleteSchicht(
            pfad,
            schicht,
            version.revision,
            benutzerUid,
          );
          setKontext(pfad, {
            ...kontext,
            versionen: updateVersionRevision(
              kontext.versionen,
              version.id,
              ergebnis.versionRevision,
            ),
            schichten: kontext.schichten.filter((eintrag) => eintrag.id !== schichtId),
          });
        });
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Wählt einen Filialkontext und Monat für die Schichtplanansicht.
       *
       * @param pfad - Vollständiger Filialpfad oder `null`.
       * @param monat - Monat im Format `YYYY-MM` oder `null`.
       */
      function selectDienstplan(pfad: IFilialPfad | null, monat: string | null): void {
        patchState(store, {
          selectedUnternehmerId: pfad?.unternehmerId ?? null,
          selectedFirmaId: pfad?.firmaId ?? null,
          selectedFilialeId: pfad?.filialeId ?? null,
          selectedMonat: monat,
        });
      }

      /**
       * Liefert einen geladenen Filialkontext.
       *
       * @param pfad - Vollständiger Filialpfad.
       * @returns Geladener Kontext oder `null`.
       */
      function getDienstplanKontext(pfad: IFilialPfad): TDienstplanKontextBestand | null {
        return getKontext(pfad) ?? null;
      }

      /**
       * Setzt alle sitzungsbezogenen Dienstplandaten zurück.
       */
      function resetDienstplaene(): void {
        generation += 1;
        filialdatenTitelAusgegeben = false;
        ladeauftraege.clear();
        patchState(store, initialState);
      }

      /**
       * Entfernt den Fehler des letzten Schreibvorgangs.
       */
      function clearError(): void {
        patchState(store, { error: null });
      }

      /**
       * Liefert eine Momentaufnahme des Dienstplan-Stores.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TDienstplanSnapshot {
        return untracked(() => ({
          kontexte: store.kontexte(),
          selectedUnternehmerId: store.selectedUnternehmerId(),
          selectedFirmaId: store.selectedFirmaId(),
          selectedFilialeId: store.selectedFilialeId(),
          selectedMonat: store.selectedMonat(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      // ===== Interne Helfer =======================

      function loadKontext(
        pfad: IFilialPfad,
        auftragSchluessel: string,
        load: () => Promise<{
          bestand: IDienstplanBestand;
          monat?: string;
          modus?: TDienstplanLademodus;
          vollstaendig?: boolean;
        }>,
      ): Promise<void> {
        const laufenderAuftrag = ladeauftraege.get(auftragSchluessel);
        if (laufenderAuftrag) {
          return laufenderAuftrag.promise;
        }
        const aktuelleGeneration = generation;
        const kontext = getKontext(pfad) ?? createLeerenKontext(pfad);
        setKontext(pfad, { ...kontext, download: true, error: null });
        const promise = executeLoad(pfad, auftragSchluessel, load, aktuelleGeneration);
        ladeauftraege.set(auftragSchluessel, {
          generation: aktuelleGeneration,
          kontextSchluessel: getKontextSchluessel(pfad),
          promise,
        });
        return promise;
      }

      async function executeLoad(
        pfad: IFilialPfad,
        auftragSchluessel: string,
        load: () => Promise<{
          bestand: IDienstplanBestand;
          monat?: string;
          modus?: TDienstplanLademodus;
          vollstaendig?: boolean;
        }>,
        aktuelleGeneration: number,
      ): Promise<void> {
        try {
          const ergebnis = await load();
          if (aktuelleGeneration !== generation) return;
          const bisher = getKontext(pfad) ?? createLeerenKontext(pfad);
          const bestand = ergebnis.vollstaendig
            ? ergebnis.bestand
            : mergeMonatBestand(bisher, ergebnis.bestand, ergebnis.monat!);
          setKontext(pfad, {
            ...bisher,
            ...bestand,
            monatsmodi:
              ergebnis.monat && ergebnis.modus
                ? { ...bisher.monatsmodi, [ergebnis.monat]: ergebnis.modus }
                : bisher.monatsmodi,
            vollstaendigGeladen: bisher.vollstaendigGeladen || Boolean(ergebnis.vollstaendig),
            download: hasWeiterenLadeauftrag(pfad, auftragSchluessel),
            isLoaded: true,
            error: null,
          });
        } catch (error: unknown) {
          if (aktuelleGeneration === generation) {
            const kontext = getKontext(pfad) ?? createLeerenKontext(pfad);
            setKontext(pfad, {
              ...kontext,
              download: hasWeiterenLadeauftrag(pfad, auftragSchluessel),
              error: getFirebaseErrorMessage(error),
            });
          }
          throw error;
        } finally {
          if (ladeauftraege.get(auftragSchluessel)?.generation === aktuelleGeneration) {
            ladeauftraege.delete(auftragSchluessel);
          }
        }
      }

      async function executeWrite(aktion: () => Promise<void>): Promise<void> {
        if (store.inProgress()) {
          throw new Error('Ein Dienstplan-Schreibvorgang läuft bereits.');
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

      function getKontext(pfad: IFilialPfad): TDienstplanKontextBestand | undefined {
        return store.kontexte()[getKontextSchluessel(pfad)];
      }

      function loadReferenzierteMitarbeiter(
        pfad: IFilialPfad,
        bestand: IDienstplanBestand,
      ): Promise<void> {
        return mitarbeiterStore.loadMitarbeiterNachIds(
          pfad.unternehmerId,
          pfad.firmaId,
          bestand.schichten.map((schicht) => schicht.mitarbeiterId),
        );
      }

      function logDienstplanBestand(pfad: IFilialPfad, bestand: IDienstplanBestand): void {
        const filialname =
          stammdatenStore
            .getFilialen(pfad.unternehmerId, pfad.firmaId)
            .find((filiale) => filiale.id === pfad.filialeId)?.anzeigename ?? pfad.filialeId;
        if (!filialdatenTitelAusgegeben) {
          debugLogService.logDatenflussTitel('3. FILIALDATEN ');
          filialdatenTitelAusgegeben = true;
        }
        debugLogService.logDatenGeladen(`Dienstpläne | ${filialname}`, bestand.dienstplaene.length);
        debugLogService.logDatenGeladen(`Versionen | ${filialname}`, bestand.versionen.length);
        debugLogService.logDatenGeladen(`Schichten | ${filialname}`, bestand.schichten.length);
      }

      function hasWeiterenLadeauftrag(
        pfad: IFilialPfad,
        aktuellerAuftragSchluessel: string,
      ): boolean {
        const kontextSchluessel = getKontextSchluessel(pfad);
        return [...ladeauftraege.entries()].some(([auftragSchluessel, auftrag]) => {
          return (
            auftragSchluessel !== aktuellerAuftragSchluessel &&
            auftrag.kontextSchluessel === kontextSchluessel
          );
        });
      }

      function setKontext(pfad: IFilialPfad, kontext: TDienstplanKontextBestand): void {
        patchState(store, {
          kontexte: { ...store.kontexte(), [getKontextSchluessel(pfad)]: kontext },
        });
      }

      function requireSchreibkontext(
        pfad: IFilialPfad,
        monat: string,
        dienstplanErforderlich = true,
      ): TDienstplanKontextBestand {
        const kontext = getKontext(pfad);
        const monatGeladen =
          kontext?.vollstaendigGeladen || kontext?.monatsmodi[monat] === 'vollstaendig';
        const dienstplanVorhanden = kontext?.dienstplaene.some((eintrag) => eintrag.id === monat);
        if (!kontext || !monatGeladen || (dienstplanErforderlich && !dienstplanVorhanden)) {
          throw new Error(
            'Der vollständige Dienstplanmonat muss vor dem Schreiben geladen werden.',
          );
        }
        return kontext;
      }

      function requireEntwurf(pfad: IDienstplanVersionPfad): {
        kontext: TDienstplanKontextBestand;
        version: IDienstplanVersionEintrag;
      } {
        const kontext = requireSchreibkontext(pfad, pfad.dienstplanId);
        const version = kontext.versionen.find((eintrag) => eintrag.id === pfad.versionId);
        if (!version || version.status !== 'entwurf') {
          throw new Error('Die ausgewählte Dienstplanversion ist kein bearbeitbarer Entwurf.');
        }
        return { kontext, version };
      }

      function requireBenutzerUid(): string {
        const benutzerUid = benutzerStore.benutzerId();
        if (!benutzerUid) {
          throw new Error('Für den Schreibvorgang fehlt die Benutzeridentität.');
        }
        return benutzerUid;
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'DienstplanStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadDienstplanMonat,
        loadDienstplanBestand,
        createDienstplan,
        createSchicht,
        updateSchicht,
        deleteSchicht,
        selectDienstplan,
        getDienstplanKontext,
        resetDienstplaene,
        clearError,
        snapshot,
      };
    },
  ),
);

function getSelectedPfad(store: {
  selectedUnternehmerId(): string | null;
  selectedFirmaId(): string | null;
  selectedFilialeId(): string | null;
}): IFilialPfad | null {
  const unternehmerId = store.selectedUnternehmerId();
  const firmaId = store.selectedFirmaId();
  const filialId = store.selectedFilialeId();
  return unternehmerId && firmaId && filialId
    ? { unternehmerId, firmaId, filialeId: filialId }
    : null;
}

function mergeMonatBestand(
  kontext: TDienstplanKontextBestand,
  bestand: IDienstplanBestand,
  monat: string,
): IDienstplanBestand {
  const bisherigeVersionIds = new Set(
    kontext.versionen
      .filter((version) => version.dienstplanId === monat)
      .map((version) => version.id),
  );
  return {
    dienstplaene: [
      ...kontext.dienstplaene.filter((dienstplan) => dienstplan.id !== monat),
      ...bestand.dienstplaene,
    ].sort((a, b) => a.id.localeCompare(b.id)),
    versionen: [
      ...kontext.versionen.filter((version) => version.dienstplanId !== monat),
      ...bestand.versionen,
    ].sort(sortVersionen),
    schichten: [
      ...kontext.schichten.filter((schicht) => !bisherigeVersionIds.has(schicht.versionId)),
      ...bestand.schichten,
    ].sort(sortSchichten),
  };
}

function updateVersionRevision(
  versionen: readonly IDienstplanVersionEintrag[],
  versionId: string,
  revision: number,
): IDienstplanVersionEintrag[] {
  return versionen.map((version) => {
    return version.id === versionId ? { ...version, revision } : version;
  });
}

function sortVersionen(
  erste: IDienstplanVersionEintrag,
  zweite: IDienstplanVersionEintrag,
): number {
  return erste.dienstplanId.localeCompare(zweite.dienstplanId) || erste.nummer - zweite.nummer;
}

function sortSchichten(erste: ISchichtEintrag, zweite: ISchichtEintrag): number {
  return erste.beginn.toMillis() - zweite.beginn.toMillis() || erste.id.localeCompare(zweite.id);
}
