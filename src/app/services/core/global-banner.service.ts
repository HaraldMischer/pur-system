// pur-system/src/app/services/core/global-banner.service.ts

import { Injectable, computed, signal } from '@angular/core';

import {
  GLOBAL_BANNER_DEFAULT_STATE,
  IGlobalBannerState,
  TGlobalBannerInput,
  TGlobalBannerSource,
} from '../../commons/models/app/global-banner.types';

@Injectable({ providedIn: 'root' })
export class GlobalBannerService {
  // ===== Interner State =======================

  private readonly _state = signal<IGlobalBannerState>({ ...GLOBAL_BANNER_DEFAULT_STATE });

  // ===== Öffentliche Werte ====================

  readonly state = this._state.asReadonly();

  // ===== Öffentliche Ableitungen ==============

  readonly active = computed(() => {
    return this._state().active;
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Zeigt einen globalen Banner und ersetzt einen gegebenenfalls vorhandenen Banner.
   *
   * @param input - Inhalt, Darstellungsart und optionale Quelle des Banners.
   */
  show(input: TGlobalBannerInput): void {
    this._state.set({
      ...input,
      active: true,
    });
  }

  /**
   * Entfernt den aktuell angezeigten globalen Banner.
   */
  clear(): void {
    this._state.set({ ...GLOBAL_BANNER_DEFAULT_STATE });
  }

  /**
   * Entfernt den globalen Banner nur, wenn er von der angegebenen Quelle stammt.
   *
   * @param source - Quelle, deren Banner entfernt werden soll.
   */
  clearIfSource(source: TGlobalBannerSource): void {
    const aktuellerBanner = this._state();
    if (aktuellerBanner.active && aktuellerBanner.source === source) {
      this.clear();
    }
  }
}
