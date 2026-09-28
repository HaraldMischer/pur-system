// pur-system/src/app/services/core/netzwerk-status.service.ts

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const WIEDER_ONLINE_ANZEIGEDAUER_MS = 5000;
const NETZWERK_PRUEFINTERVALL_MS = 30_000;
const NETZWERK_TIMEOUT_MS = 3000;

export class NetzwerkOfflineError extends Error {
  readonly code = 'app/offline';

  constructor() {
    super('Diese Aktion benötigt eine Internetverbindung.');
    this.name = 'NetzwerkOfflineError';
  }
}

@Injectable({ providedIn: 'root' })
export class NetzwerkStatusService {
  // ===== Interne Dependency Injection =========

  private readonly _destroyRef = inject(DestroyRef);
  private readonly _document = inject(DOCUMENT);
  private readonly _platformId = inject(PLATFORM_ID);

  // ===== Interner State =======================

  private readonly _window = isPlatformBrowser(this._platformId)
    ? this._document.defaultView
    : null;
  private readonly _isOnline = signal(this._window?.navigator.onLine ?? true);
  private readonly _wiederOnline = signal(false);
  private _wiederOnlineTimeout?: ReturnType<typeof setTimeout>;
  private _pruefintervall?: ReturnType<typeof setInterval>;
  private _aktivePruefung?: AbortController;
  private _laufendePruefung?: Promise<boolean>;
  private _pruefgeneration = 0;

  // ===== Öffentliche Werte ====================

  readonly isOnline = this._isOnline.asReadonly();
  readonly wiederOnline = this._wiederOnline.asReadonly();

  constructor() {
    this._window?.addEventListener('online', this.handleOnline);
    this._window?.addEventListener('offline', this.handleOffline);
    if (this._window) {
      void this.checkConnection();
      this._pruefintervall = setInterval(() => {
        void this.checkConnection();
      }, NETZWERK_PRUEFINTERVALL_MS);
    }
    this._destroyRef.onDestroy(() => {
      this._window?.removeEventListener('online', this.handleOnline);
      this._window?.removeEventListener('offline', this.handleOffline);
      this.cancelConnectionCheck();
      this.clearPruefintervall();
      this.clearWiederOnlineTimeout();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Bricht eine verbindungsabhängige Aktion bei fehlendem Netzwerk kontrolliert ab.
   *
   * @throws NetzwerkOfflineError, wenn der Browser offline ist.
   */
  assertOnline(): void {
    if (!this.isOnline()) {
      throw new NetzwerkOfflineError();
    }
  }

  /**
   * Prüft die Erreichbarkeit der aktuellen Hosting-Seite über die ungecachte Health-Datei.
   *
   * @returns `true`, wenn die Health-Datei innerhalb des Timeouts erfolgreich geladen wurde.
   */
  checkConnection(): Promise<boolean> {
    if (!this._window) {
      return Promise.resolve(true);
    }
    if (!this._window.navigator.onLine) {
      this.cancelConnectionCheck();
      this.setOnlineStatus(false);
      return Promise.resolve(false);
    }
    if (this._laufendePruefung) {
      return this._laufendePruefung;
    }

    const pruefgeneration = ++this._pruefgeneration;
    const pruefung = this.executeConnectionCheck(pruefgeneration);
    this._laufendePruefung = pruefung;
    void pruefung.finally(() => {
      if (this._laufendePruefung === pruefung) {
        this._laufendePruefung = undefined;
      }
    });
    return pruefung;
  }

  // ===== Interne Helfer =======================

  private readonly handleOnline = (): void => {
    void this.checkConnection();
  };

  private readonly handleOffline = (): void => {
    this.cancelConnectionCheck();
    this.setOnlineStatus(false);
  };

  private async executeConnectionCheck(pruefgeneration: number): Promise<boolean> {
    const controller = new AbortController();
    this._aktivePruefung = controller;
    const timeout = setTimeout(() => {
      controller.abort();
    }, NETZWERK_TIMEOUT_MS);

    try {
      const response = await this._window!.fetch(`/health.json?ts=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      const isOnline = response.ok;
      if (pruefgeneration === this._pruefgeneration) {
        this.setOnlineStatus(isOnline);
      }
      return isOnline;
    } catch {
      if (pruefgeneration === this._pruefgeneration) {
        this.setOnlineStatus(false);
      }
      return false;
    } finally {
      clearTimeout(timeout);
      if (this._aktivePruefung === controller) {
        this._aktivePruefung = undefined;
      }
    }
  }

  private setOnlineStatus(isOnline: boolean): void {
    const warOffline = !this._isOnline();
    this._isOnline.set(isOnline);

    if (!isOnline) {
      this._wiederOnline.set(false);
      this.clearWiederOnlineTimeout();
      return;
    }
    if (!warOffline) {
      return;
    }

    this._wiederOnline.set(true);
    this.clearWiederOnlineTimeout();
    this._wiederOnlineTimeout = setTimeout(() => {
      this._wiederOnline.set(false);
      this._wiederOnlineTimeout = undefined;
    }, WIEDER_ONLINE_ANZEIGEDAUER_MS);
  }

  private cancelConnectionCheck(): void {
    this._pruefgeneration += 1;
    this._aktivePruefung?.abort();
    this._aktivePruefung = undefined;
    this._laufendePruefung = undefined;
  }

  private clearPruefintervall(): void {
    if (this._pruefintervall === undefined) {
      return;
    }

    clearInterval(this._pruefintervall);
    this._pruefintervall = undefined;
  }

  private clearWiederOnlineTimeout(): void {
    if (this._wiederOnlineTimeout === undefined) {
      return;
    }

    clearTimeout(this._wiederOnlineTimeout);
    this._wiederOnlineTimeout = undefined;
  }
}
