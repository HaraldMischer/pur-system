// pur-system/src/app/stores/domain/filialeinstellung.store.ts

import { DestroyRef, inject, untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { environment } from '../../../environments/environment';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import {
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungSondertagEintrag,
} from '../../commons/models/domain/filialeinstellung';
import {
  IAufgeloesteOeffnungsregel,
  resolveOeffnungsregel,
} from '../../commons/utils/filialeinstellung/oeffnungsregel-aufloesung';
import { SondertagDatumskollisionFehler } from '../../commons/utils/filialeinstellung/sondertag-kollision';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { DebugLogService } from '../../services/core/debug-log.service';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import {
  FilialeinstellungFachfehler,
  FilialeinstellungService,
  IFilialeinstellungAusnahmeSchreibdaten,
  IFilialeinstellungBestand,
  IFilialeinstellungGrundlagen,
  IFilialeinstellungRohdaten,
  IFilialeinstellungSondertagAktualisierung,
  IFilialeinstellungSondertagAnlage,
  IFilialeinstellungSystemSondertagAktualisierung,
} from '../../services/domain/filialeinstellung.service';
import { BenutzerStore } from '../app/benutzer.store';
import { StammdatenStore } from '../app/stammdaten.store';

// ===== Top-Level Helper =====================

export interface IFilialeinstellungFehler {
  readonly meldung: string;
  readonly ursache: string | null;
}

export type TFilialeinstellungKontext = IFilialPfad & {
  readonly rohdaten: IFilialeinstellungRohdaten | null;
  readonly bestand: IFilialeinstellungBestand | null;
  readonly download: boolean;
  readonly isLoaded: boolean;
  readonly inProgress: boolean;
  readonly error: IFilialeinstellungFehler | null;
};

export type TFilialeinstellungSnapshot = {
  readonly kontexte: Readonly<Record<string, TFilialeinstellungKontext>>;
};

type TFilialeinstellungState = TFilialeinstellungSnapshot;

const initialState: TFilialeinstellungState = { kontexte: {} };

function getKontextSchluessel(pfad: IFilialPfad): string {
  return JSON.stringify([pfad.unternehmerId, pfad.firmaId, pfad.filialeId]);
}

function createLeerenKontext(pfad: IFilialPfad): TFilialeinstellungKontext {
  return {
    ...pfad,
    rohdaten: null,
    bestand: null,
    download: false,
    isLoaded: false,
    inProgress: false,
    error: null,
  };
}

function createFehler(meldung: string, error: unknown): IFilialeinstellungFehler {
  return { meldung, ursache: getFehlerursache(error) };
}

function getFehlerursache(error: unknown): string | null {
  if (
    error instanceof FilialeinstellungFachfehler ||
    error instanceof SondertagDatumskollisionFehler
  )
    return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return getFirebaseErrorMessage(error);
  }
  return null;
}

function sortSondertage(
  sondertage: readonly IFilialeinstellungSondertagEintrag[],
): readonly IFilialeinstellungSondertagEintrag[] {
  return [...sondertage].sort((links, rechts) => {
    return links.bezeichnung.localeCompare(rechts.bezeichnung, 'de');
  });
}

function sortAusnahmen(
  ausnahmen: readonly IFilialeinstellungAusnahmeEintrag[],
): readonly IFilialeinstellungAusnahmeEintrag[] {
  return [...ausnahmen].sort((links, rechts) => {
    return links.datum.localeCompare(rechts.datum);
  });
}

function replaceSondertag(
  sondertage: readonly IFilialeinstellungSondertagEintrag[],
  aktualisiert: IFilialeinstellungSondertagEintrag,
): readonly IFilialeinstellungSondertagEintrag[] {
  return sortSondertage(
    sondertage.map((eintrag) => {
      return eintrag.id === aktualisiert.id ? aktualisiert : eintrag;
    }),
  );
}

function sortBestand(bestand: IFilialeinstellungBestand): IFilialeinstellungBestand {
  return {
    ...bestand,
    sondertage: sortSondertage(bestand.sondertage),
    ausnahmen: sortAusnahmen(bestand.ausnahmen),
  };
}

