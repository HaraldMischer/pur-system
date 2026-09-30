// pur-system/src/app/stores/app/benutzer.store.ts

import { DestroyRef, computed, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { environment } from '../../../environments/environment';
import { TAppBereich } from '../../commons/models/app/app-bereich';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { IBenutzerProfilDokument } from '../../commons/models/domain/benutzer';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { DebugLogService } from '../../services/core/debug-log.service';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { AuthService } from '../../services/firebase/auth.service';
import { BenutzerService } from '../../services/domain/benutzer.service';

// ===== Top-Level Helper =====================

export type TBenutzerSnapshot = {
  readonly benutzerId: string | null;
  readonly benutzerProfil: IBenutzerProfilDokument | null;
  readonly isAuthenticated: boolean;
  readonly inProgress: boolean;
  readonly error: string | null;
};

type TBenutzerState = TBenutzerSnapshot;

const initialState: TBenutzerState = {
  benutzerId: null,
  benutzerProfil: null,
  isAuthenticated: false,
  inProgress: false,
  error: null,
};

export const BenutzerStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TBenutzerState>(initialState),
  withComputed((store) => {
    const isLoggedIn = computed(() => {
      return store.benutzerProfil() !== null;
    });
    const istMaster = computed(() => {
      return store.benutzerProfil()?.userRole === 'master';
    });
    const istAktiv = computed(() => {
      return store.benutzerProfil()?.aktiv === true;
    });
    const istInaktiv = computed(() => {
      return store.benutzerProfil()?.aktiv === false;
    });
    const erlaubteBereiche = computed(() => {
      return store.benutzerProfil()?.erlaubteBereiche ?? [];
    });
    const zugriffe = computed(() => {
      return store.benutzerProfil()?.zugriffe ?? {};
    });

    return {
      isLoggedIn,
      istMaster,
      istAktiv,
      istInaktiv,
      erlaubteBereiche,
      zugriffe,
    };
  }),
  withMethods(
    (
      store,
      authService = inject(AuthService),
      benutzerService = inject(BenutzerService),
      debugLogService = inject(DebugLogService),
      destroyRef = inject(DestroyRef),
      storeSnapshotService = inject(StoreSnapshotService),
    ) => {
      let authStateInitialisiert = false;
      let profilBenutzerId: string | null = null;
      let profilGeneration = 0;
      let profilAuftrag: {
        uid: string;
        strategie: TFirestoreLesestrategie;
        promise: Promise<IBenutzerProfilDokument | null>;
      } | null = null;
      let profilBeobachtung: { uid: string; unsubscribe: () => void } | null = null;

      // ===== Methoden: Laden ======================

      /**
       * Lädt das Benutzerprofil einmalig für eine UID und teilt parallel laufende Aufträge.
       *
       * @param uid - UID des angemeldeten Firebase-Benutzers.
       * @param strategie - Datenquellenstrategie für das Benutzerprofil.
       * @param erzwingen - Erzwingt einen neuen Auftrag auch bei einem bereits bestätigten Ergebnis.
       * @returns Das geladene beziehungsweise bereits im Store vorhandene Benutzerprofil.
       * @throws Gibt Fehler des Profilladens an die aufrufende Stelle weiter.
       */
      function loadBenutzerProfil(
        uid: string,
        strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.benutzerprofil,
        erzwingen = false,
      ): Promise<IBenutzerProfilDokument | null> {
        startBenutzerProfilBeobachtung(uid);

        if (!erzwingen && profilBenutzerId === uid && !profilAuftrag) {
          return Promise.resolve(store.benutzerProfil());
        }
        if (!erzwingen && profilAuftrag?.uid === uid && profilAuftrag.strategie === strategie) {
          return profilAuftrag.promise;
        }

        const generation = ++profilGeneration;
        patchState(store, { inProgress: true, error: null });
        const promise = executeBenutzerProfilLoad(uid, strategie, generation);
        profilAuftrag = { uid, strategie, promise };
        return promise;
      }

      /**
       * Initialisiert einmalig die Beobachtung des Firebase-Anmeldestatus.
       */
      function initAuthState(): void {
        if (authStateInitialisiert) {
          return;
        }

        authStateInitialisiert = true;
        authService
          .getAuthState()
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe(async (benutzer) => {
            if (!benutzer) {
              resetBenutzerProfilCache();
              patchState(store, {
                benutzerId: null,
                benutzerProfil: null,
                isAuthenticated: false,
                inProgress: false,
                error: null,
              });
              return;
            }

            patchState(store, {
              benutzerId: benutzer.uid,
              isAuthenticated: true,
              error: null,
            });

            try {
              await loadBenutzerProfil(benutzer.uid);
            } catch {
              // Die Fehlermeldung wird durch loadBenutzerProfil im Store bereitgestellt.
            }
          });
      }

      // ===== Methoden: Sonstige Aktionen ==========

      /**
       * Meldet einen Benutzer an und lädt anschließend sein Benutzerprofil.
       *
       * @param anmeldename - Der normalisierte vollständige Anmeldename des Benutzers.
       * @param password - Das Passwort des Benutzers.
       * @throws Gibt Fehler der Anmeldung oder des Profilladens weiter.
       */
      async function login(anmeldename: string, password: string): Promise<void> {
        patchState(store, { inProgress: true, error: null });

        try {
          const credential = await authService.login(anmeldename, password);
          debugLogService.log('Authentifizierung', 'Benutzer angemeldet', {
            uid: credential.user.uid,
          });
          patchState(store, {
            benutzerId: credential.user.uid,
            isAuthenticated: true,
          });
          startBenutzerProfilBeobachtung(credential.user.uid);
          await loadBenutzerProfil(credential.user.uid);
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Meldet den aktuellen Benutzer ab und entfernt das geladene Profil.
       *
       * @throws Gibt Fehler der Abmeldung an die aufrufende Stelle weiter.
       */
      async function logout(): Promise<void> {
        patchState(store, { inProgress: true, error: null });

        try {
          await authService.logout();
          resetBenutzerProfilCache();
          patchState(store, {
            benutzerId: null,
            benutzerProfil: null,
            isAuthenticated: false,
          });
        } catch (error: unknown) {
          patchState(store, { error: getFirebaseErrorMessage(error) });
          throw error;
        } finally {
          patchState(store, { inProgress: false });
        }
      }

      /**
       * Prüft, ob der aktive Benutzer einen App-Bereich verwenden darf.
       *
       * @param bereich - Der zu prüfende App-Bereich.
       * @returns `true`, wenn das Profil aktiv ist und den Bereich enthält.
       */
      function darfBereichNutzen(bereich: TAppBereich): boolean {
        const benutzerProfil = store.benutzerProfil();

        return benutzerProfil?.aktiv === true && benutzerProfil.erlaubteBereiche.includes(bereich);
      }

      /**
       * Prüft den Lesezugriff des aktiven Benutzers auf eine Firma.
       *
       * @param unternehmerId - Die ID des übergeordneten Unternehmers.
       * @param firmaId - Die ID der zu prüfenden Firma.
       * @returns `true`, wenn das Profil aktiv ist und die Firma lesen darf.
       */
      function darfFirmaLesen(unternehmerId: string, firmaId: string): boolean {
        const benutzerProfil = store.benutzerProfil();

        return (
          benutzerProfil?.aktiv === true &&
          (benutzerProfil.userRole === 'master' ||
            (['office', 'filiale'].includes(benutzerProfil.userRole) &&
              (benutzerProfil.zugriffe[unternehmerId]?.[firmaId]?.length ?? 0) > 0))
        );
      }

      /**
       * Prüft den Lesezugriff des aktiven Benutzers auf eine Filiale.
       *
       * @param unternehmerId - Die ID des übergeordneten Unternehmers.
       * @param firmaId - Die ID der übergeordneten Firma.
       * @param filialId - Die ID der zu prüfenden Filiale.
       * @returns `true`, wenn das Profil aktiv ist und die Filiale lesen darf.
       */
      function darfFilialeLesen(unternehmerId: string, firmaId: string, filialId: string): boolean {
        const benutzerProfil = store.benutzerProfil();

        return (
          benutzerProfil?.aktiv === true &&
          (benutzerProfil.userRole === 'master' ||
            (['office', 'filiale'].includes(benutzerProfil.userRole) &&
              (benutzerProfil.zugriffe[unternehmerId]?.[firmaId] ?? []).includes(filialId)))
        );
      }

      /**
       * Setzt das aktuell verwendete Benutzerprofil.
       *
       * @param benutzerProfil - Das zu speichernde Profil oder `null`.
       */
      function setBenutzerProfil(benutzerProfil: IBenutzerProfilDokument | null): void {
        patchState(store, { benutzerProfil });
      }

      /**
       * Setzt den Zustand einer laufenden Authentifizierungsaktion.
       *
       * @param inProgress - Gibt an, ob gerade eine Aktion ausgeführt wird.
       */
      function setInProgress(inProgress: boolean): void {
        patchState(store, { inProgress });
      }

      /**
       * Setzt die aktuelle Fehlermeldung des Benutzer-Stores.
       *
       * @param error - Die Fehlermeldung oder `null`.
       */
      function setError(error: string | null): void {
        patchState(store, { error });
      }

      /**
       * Entfernt die aktuelle Fehlermeldung des Benutzer-Stores.
       */
      function clearError(): void {
        patchState(store, { error: null });
      }

      /**
       * Setzt den Benutzer-Store auf seinen Anfangszustand zurück.
       */
      function reset(): void {
        resetBenutzerProfilCache();
        patchState(store, initialState);
      }

      /**
       * Liefert eine Momentaufnahme des aktuellen Benutzer-Store-Zustands.
       *
       * @returns Vollständiger, nicht reaktiv verfolgter Store-Zustand.
       */
      function snapshot(): TBenutzerSnapshot {
        return untracked(() => ({
          benutzerId: store.benutzerId(),
          benutzerProfil: store.benutzerProfil(),
          isAuthenticated: store.isAuthenticated(),
          inProgress: store.inProgress(),
          error: store.error(),
        }));
      }

      // ===== Interne Helfer =======================

      async function executeBenutzerProfilLoad(
        uid: string,
        strategie: TFirestoreLesestrategie,
        generation: number,
      ): Promise<IBenutzerProfilDokument | null> {
        try {
          const benutzerProfil = await benutzerService.getBenutzerProfil(uid, strategie);
          const rollenTitel = benutzerProfil ? ` - ${benutzerProfil.userRole.toUpperCase()}` : '';
          debugLogService.logDatenflussTitel(`1. BENUTZERPROFIL${rollenTitel} `);
          debugLogService.logDatenGeladen('Benutzerprofil', benutzerProfil ? 1 : 0);
          if (generation === profilGeneration) {
            profilBenutzerId = uid;
            patchState(store, { benutzerProfil });
          }
          return benutzerProfil;
        } catch (error: unknown) {
          if (generation === profilGeneration) {
            patchState(store, { error: getFirebaseErrorMessage(error) });
          }
          throw error;
        } finally {
          if (generation === profilGeneration) {
            profilAuftrag = null;
            patchState(store, { inProgress: false });
          }
        }
      }

      function startBenutzerProfilBeobachtung(uid: string): void {
        if (profilBeobachtung?.uid === uid) {
          return;
        }

        const benutzerWirdGewechselt = profilBeobachtung !== null;
        stopBenutzerProfilBeobachtung();
        if (benutzerWirdGewechselt) {
          profilGeneration++;
          profilBenutzerId = null;
          profilAuftrag = null;
          patchState(store, { benutzerProfil: null, error: null });
        }
        profilBeobachtung = {
          uid,
          unsubscribe: benutzerService.observeBenutzerProfil(
            uid,
            (benutzerProfil) => {
              handleBeobachtetesBenutzerProfil(uid, benutzerProfil);
            },
            (error) => {
              if (profilBeobachtung?.uid === uid) {
                patchState(store, { error: getFirebaseErrorMessage(error) });
              }
            },
          ),
        };
      }

      function handleBeobachtetesBenutzerProfil(
        uid: string,
        benutzerProfil: IBenutzerProfilDokument | null,
      ): void {
        if (profilBeobachtung?.uid !== uid) {
          return;
        }

        profilBenutzerId = uid;
        patchState(store, { benutzerProfil, error: null });
      }

      function stopBenutzerProfilBeobachtung(): void {
        profilBeobachtung?.unsubscribe();
        profilBeobachtung = null;
      }

      function resetBenutzerProfilCache(): void {
        stopBenutzerProfilBeobachtung();
        profilGeneration++;
        profilBenutzerId = null;
        profilAuftrag = null;
      }

      const unregisterSnapshot = storeSnapshotService.registerStoreSnapshot(
        'BenutzerStore',
        snapshot,
      );
      destroyRef.onDestroy(() => {
        stopBenutzerProfilBeobachtung();
        unregisterSnapshot();
      });

      return {
        initAuthState,
        loadBenutzerProfil,
        login,
        logout,
        darfBereichNutzen,
        darfFirmaLesen,
        darfFilialeLesen,
        setBenutzerProfil,
        setInProgress,
        setError,
        clearError,
        reset,
        snapshot,
      };
    },
  ),
);
