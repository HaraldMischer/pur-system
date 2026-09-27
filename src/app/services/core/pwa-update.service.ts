// pur-system/src/app/services/core/pwa-update.service.ts

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionEvent } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  // ===== Interne Dependency Injection =========

  private readonly _destroyRef = inject(DestroyRef);
  private readonly _document = inject(DOCUMENT);
  private readonly _swUpdate = inject(SwUpdate, { optional: true });

  // ===== Interner State =======================

  private readonly _updateVerfuegbar = signal(false);
  private readonly _updateFehler = signal<string | null>(null);
  private readonly _neuladenErforderlich = signal(false);

  // ===== Öffentliche Werte ====================

  readonly updateVerfuegbar = this._updateVerfuegbar.asReadonly();
  readonly updateFehler = this._updateFehler.asReadonly();
  readonly neuladenErforderlich = this._neuladenErforderlich.asReadonly();

  constructor() {
    const swUpdate = this._swUpdate;
    if (!swUpdate?.isEnabled) {
      return;
    }

    swUpdate.versionUpdates.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((event) => {
      this.handleVersionEvent(event);
    });
    swUpdate.unrecoverable.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
      this.handleUnrecoverableState();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt die Anwendung nach einer bewussten Benutzeraktion vollständig neu.
   */
  reloadApp(): void {
    if (!this.updateVerfuegbar() && !this.neuladenErforderlich()) {
      return;
    }

    this._document.defaultView?.location.reload();
  }

  // ===== Interne Helfer =======================

  private handleVersionEvent(event: VersionEvent): void {
    if (event.type === 'VERSION_READY') {
      this._updateVerfuegbar.set(true);
      this._updateFehler.set(null);
      return;
    }

    if (event.type === 'VERSION_INSTALLATION_FAILED') {
      this._updateFehler.set(
        'Eine neue Version konnte nicht geladen werden. Bitte versuche es später erneut.',
      );
    }
  }

  private handleUnrecoverableState(): void {
    this._updateVerfuegbar.set(false);
    this._neuladenErforderlich.set(true);
    this._updateFehler.set(
      'Die gespeicherte App-Version kann nicht weiterverwendet werden. Bitte lade die App neu.',
    );
  }
}
