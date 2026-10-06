// pur-system/src/app/stores/domain/benutzer-verwaltung.store.ts

import { DestroyRef, computed, inject, untracked } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  IBenutzerAnlage,
  IBenutzerAnlageErgebnis,
  IBenutzerMitarbeiterZuordnung,
  IBenutzerProfilAktualisierung,
  IBenutzerProfilEintrag,
  TBenutzerZugriffe,
} from '../../commons/models/domain/benutzer';
import {
  IDatenzugriffEintrag,
  IUnternehmerAuswahl,
} from '../../commons/models/domain/datenzugriff';
import { IMitarbeiterAuswahl } from '../../commons/models/domain/mitarbeiter';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { BenutzerService } from '../../services/domain/benutzer.service';
import { DatenzugriffService } from '../../services/domain/datenzugriff.service';
import { AuthService } from '../../services/firebase/auth.service';
import { BenutzerVerwaltungService } from '../../services/firebase/benutzer-verwaltung.service';
import { BenutzerStore } from '../app/benutzer.store';
import { StammdatenStore } from '../app/stammdaten.store';

// ===== Top-Level Helper =====================

type TDatenzugriffListe = {
  daten: readonly IDatenzugriffEintrag[];
  isLoaded: boolean;
  download: boolean;
  error: string | null;
};
const leer: TDatenzugriffListe = { daten: [], isLoaded: false, download: false, error: null };
const unternehmerKey = JSON.stringify(['unternehmer']);
const firmenKey = (id: string) => {
  return JSON.stringify(['unternehmer', id, 'firma']);
};
const filialenKey = (uid: string, fid: string) => {
  return JSON.stringify(['unternehmer', uid, 'firma', fid, 'filiale']);
};
const firmaKey = (uid: string, fid: string) => {
  return JSON.stringify([uid, fid]);
};

export type TBenutzerVerwaltungSnapshot = {
  readonly listen: Record<string, TDatenzugriffListe>;
  readonly unternehmerIds: readonly string[];
  readonly firmaIds: readonly string[];
  readonly filialen: Readonly<Partial<Record<string, readonly string[]>>>;
  readonly mitarbeiterAuswahl: readonly IMitarbeiterAuswahl[];
  readonly mitarbeiterAuswahlKontext: string | null;
  readonly mitarbeiterAuswahlDownload: boolean;
  readonly mitarbeiterAuswahlIsLoaded: boolean;
  readonly mitarbeiterAuswahlError: string | null;
  readonly selectedMitarbeiterId: string | null;
  readonly inProgress: boolean;
  readonly error: string | null;
  readonly createdBenutzer: IBenutzerAnlageErgebnis | null;
  readonly selectedBenutzerUid: string | null;
  readonly updateError: string | null;
  readonly updateSuccess: string | null;
};

type TBenutzerVerwaltungState = TBenutzerVerwaltungSnapshot;

const initialState: TBenutzerVerwaltungState = {
  listen: {},
  unternehmerIds: [],
  firmaIds: [],
  filialen: {},
  mitarbeiterAuswahl: [],
  mitarbeiterAuswahlKontext: null,
  mitarbeiterAuswahlDownload: false,
  mitarbeiterAuswahlIsLoaded: false,
  mitarbeiterAuswahlError: null,
  selectedMitarbeiterId: null,
  inProgress: false,
  error: null,
  createdBenutzer: null,
  selectedBenutzerUid: null,
  updateError: null,
  updateSuccess: null,
};

