// pur-system/src/app/services/core/netzwerk-status.service.ts

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const WIEDER_ONLINE_ANZEIGEDAUER_MS = 5000;

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

  // ===== Öffentliche Werte ====================

  readonly isOnline = this._isOnline.asReadonly();
  readonly wiederOnline = this._wiederOnline.asReadonly();

  constructor() {
    this._window?.addEventListener('online', this.handleOnline);
    this._window?.addEventListener('offline', this.handleOffline);
    this._destroyRef.onDestroy(() => {
      this._window?.removeEventListener('online', this.handleOnline);
      this._window?.removeEventListener('offline', this.handleOffline);
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

  // ===== Interne Helfer =======================

  private readonly handleOnline = (): void => {
    const warOffline = !this._isOnline();

    this._isOnline.set(true);
    if (!warOffline) {
      return;
    }

    this._wiederOnline.set(true);
    this.clearWiederOnlineTimeout();
    this._wiederOnlineTimeout = setTimeout(() => {
      this._wiederOnline.set(false);
      this._wiederOnlineTimeout = undefined;
    }, WIEDER_ONLINE_ANZEIGEDAUER_MS);
  };

  private readonly handleOffline = (): void => {
    this._isOnline.set(false);
    this._wiederOnline.set(false);
    this.clearWiederOnlineTimeout();
  };

  private clearWiederOnlineTimeout(): void {
    if (this._wiederOnlineTimeout === undefined) {
      return;
    }

    clearTimeout(this._wiederOnlineTimeout);
    this._wiederOnlineTimeout = undefined;
  }
}