export const FilialeinstellungStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TFilialeinstellungState>(initialState),
  withMethods(
    (
      store,
      filialeinstellungService = inject(FilialeinstellungService),
      benutzerStore = inject(BenutzerStore),
      stammdatenStore = inject(StammdatenStore),
      debugLogService = inject(DebugLogService),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;
      let filialdatenTitelAusgegeben = false;
      const kontextGenerationen = new Map<string, number>();
      const ladeauftraege = new Map<string, Promise<void>>();

      // ===== Methoden: Laden ======================

      /**
       * Lädt den vollständigen Einstellungsbestand einer Filiale.
       */
      function loadFilialeinstellung(
        pfad: IFilialPfad,
        strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
      ): Promise<void> {
        const kontext = getFilialeinstellungKontext(pfad);
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
       * Initialisiert einen geladenen, bisher leeren Filialeinstellungskontext.
       */
      async function initializeFilialeinstellung(
        pfad: IFilialPfad,
        grundlagen: IFilialeinstellungGrundlagen,
      ): Promise<void> {
        const kontext = requireKontext(pfad, false);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(
          pfad,
          kontext,
          'Die Filialeinstellungen konnten nicht gespeichert werden.',
          async () => {
            return filialeinstellungService.initializeFilialeinstellung(
              pfad,
              grundlagen,
              benutzerUid,
            );
          },
        );
      }

      /**
       * Speichert allgemeine Einstellungen und Wochenregeln des Filialkontexts.
       */
      async function saveGrundlagen(
        pfad: IFilialPfad,
        grundlagen: IFilialeinstellungGrundlagen,
      ): Promise<void> {
        const kontext = requireKontext(pfad, true);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(
          pfad,
          kontext,
          'Die Filialeinstellungen konnten nicht gespeichert werden.',
          async () => {
            return filialeinstellungService.saveGrundlagen(
              pfad,
              requireBestand(kontext),
              grundlagen,
              benutzerUid,
            );
          },
        );
      }

      /**
       * Legt einen benutzerdefinierten Sondertag im Filialkontext an.
       */
      async function createSondertag(
        pfad: IFilialPfad,
        anlage: IFilialeinstellungSondertagAnlage,
      ): Promise<void> {
        const kontext = requireKontext(pfad, true);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(
          pfad,
          kontext,
          'Der Sondertag konnte nicht angelegt werden.',
          async () => {
            const bestand = requireBestand(kontext);
            const sondertag = await filialeinstellungService.createSondertag(
              pfad,
              anlage,
              bestand.sondertage,
              benutzerUid,
            );
            return {
              ...bestand,
              sondertage: sortSondertage([...bestand.sondertage, sondertag]),
            };
          },
        );
      }

      /**
       * Aktualisiert einen benutzerdefinierten Sondertag im Filialkontext.
       */
      async function updateSondertag(
        pfad: IFilialPfad,
        sondertagId: string,
        aktualisierung: IFilialeinstellungSondertagAktualisierung,
      ): Promise<void> {
        const kontext = requireKontext(pfad, true);
        const benutzerUid = requireBenutzerUid();
        const sondertag = requireSondertag(kontext, sondertagId);
        await executeWrite(
          pfad,
          kontext,
          'Der Sondertag konnte nicht gespeichert werden.',
          async () => {
            const bestand = requireBestand(kontext);
            const aktualisiert = await filialeinstellungService.updateSondertag(
              pfad,
              sondertag,
              aktualisierung,
              bestand.sondertage,
              benutzerUid,
            );
            return {
              ...bestand,
              sondertage: replaceSondertag(bestand.sondertage, aktualisiert),
            };
          },
        );
      }

      /**
       * Ändert Aktivstatus und Öffnungsregel eines systemdefinierten Sondertags.
       */
      async function updateSystemSondertag(
        pfad: IFilialPfad,
        sondertagId: string,
        aktualisierung: IFilialeinstellungSystemSondertagAktualisierung,
      ): Promise<void> {
        const kontext = requireKontext(pfad, true);
        const benutzerUid = requireBenutzerUid();
        const sondertag = requireSondertag(kontext, sondertagId);
        await executeWrite(
          pfad,
          kontext,
          'Der Sondertag konnte nicht gespeichert werden.',
          async () => {
            const bestand = requireBestand(kontext);
            const aktualisiert = await filialeinstellungService.updateSystemSondertag(
              pfad,
              sondertag,
              aktualisierung,
              bestand.sondertage,
              benutzerUid,
            );
            return {
              ...bestand,
              sondertage: replaceSondertag(bestand.sondertage, aktualisiert),
            };
          },
        );
      }

      /**
       * Löscht einen benutzerdefinierten Sondertag aus dem Filialkontext.
       */
      async function deleteSondertag(pfad: IFilialPfad, sondertagId: string): Promise<void> {
        const kontext = requireKontext(pfad, true);
        requireBenutzerUid();
        const sondertag = requireSondertag(kontext, sondertagId);
        await executeWrite(
          pfad,
          kontext,
          'Der Sondertag konnte nicht gelöscht werden.',
          async () => {
            const bestand = requireBestand(kontext);
            await filialeinstellungService.deleteSondertag(pfad, sondertag);
            return {
              ...bestand,
              sondertage: bestand.sondertage.filter((eintrag) => {
                return eintrag.id !== sondertagId;
              }),
            };
          },
        );
      }

      /**
       * Legt eine datumsbezogene Ausnahme im Filialkontext an.
       */
      async function createAusnahme(
        pfad: IFilialPfad,
        anlage: IFilialeinstellungAusnahmeSchreibdaten,
      ): Promise<void> {
        const kontext = requireKontext(pfad, true);
        const benutzerUid = requireBenutzerUid();
        await executeWrite(
          pfad,
          kontext,
          'Der einmalige Sondertag konnte nicht angelegt werden.',
          async () => {
            const bestand = requireBestand(kontext);
            if (bestand.ausnahmen.some((ausnahme) => ausnahme.datum === anlage.datum)) {
              throw new FilialeinstellungFachfehler(
                'Für dieses Datum ist bereits eine Ausnahme vorhanden.',
              );
            }
            const ausnahme = await filialeinstellungService.createAusnahme(
              pfad,
              anlage,
              benutzerUid,
            );
            return { ...bestand, ausnahmen: sortAusnahmen([...bestand.ausnahmen, ausnahme]) };
          },
        );
      }

      /**
       * Aktualisiert eine datumsbezogene Ausnahme im Filialkontext.
       */
      async function updateAusnahme(
        pfad: IFilialPfad,
        datum: string,
        aktualisierung: IFilialeinstellungAusnahmeSchreibdaten,
      ): Promise<void> {
        const kontext = requireKontext(pfad, true);
        const benutzerUid = requireBenutzerUid();
        const ausnahme = requireAusnahme(kontext, datum);
        await executeWrite(
          pfad,
          kontext,
          'Der einmalige Sondertag konnte nicht gespeichert werden.',
          async () => {
            const bestand = requireBestand(kontext);
            const aktualisiert = await filialeinstellungService.updateAusnahme(
              pfad,
              ausnahme,
              aktualisierung,
              benutzerUid,
            );
            return {
              ...bestand,
              ausnahmen: bestand.ausnahmen.map((eintrag) => {
                return eintrag.id === datum ? aktualisiert : eintrag;
              }),
            };
          },
        );
      }

      /**
       * Löscht eine datumsbezogene Ausnahme aus dem Filialkontext.
       */
      async function deleteAusnahme(pfad: IFilialPfad, datum: string): Promise<void> {
        const kontext = requireKontext(pfad, true);
        requireBenutzerUid();
        requireAusnahme(kontext, datum);
        await executeWrite(
          pfad,
          kontext,
          'Der einmalige Sondertag konnte nicht gelöscht werden.',
          async () => {
            const bestand = requireBestand(kontext);
            await filialeinstellungService.deleteAusnahme(pfad, datum);
            return {
              ...bestand,
              ausnahmen: bestand.ausnahmen.filter((eintrag) => {
                return eintrag.id !== datum;
              }),
            };
          },
        );
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Liefert den geladenen Einstellungskontext einer Filiale.
       */
      function getFilialeinstellungKontext(pfad: IFilialPfad): TFilialeinstellungKontext | null {
        return store.kontexte()[getKontextSchluessel(pfad)] ?? null;
      }

      /**
       * Löst die für ein Datum wirksame Öffnungsregel des geladenen Filialkontexts auf.
       */
      function resolveOeffnungsregelFuerDatum(
        pfad: IFilialPfad,
        datum: string,
      ): IAufgeloesteOeffnungsregel {
        const bestand = requireBestand(requireKontext(pfad, true));
        return resolveOeffnungsregel({
          datum,
          wochenregeln: bestand.oeffnungszeiten.wochenregeln,
          sondertage: bestand.sondertage,
          ausnahmen: bestand.ausnahmen,
        });
      }

      /**
       * Setzt alle sitzungsbezogenen Filialeinstellungsdaten zurück.
       */
      function resetFilialeinstellungen(): void {
        generation += 1;
        filialdatenTitelAusgegeben = false;
        kontextGenerationen.clear();
        ladeauftraege.clear();
        patchState(store, initialState);
      }

      /**
       * Entfernt die Fehlermeldung eines Filialeinstellungskontexts.
       */
      function clearError(pfad: IFilialPfad): void {
        const kontext = getFilialeinstellungKontext(pfad);
        if (kontext) setKontext(pfad, { ...kontext, error: null });
      }

      /**
       * Liefert eine nicht reaktiv verfolgte Momentaufnahme des Stores.
       */
      function snapshot(): TFilialeinstellungSnapshot {
        return untracked(() => ({ kontexte: store.kontexte() }));
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
          const rohdaten = await filialeinstellungService.loadFilialeinstellungRohdaten(
            pfad,
            strategie,
          );
          if (!istAktuellerLadeauftrag(schluessel, aktuelleGeneration, kontextGeneration)) return;
          setKontext(pfad, {
            ...(getFilialeinstellungKontext(pfad) ?? createLeerenKontext(pfad)),
            rohdaten,
          });
          logFilialeinstellungRohdaten(pfad, rohdaten);
          const bestand = filialeinstellungService.validateFilialeinstellungRohdaten(
            pfad,
            rohdaten,
          );
          setKontext(pfad, {
            ...pfad,
            rohdaten,
            bestand: bestand ? sortBestand(bestand) : null,
            download: false,
            isLoaded: true,
            inProgress: false,
            error: null,
          });
        } catch (error: unknown) {
          if (istAktuellerLadeauftrag(schluessel, aktuelleGeneration, kontextGeneration)) {
            const fehlermeldung =
              error instanceof FilialeinstellungFachfehler
                ? 'Die Filialeinstellungen wurden geladen, sind aber ungültig.'
                : 'Die Filialeinstellungen konnten nicht geladen werden.';
            setKontext(pfad, {
              ...(getFilialeinstellungKontext(pfad) ?? createLeerenKontext(pfad)),
              download: false,
              isLoaded: false,
              error: createFehler(fehlermeldung, error),
            });
            if (!(error instanceof FilialeinstellungFachfehler)) {
              debugLogService.log('Laden', fehlermeldung, { ...pfad, error });
            }
          }
          throw error;
        }
      }

      async function executeWrite(
        pfad: IFilialPfad,
        kontext: TFilialeinstellungKontext,
        fehlermeldung: string,
        aktion: () => Promise<IFilialeinstellungBestand>,
      ): Promise<void> {
        if (kontext.inProgress) {
          throw new Error('Für diese Filiale läuft bereits ein Einstellungsschreibvorgang.');
        }
        const aktuelleGeneration = generation;
        setKontext(pfad, { ...kontext, inProgress: true, error: null });
        try {
          const bestand = await aktion();
          const aktuellerKontext = getFilialeinstellungKontext(pfad);
          if (aktuelleGeneration === generation && aktuellerKontext?.inProgress) {
            setKontext(pfad, {
              ...aktuellerKontext,
              bestand: sortBestand(bestand),
              inProgress: false,
            });
          }
        } catch (error: unknown) {
          const aktuellerKontext = getFilialeinstellungKontext(pfad);
          if (aktuelleGeneration === generation && aktuellerKontext?.inProgress) {
            setKontext(pfad, {
              ...aktuellerKontext,
              inProgress: false,
              error: createFehler(fehlermeldung, error),
            });
            debugLogService.log('Store', fehlermeldung, { ...pfad, error });
          }
          throw error;
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

      function logFilialeinstellungRohdaten(
        pfad: IFilialPfad,
        rohdaten: IFilialeinstellungRohdaten,
      ): void {
        const filialname =
          stammdatenStore
            .getFilialen(pfad.unternehmerId, pfad.firmaId)
            .find((filiale) => filiale.id === pfad.filialeId)?.anzeigename ?? pfad.filialeId;
        if (!filialdatenTitelAusgegeben) {
          debugLogService.logDatenflussTitel('3. FILIALDATEN ');
          filialdatenTitelAusgegeben = true;
        }
        const dokumentAnzahl =
          Number(rohdaten.allgemein !== null) + Number(rohdaten.oeffnungszeiten !== null);
        debugLogService.logDatenGeladen(`Einstellungen | ${filialname}`, dokumentAnzahl);
      }

      function setKontext(pfad: IFilialPfad, kontext: TFilialeinstellungKontext): void {
        patchState(store, {
          kontexte: { ...store.kontexte(), [getKontextSchluessel(pfad)]: kontext },
        });
      }

      function requireKontext(
        pfad: IFilialPfad,
        initialisiert: boolean,
      ): TFilialeinstellungKontext {
        const kontext = getFilialeinstellungKontext(pfad);
        if (!kontext?.isLoaded) {
          throw new Error('Die Filialeinstellungen müssen vor dem Schreiben geladen werden.');
        }
        if ((kontext.bestand !== null) !== initialisiert) {
          throw new Error(
            initialisiert
              ? 'Die Filialeinstellungen sind noch nicht initialisiert.'
              : 'Die Filialeinstellungen wurden bereits initialisiert.',
          );
        }
        return kontext;
      }

      function requireBestand(kontext: TFilialeinstellungKontext): IFilialeinstellungBestand {
        if (!kontext.bestand) throw new Error('Die Filialeinstellungen sind nicht initialisiert.');
        return kontext.bestand;
      }

      function requireSondertag(
        kontext: TFilialeinstellungKontext,
        sondertagId: string,
      ): IFilialeinstellungSondertagEintrag {
        const sondertag = requireBestand(kontext).sondertage.find((eintrag) => {
          return eintrag.id === sondertagId;
        });
        if (!sondertag) throw new Error('Der Sondertag wurde im Filialkontext nicht gefunden.');
        return sondertag;
      }

      function requireAusnahme(
        kontext: TFilialeinstellungKontext,
        datum: string,
      ): IFilialeinstellungAusnahmeEintrag {
        const ausnahme = requireBestand(kontext).ausnahmen.find((eintrag) => {
          return eintrag.id === datum;
        });
        if (!ausnahme) throw new Error('Die Datumsausnahme wurde im Filialkontext nicht gefunden.');
        return ausnahme;
      }

      function requireBenutzerUid(): string {
        const benutzerUid = benutzerStore.benutzerId();
        if (!benutzerUid) throw new Error('Für den Schreibvorgang fehlt die Benutzeridentität.');
        return benutzerUid;
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'FilialeinstellungStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadFilialeinstellung,
        initializeFilialeinstellung,
        saveGrundlagen,
        createSondertag,
        updateSondertag,
        updateSystemSondertag,
        deleteSondertag,
        createAusnahme,
        updateAusnahme,
        deleteAusnahme,
        getFilialeinstellungKontext,
        resolveOeffnungsregelFuerDatum,
        resetFilialeinstellungen,
        clearError,
        snapshot,
      };
    },
  ),
);