export const BenutzerVerwaltungStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TBenutzerVerwaltungState>(initialState),
  withComputed((store) => {
    const stammdatenStore = inject(StammdatenStore);
    const unternehmer = computed<readonly IUnternehmerAuswahl[]>(() => {
      return (store.listen()[unternehmerKey]?.daten ?? []).map((unternehmer) => ({
        ...unternehmer,
        firmen: (store.listen()[firmenKey(unternehmer.id)]?.daten ?? []).map((firma) => ({
          ...firma,
          filialen: store.listen()[filialenKey(unternehmer.id, firma.id)]?.daten ?? [],
        })),
      }));
    });
    const ausgewaehlteFirmen = computed(() => {
      return unternehmer()
        .filter((u) => store.unternehmerIds().includes(u.id))
        .flatMap((u) =>
          u.firmen.map((f) => ({ ...f, unternehmerId: u.id, schluessel: firmaKey(u.id, f.id) })),
        )
        .filter((f) => store.firmaIds().includes(f.schluessel));
    });
    const firmenDownload = computed(() => {
      return store.unternehmerIds().some((id) => store.listen()[firmenKey(id)]?.download);
    });
    const filialenDownload = computed(() => {
      return ausgewaehlteFirmen().some(
        (f) => store.listen()[filialenKey(f.unternehmerId, f.id)]?.download,
      );
    });
    const datenStatus = computed(() => {
      return [
        { key: unternehmerKey, name: 'Unternehmer' },
        ...unternehmer()
          .filter((u) => store.unternehmerIds().includes(u.id))
          .map((u) => ({ key: firmenKey(u.id), name: `Firmen von ${u.anzeigename}` })),
        ...ausgewaehlteFirmen().map((f) => ({
          key: filialenKey(f.unternehmerId, f.id),
          name: `Filialen von ${f.anzeigename}`,
        })),
      ].map((eintrag) => ({ ...eintrag, ...(store.listen()[eintrag.key] ?? leer) }));
    });
    const zugriffe = computed<TBenutzerZugriffe>(() => {
      const zugriffe = new Map<string, Map<string, string[]>>();
      for (const firma of ausgewaehlteFirmen()) {
        const firmen = zugriffe.get(firma.unternehmerId) ?? new Map<string, string[]>();
        firmen.set(firma.id, [...(store.filialen()[firma.schluessel] ?? [])]);
        zugriffe.set(firma.unternehmerId, firmen);
      }
      return Object.fromEntries(
        [...zugriffe].map(([unternehmerId, firmen]) => [unternehmerId, Object.fromEntries(firmen)]),
      );
    });
    const datenAuswahlGueltig = computed(() => {
      if (datenStatus().some((status) => status.download || status.error)) return false;
      return (
        store
          .unternehmerIds()
          .every((id) => ausgewaehlteFirmen().some((firma) => firma.unternehmerId === id)) &&
        ausgewaehlteFirmen().every((firma) => {
          const ids = store.filialen()[firma.schluessel] ?? [];
          return (
            ids.length > 0 && ids.every((id) => firma.filialen.some((filiale) => filiale.id === id))
          );
        })
      );
    });
    const mitarbeiterFirma = computed(() => {
      const firmen = ausgewaehlteFirmen();
      return store.unternehmerIds().length === 1 && firmen.length === 1 ? firmen[0] : null;
    });
    const selectedMitarbeiter = computed(() => {
      return (
        store
          .mitarbeiterAuswahl()
          .find((mitarbeiter) => mitarbeiter.id === store.selectedMitarbeiterId()) ?? null
      );
    });
    const benutzerprofile = computed(() => {
      return stammdatenStore.benutzerprofile();
    });
    const benutzerprofileDownload = computed(() => {
      return stammdatenStore.download();
    });
    const benutzerprofileIsLoaded = computed(() => {
      return stammdatenStore.isLoaded();
    });
    const benutzerprofileError = computed(() => {
      return stammdatenStore.error();
    });
    const selectedBenutzer = computed(() => {
      return benutzerprofile().find((profil) => profil.uid === store.selectedBenutzerUid()) ?? null;
    });

    return {
      unternehmer,
      ausgewaehlteFirmen,
      firmenDownload,
      filialenDownload,
      datenStatus,
      zugriffe,
      datenAuswahlGueltig,
      mitarbeiterFirma,
      selectedMitarbeiter,
      benutzerprofile,
      benutzerprofileDownload,
      benutzerprofileIsLoaded,
      benutzerprofileError,
      selectedBenutzer,
    };
  }),
  withMethods(
    (
      store,
      stammdatenStore = inject(StammdatenStore),
      datenService = inject(DatenzugriffService),
      service = inject(BenutzerVerwaltungService),
      benutzerService = inject(BenutzerService),
      authService = inject(AuthService),
      benutzerStore = inject(BenutzerStore),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let generation = 0;
      let mitarbeiterGeneration = 0;
      const laufend = new Map<string, Promise<void>>();

      // ===== Methoden: Laden ======================

      /**
       * Lädt eine Zugriffsliste einmalig und verwirft Ergebnisse einer veralteten Store-Generation.
       *
       * @param key - Der eindeutige Schlüssel der zu ladenden Liste.
       * @param load - Die Ladefunktion für die angeforderte Liste.
       * @returns Ein Promise, das nach Abschluss des Ladevorgangs beendet ist.
       */
      async function loadListe(
        key: string,
        load: () => Promise<readonly IDatenzugriffEintrag[]>,
      ): Promise<void> {
        if (store.listen()[key]?.isLoaded) return;
        if (laufend.has(key)) return laufend.get(key);
        const aktuell = generation;
        patchState(store, { listen: { ...store.listen(), [key]: { ...leer, download: true } } });
        const auftrag = (async () => {
          try {
            const daten = await Promise.resolve().then(load);
            if (aktuell === generation)
              patchState(store, {
                listen: {
                  ...store.listen(),
                  [key]: { daten, isLoaded: true, download: false, error: null },
                },
              });
          } catch (error: unknown) {
            if (aktuell === generation)
              patchState(store, {
                listen: {
                  ...store.listen(),
                  [key]: { ...leer, error: getFirebaseErrorMessage(error) },
                },
              });
          } finally {
            if (aktuell === generation) laufend.delete(key);
          }
        })();
        laufend.set(key, auftrag);
        return auftrag;
      }

      /**
       * Lädt die Unternehmer sowie alle von der aktuellen Auswahl abhängigen Firmen und Filialen.
       *
       * @returns Ein Promise, das nach Abschluss aller erforderlichen Ladevorgänge beendet ist.
       */
      async function loadAuswahl(): Promise<void> {
        const aktuell = generation;
        await loadListe(unternehmerKey, () => {
          return stammdatenStore.isLoaded()
            ? Promise.resolve(
                stammdatenStore.unternehmer().map((eintrag) => ({
                  id: eintrag.id,
                  anzeigename: eintrag.anzeigename,
                })),
              )
            : datenService.loadUnternehmer();
        });
        if (aktuell !== generation) return;
        await Promise.all(
          store.unternehmerIds().map((id) =>
            loadListe(firmenKey(id), () => {
              return stammdatenStore.isLoaded()
                ? Promise.resolve(
                    stammdatenStore.getFirmen(id).map((eintrag) => ({
                      id: eintrag.id,
                      anzeigename: eintrag.anzeigename,
                    })),
                  )
                : datenService.loadFirmen(id);
            }),
          ),
        );
        if (aktuell !== generation) return;
        await Promise.all(
          store.ausgewaehlteFirmen().map((f) =>
            loadListe(filialenKey(f.unternehmerId, f.id), () => {
              return stammdatenStore.isLoaded()
                ? Promise.resolve(
                    stammdatenStore.getFilialen(f.unternehmerId, f.id).map((eintrag) => ({
                      id: eintrag.id,
                      anzeigename: eintrag.anzeigename,
                    })),
                  )
                : datenService.loadFilialen(f.unternehmerId, f.id);
            }),
          ),
        );
      }

      /**
       * Lädt die reduzierte Mitarbeiterauswahl für die eindeutig ausgewählte Firma.
       */
      async function loadMitarbeiterAuswahl(): Promise<void> {
        const firma = store.mitarbeiterFirma();
        if (!firma) {
          resetMitarbeiterAuswahl();
          return;
        }

        const kontext = firma.schluessel;
        if (
          store.mitarbeiterAuswahlKontext() === kontext &&
          (store.mitarbeiterAuswahlIsLoaded() || store.mitarbeiterAuswahlDownload())
        ) {
          return;
        }

        const aktuell = ++mitarbeiterGeneration;
        patchState(store, {
          mitarbeiterAuswahl: [],
          mitarbeiterAuswahlKontext: kontext,
          mitarbeiterAuswahlDownload: true,
          mitarbeiterAuswahlIsLoaded: false,
          mitarbeiterAuswahlError: null,
          selectedMitarbeiterId: null,
        });

        try {
          const mitarbeiterAuswahl = await service.loadMitarbeiterAuswahl({
            unternehmerId: firma.unternehmerId,
            firmaId: firma.id,
          });
          if (aktuell === mitarbeiterGeneration && store.mitarbeiterAuswahlKontext() === kontext) {
            patchState(store, {
              mitarbeiterAuswahl,
              mitarbeiterAuswahlDownload: false,
              mitarbeiterAuswahlIsLoaded: true,
              mitarbeiterAuswahlError: null,
            });
          }
        } catch (error: unknown) {
          if (aktuell === mitarbeiterGeneration && store.mitarbeiterAuswahlKontext() === kontext) {
            patchState(store, {
              mitarbeiterAuswahl: [],
              mitarbeiterAuswahlDownload: false,
              mitarbeiterAuswahlIsLoaded: false,
              mitarbeiterAuswahlError: getFirebaseErrorMessage(error),
              selectedMitarbeiterId: null,
            });
          }
        }
      }

      // ===== Methoden: Schreiben ==================

      /**
       * Legt einen Benutzer an und speichert das Ergebnis für die Rückmeldung im Store.
       *
       * @param anlage - Die vollständigen Daten des neu anzulegenden Benutzers.
       * @returns Das Anlageergebnis mit UID, Anmeldename und technischer E-Mail-Adresse.
       * @throws Gibt Fehler der Benutzeranlage an die aufrufende Stelle weiter.
       */
      async function createBenutzer(anlage: IBenutzerAnlage): Promise<IBenutzerAnlageErgebnis> {
        patchState(store, {
          inProgress: true,
          error: null,
          createdBenutzer: null,
          updateError: null,
          updateSuccess: null,
        });

        try {
          const createdBenutzer = await service.createBenutzer(anlage);
          stammdatenStore.upsertBenutzerprofil({
            uid: createdBenutzer.uid,
            anmeldename: createdBenutzer.anmeldename,
            email: createdBenutzer.email,
            anzeigename: anlage.anzeigename,
            userRole: anlage.userRole,
            erlaubteBereiche: anlage.erlaubteBereiche,
            zugriffe: anlage.zugriffe,
            ...(anlage.firmaMitarbeiterId ? { firmaMitarbeiterId: anlage.firmaMitarbeiterId } : {}),
            aktiv: true,
          });
          patchState(store, { createdBenutzer });
          return createdBenutzer;
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Aktualisiert das ausgewählte Benutzerprofil und übernimmt das Ergebnis in die Stores.
       *
       * @param aktualisierung - Die bearbeitbaren Profilfelder.
       * @returns Der aktualisierte Profileintrag.
       * @throws Gibt Validierungs- und Firestore-Fehler an die aufrufende Stelle weiter.
       */
      async function updateBenutzerProfil(
        aktualisierung: IBenutzerProfilAktualisierung,
      ): Promise<IBenutzerProfilEintrag> {
        const profil = store.selectedBenutzer();
        if (!profil) {
          throw new Error('Kein Benutzerprofil ausgewählt.');
        }

        const istEigenesProfil = profil.uid === authService.getAktuelleBenutzerId();
        if (istEigenesProfil && !aktualisierung.aktiv) {
          patchState(store, {
            updateError: 'Das eigene Masterprofil darf nicht deaktiviert werden.',
          });
          throw new Error('Ungültige Änderung am eigenen Masterprofil.');
        }

        patchState(store, {
          inProgress: true,
          error: null,
          createdBenutzer: null,
          updateError: null,
          updateSuccess: null,
        });
        try {
          const gespeicherteAktualisierung = await benutzerService.updateBenutzerProfil(
            profil.uid,
            profil.userRole,
            aktualisierung,
          );
          const aktualisiertesProfil: IBenutzerProfilEintrag = {
            ...profil,
            ...gespeicherteAktualisierung,
          };
          stammdatenStore.upsertBenutzerprofil(aktualisiertesProfil);
          if (istEigenesProfil) {
            const { uid: _uid, ...eigenesProfil } = aktualisiertesProfil;
            benutzerStore.setBenutzerProfil(eigenesProfil);
          }
          patchState(store, {
            updateSuccess: `Benutzer ${aktualisiertesProfil.email} wurde aktualisiert.`,
          });
          return aktualisiertesProfil;
        } catch (error: unknown) {
          patchState(store, { updateError: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Ordnet das ausgewählte Mitarbeiterkonto einem anderen fachlichen Mitarbeiter zu.
       *
       * @param zuordnung - Neuer Unternehmer-, Firmen- und Mitarbeiterkontext.
       * @returns Das lokal aktualisierte Benutzerprofil.
       * @throws Gibt Validierungs- und Callable-Fehler an die aufrufende Stelle weiter.
       */
      async function updateMitarbeiterZuordnung(
        zuordnung: IBenutzerMitarbeiterZuordnung,
      ): Promise<IBenutzerProfilEintrag> {
        const profil = store.selectedBenutzer();
        if (!profil || profil.userRole !== 'mitarbeiter') {
          throw new Error('Kein Mitarbeiterkonto ausgewählt.');
        }

        patchState(store, {
          inProgress: true,
          error: null,
          createdBenutzer: null,
          updateError: null,
          updateSuccess: null,
        });
        try {
          await service.updateMitarbeiterZuordnung(profil.uid, zuordnung);
          const aktualisiertesProfil: IBenutzerProfilEintrag = {
            ...profil,
            zugriffe: { [zuordnung.unternehmerId]: { [zuordnung.firmaId]: [] } },
            firmaMitarbeiterId: zuordnung.firmaMitarbeiterId,
          };
          stammdatenStore.upsertBenutzerprofil(aktualisiertesProfil);
          patchState(store, {
            updateSuccess: `Benutzer ${aktualisiertesProfil.email} wurde neu zugeordnet.`,
          });
          return aktualisiertesProfil;
        } catch (error: unknown) {
          patchState(store, { updateError: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Löscht das ausgewählte Mitarbeiterkonto und entfernt es aus dem lokalen Profilbestand.
       *
       * @throws Gibt Validierungs- und Callable-Fehler an die aufrufende Stelle weiter.
       */
      async function deleteBenutzer(): Promise<void> {
        const profil = store.selectedBenutzer();
        if (!profil || profil.userRole !== 'mitarbeiter') {
          throw new Error('Kein Mitarbeiterkonto ausgewählt.');
        }

        patchState(store, {
          inProgress: true,
          error: null,
          createdBenutzer: null,
          updateError: null,
          updateSuccess: null,
        });
        try {
          await service.deleteBenutzer(profil.uid);
          stammdatenStore.removeBenutzerprofil(profil.uid);
          patchState(store, {
            selectedBenutzerUid: null,
            updateSuccess: `Benutzer ${profil.email} wurde gelöscht.`,
          });
        } catch (error: unknown) {
          patchState(store, { updateError: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Übernimmt gültige Filialauswahlen für die aktuell ausgewählten Firmen.
       *
       * @param auswahl - Die Filial-IDs, gruppiert nach dem Schlüssel ihrer Firma.
       */
      function selectFilialen(auswahl: Readonly<Partial<Record<string, readonly string[]>>>): void {
        const filialen: Record<string, readonly string[]> = {};
        for (const firma of store.ausgewaehlteFirmen()) {
          const ids = [...new Set(auswahl[firma.schluessel] ?? [])].filter((id) =>
            firma.filialen.some((f) => f.id === id),
          );
          if (ids.length) filialen[firma.schluessel] = ids;
        }
        patchState(store, { filialen });
      }

      /**
       * Übernimmt gültige Firmenauswahlen und lädt die davon abhängigen Filialen.
       *
       * @param ids - Die Schlüssel der ausgewählten Firmen.
       * @param filialenLaden - Legt fest, ob die Filiallisten der gewählten Firmen geladen werden.
       */
      function selectFirmen(ids: readonly string[], filialenLaden = true): void {
        const verfuegbar = store
          .unternehmer()
          .filter((u) => store.unternehmerIds().includes(u.id))
          .flatMap((u) => u.firmen.map((f) => firmaKey(u.id, f.id)));
        const firmaIds = [...new Set(ids)].filter((id) => verfuegbar.includes(id));
        if (JSON.stringify(firmaIds) !== JSON.stringify(store.firmaIds())) {
          resetMitarbeiterAuswahl();
        }
        patchState(store, { firmaIds });
        selectFilialen(store.filialen());
        if (filialenLaden) {
          void loadAuswahl();
        }
      }

      /**
       * Übernimmt gültige Unternehmerauswahlen und aktualisiert die abhängigen Firmen.
       *
       * @param ids - Die IDs der ausgewählten Unternehmer.
       */
      function selectUnternehmer(ids: readonly string[]): void {
        const unternehmerIds = [...new Set(ids)].filter((id) =>
          store.unternehmer().some((u) => u.id === id),
        );
        if (JSON.stringify(unternehmerIds) !== JSON.stringify(store.unternehmerIds())) {
          resetMitarbeiterAuswahl();
        }
        patchState(store, {
          unternehmerIds,
        });
        selectFirmen(store.firmaIds());
      }

      /**
       * Wählt einen Eintrag aus der aktuell geladenen Mitarbeiterauswahl aus.
       *
       * @param mitarbeiterId - Mitarbeiter-ID oder `null`, um die Auswahl aufzuheben.
       */
      function selectMitarbeiter(mitarbeiterId: string | null): void {
        patchState(store, {
          selectedMitarbeiterId: store
            .mitarbeiterAuswahl()
            .some((mitarbeiter) => mitarbeiter.id === mitarbeiterId)
            ? mitarbeiterId
            : null,
        });
      }

      /**
       * Wählt ein vorhandenes Benutzerprofil für die Bearbeitung aus.
       *
       * @param uid - UID des Benutzerprofils oder `null`, um die Auswahl aufzuheben.
       */
      function selectBenutzer(uid: string | null): void {
        patchState(store, {
          selectedBenutzerUid: store.benutzerprofile().some((profil) => profil.uid === uid)
            ? uid
            : null,
          updateError: null,
          updateSuccess: null,
        });
      }

      /**
       * Setzt alle geladenen Listen und ausgewählten Datenzugriffe zurück.
       */
      function resetDatenzugriff(): void {
        generation++;
        laufend.clear();
        resetMitarbeiterAuswahl();
        patchState(store, { listen: {}, unternehmerIds: [], firmaIds: [], filialen: {} });
      }

      /**
       * Verwirft die geladene und ausgewählte Mitarbeiterauswahl.
       */
      function resetMitarbeiterAuswahl(): void {
        mitarbeiterGeneration++;
        patchState(store, {
          mitarbeiterAuswahl: [],
          mitarbeiterAuswahlKontext: null,
          mitarbeiterAuswahlDownload: false,
          mitarbeiterAuswahlIsLoaded: false,
          mitarbeiterAuswahlError: null,
          selectedMitarbeiterId: null,
        });
      }

      /**
       * Entfernt vorhandene Erfolgs- und Fehlerrückmeldungen.
       */
      function clearFeedback(): void {
        patchState(store, {
          error: null,
          createdBenutzer: null,
          updateError: null,
          updateSuccess: null,
        });
      }

      /**
       * Setzt den vollständigen Benutzer-Verwaltungs-Store auf seinen Anfangszustand zurück.
       */
      function reset(): void {
        resetDatenzugriff();
        patchState(store, initialState);
      }

      /**
       * Liefert eine Momentaufnahme des aktuellen Benutzer-Verwaltungs-Store-Zustands.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TBenutzerVerwaltungSnapshot {
        return untracked(() => ({
          listen: store.listen(),
          unternehmerIds: store.unternehmerIds(),
          firmaIds: store.firmaIds(),
          filialen: store.filialen(),
          mitarbeiterAuswahl: store.mitarbeiterAuswahl(),
          mitarbeiterAuswahlKontext: store.mitarbeiterAuswahlKontext(),
          mitarbeiterAuswahlDownload: store.mitarbeiterAuswahlDownload(),
          mitarbeiterAuswahlIsLoaded: store.mitarbeiterAuswahlIsLoaded(),
          mitarbeiterAuswahlError: store.mitarbeiterAuswahlError(),
          selectedMitarbeiterId: store.selectedMitarbeiterId(),
          inProgress: store.inProgress(),
          error: store.error(),
          createdBenutzer: store.createdBenutzer(),
          selectedBenutzerUid: store.selectedBenutzerUid(),
          updateError: store.updateError(),
          updateSuccess: store.updateSuccess(),
        }));
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'BenutzerVerwaltungStore',
        snapshot,
      );
      destroyRef.onDestroy(unregisterSnapshot);

      return {
        loadAuswahl,
        loadMitarbeiterAuswahl,
        createBenutzer,
        updateBenutzerProfil,
        updateMitarbeiterZuordnung,
        deleteBenutzer,
        selectFilialen,
        selectFirmen,
        selectUnternehmer,
        selectMitarbeiter,
        selectBenutzer,
        resetDatenzugriff,
        resetMitarbeiterAuswahl,
        clearFeedback,
        reset,
        snapshot,
      };
    },
  ),
);
