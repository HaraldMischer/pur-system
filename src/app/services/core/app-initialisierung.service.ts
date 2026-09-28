// pur-system/src/app/services/core/app-initialisierung.service.ts

import { Injectable, effect, inject, signal, untracked } from '@angular/core';

import { TAppInitialisierungsstatus } from '../../commons/models/app/app-initialisierung.types';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { IBenutzerProfilDokument } from '../../commons/models/domain/benutzer';
import { getFirebaseErrorMessage } from '../../commons/utils/errors/firebase-error-message';
import { AppKontextStore } from '../../stores/app/app-kontext.store';
import { BenutzerStore } from '../../stores/app/benutzer.store';
import { StammdatenLadeservice } from './stammdaten-ladeservice';

const PROFIL_FEHLT_FEHLER = 'Für den angemeldeten Benutzer wurde kein Benutzerprofil gefunden.';

@Injectable({ providedIn: 'root' })
export class AppInitialisierungService {
  // ===== Interne Dependency Injection =========

  private readonly _benutzerStore = inject(BenutzerStore);
  private readonly _appKontextStore = inject(AppKontextStore);
  private readonly _stammdatenLadeservice = inject(StammdatenLadeservice);

  // ===== Interner State =======================

  private readonly _gestartet = signal(false);
  private readonly _status = signal<TAppInitialisierungsstatus>('idle');
  private readonly _error = signal<string | null>(null);
  private _generation = 0;
  private _abgeschlossenerKontext: string | null = null;
  private _laufenderAuftrag: { kontext: string; promise: Promise<void> } | null = null;

  // ===== Öffentliche Werte ====================

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    effect(() => {
      const gestartet = this._gestartet();
      const benutzerId = this._benutzerStore.benutzerId();
      const isAuthenticated = this._benutzerStore.isAuthenticated();
      const profil = this._benutzerStore.benutzerProfil();
      const profilDownload = this._benutzerStore.inProgress();
      const profilError = this._benutzerStore.error();

      untracked(() => {
        this.handleSitzungszustand(
          gestartet,
          benutzerId,
          isAuthenticated,
          profil,
          profilDownload,
          profilError,
        );
      });
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Startet einmalig die zentrale Initialisierung der Benutzersitzung.
   */
  init(): void {
    if (this._gestartet()) {
      return;
    }

    this._gestartet.set(true);
    this._benutzerStore.initAuthState();
  }

  /**
   * Wiederholt eine fehlgeschlagene Profil- oder Stammdateninitialisierung.
   *
   * @returns Ein Promise, das nach Abschluss des Wiederholungsversuchs beendet ist.
   */
  async retry(): Promise<void> {
    const benutzerId = this._benutzerStore.benutzerId();

    if (!this._benutzerStore.isAuthenticated() || !benutzerId) {
      this.resetSitzung();
      return;
    }

    let profil = this._benutzerStore.benutzerProfil();
    if (!profil) {
      this._status.set('loading');
      this._error.set(null);
      try {
        await this._benutzerStore.loadBenutzerProfil(benutzerId, 'networkOnly', true);
      } catch (error: unknown) {
        this.setError(this._benutzerStore.error() ?? getFirebaseErrorMessage(error));
        return;
      }

      if (
        !this._benutzerStore.isAuthenticated() ||
        this._benutzerStore.benutzerId() !== benutzerId
      ) {
        this.resetSitzung();
        return;
      }
      profil = this._benutzerStore.benutzerProfil();
    }

    if (!profil) {
      this.setError(PROFIL_FEHLT_FEHLER);
      return;
    }
    if (!profil.aktiv) {
      this.resetSitzung();
      return;
    }

    await this.loadStammdaten(benutzerId, profil, true, 'networkOnly');
  }

  // ===== Interne Helfer =======================

  private handleSitzungszustand(
    gestartet: boolean,
    benutzerId: string | null,
    isAuthenticated: boolean,
    profil: IBenutzerProfilDokument | null,
    profilDownload: boolean,
    profilError: string | null,
  ): void {
    if (!gestartet) {
      return;
    }
    if (!isAuthenticated || !benutzerId) {
      this.resetSitzung();
      return;
    }
    if (profilDownload) {
      this.resetSitzungsdaten();
      this._status.set('loading');
      this._error.set(null);
      return;
    }
    if (!profil) {
      this.resetSitzungsdaten();
      this.setError(profilError ?? PROFIL_FEHLT_FEHLER);
      return;
    }
    if (!profil.aktiv) {
      this.resetSitzung();
      return;
    }

    void this.loadStammdaten(benutzerId, profil);
  }

  private loadStammdaten(
    benutzerId: string,
    profil: IBenutzerProfilDokument,
    wiederholen = false,
    strategie?: TFirestoreLesestrategie,
  ): Promise<void> {
    const kontext = this.getKontext(benutzerId, profil);
    if (!wiederholen && this._laufenderAuftrag?.kontext === kontext) {
      return this._laufenderAuftrag.promise;
    }
    if (!wiederholen && this._abgeschlossenerKontext === kontext) {
      this._status.set('ready');
      this._error.set(null);
      return Promise.resolve();
    }

    this.resetSitzungsdaten();
    const generation = this._generation;
    this._status.set('loading');
    this._error.set(null);
    const promise = this.executeStammdatenLoad(benutzerId, profil, kontext, generation, strategie);
    this._laufenderAuftrag = { kontext, promise };
    return promise;
  }

  private async executeStammdatenLoad(
    benutzerId: string,
    profil: IBenutzerProfilDokument,
    kontext: string,
    generation: number,
    strategie?: TFirestoreLesestrategie,
  ): Promise<void> {
    try {
      if (strategie) {
        await this._stammdatenLadeservice.loadStammdaten(benutzerId, profil, strategie);
      } else {
        await this._stammdatenLadeservice.loadStammdaten(benutzerId, profil);
      }
      if (generation !== this._generation) {
        return;
      }

      this._appKontextStore.initialize();
      this._abgeschlossenerKontext = kontext;
      this._status.set('ready');
      this._error.set(null);
    } catch (error: unknown) {
      if (generation === this._generation) {
        this.setError(getFirebaseErrorMessage(error));
      }
    } finally {
      if (generation === this._generation && this._laufenderAuftrag?.kontext === kontext) {
        this._laufenderAuftrag = null;
      }
    }
  }

  private resetSitzung(): void {
    this.resetSitzungsdaten();
    this._status.set('idle');
    this._error.set(null);
  }

  private resetSitzungsdaten(): void {
    this._generation++;
    this._abgeschlossenerKontext = null;
    this._laufenderAuftrag = null;
    this._appKontextStore.reset();
    this._stammdatenLadeservice.reset();
  }

  private setError(error: string): void {
    this._status.set('error');
    this._error.set(error);
  }

  private getKontext(benutzerId: string, profil: IBenutzerProfilDokument): string {
    const zugriffe = Object.entries(profil.zugriffe)
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
      benutzerId,
      profil.userRole,
      profil.firmaMitarbeiterId ?? null,
      zugriffe,
    ]);
  }
}
