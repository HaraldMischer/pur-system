// pur-system/src/app/services/core/theme.service.ts

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';

// ===== Top-Level Helper =====================

type TThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'pur-office-theme-mode';
const THEME_CLASS_LIGHT = 'theme-light';
const THEME_CLASS_DARK = 'theme-dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // ===== Interne Dependency Injection =========

  private readonly _document = inject(DOCUMENT);
  private readonly _platformId = inject(PLATFORM_ID);

  // ===== Interner State =======================

  private readonly _isBrowser = isPlatformBrowser(this._platformId);
  private readonly _themeMode: WritableSignal<TThemeMode> = signal(this._loadInitialThemeMode());

  // ===== Öffentliche Ableitungen ==============

  readonly themeIcon: Signal<string> = computed(() => {
    return this._themeMode() === 'dark' ? 'light_mode' : 'dark_mode';
  });

  constructor() {
    this._applyThemeMode(this._themeMode());
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Schaltet zwischen hellem und dunklem Theme um und speichert die Auswahl lokal.
   */
  toggleThemeMode(): void {
    const nextThemeMode = this._themeMode() === 'light' ? 'dark' : 'light';

    this._themeMode.set(nextThemeMode);
    this._applyThemeMode(nextThemeMode);
    this._saveThemeMode(nextThemeMode);
  }

  // ===== Interne Helfer =======================

  private _loadInitialThemeMode(): TThemeMode {
    if (!this._isBrowser) {
      return 'light';
    }

    const savedThemeMode = localStorage.getItem(THEME_STORAGE_KEY);

    return savedThemeMode === 'dark' ? 'dark' : 'light';
  }

  private _applyThemeMode(themeMode: TThemeMode): void {
    const bodyClassList = this._document.body.classList;

    bodyClassList.toggle(THEME_CLASS_LIGHT, themeMode === 'light');
    bodyClassList.toggle(THEME_CLASS_DARK, themeMode === 'dark');
  }

  private _saveThemeMode(themeMode: TThemeMode): void {
    if (!this._isBrowser) {
      return;
    }

    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }
}
