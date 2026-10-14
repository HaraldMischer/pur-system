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
export type TThemeFarbschema = 'azure-blue' | 'cyan-orange' | 'magenta-violet' | 'rose-red';

const THEME_STORAGE_KEY = 'pur-office-theme-mode';
const THEME_FARBSCHEMA_STORAGE_KEY = 'pur-office-theme-farbschema';
const THEME_CLASS_LIGHT = 'theme-light';
const THEME_CLASS_DARK = 'theme-dark';
const THEME_FARBSCHEMA_KLASSEN: Record<TThemeFarbschema, string> = {
  'azure-blue': 'pur-theme-color-azure-blue',
  'cyan-orange': 'pur-theme-color-cyan-orange',
  'magenta-violet': 'pur-theme-color-magenta-violet',
  'rose-red': 'pur-theme-color-rose-red',
};

function isThemeFarbschema(value: string | null): value is TThemeFarbschema {
  return value !== null && Object.prototype.hasOwnProperty.call(THEME_FARBSCHEMA_KLASSEN, value);
}

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
  private readonly _selectedFarbschema: WritableSignal<TThemeFarbschema> = signal(
    this._loadInitialFarbschema(),
  );

  // ===== Öffentliche Werte ====================

  readonly farbschemata: readonly { value: TThemeFarbschema; label: string }[] = [
    { value: 'cyan-orange', label: 'Cyan & Orange' },
    { value: 'azure-blue', label: 'Azure & Blue' },
    { value: 'rose-red', label: 'Rose & Red' },
    { value: 'magenta-violet', label: 'Magenta & Violet' },
  ];
  readonly selectedFarbschema: Signal<TThemeFarbschema> = this._selectedFarbschema.asReadonly();

  // ===== Öffentliche Ableitungen ==============

  readonly themeIcon: Signal<string> = computed(() => {
    return this._themeMode() === 'dark' ? 'light_mode' : 'dark_mode';
  });

  constructor() {
    this._applyThemeMode(this._themeMode());
    this._applyFarbschema(this._selectedFarbschema());
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

  /**
   * Wendet das ausgewählte Material-Farbschema an und speichert die Auswahl lokal.
   *
   * @param farbschema - Auszuwählende Kombination aus Primär- und Tertiärpalette.
   */
  setFarbschema(farbschema: TThemeFarbschema): void {
    if (farbschema === this._selectedFarbschema()) return;

    this._selectedFarbschema.set(farbschema);
    this._applyFarbschema(farbschema);
    this._saveFarbschema(farbschema);
  }

  // ===== Interne Helfer =======================

  private _loadInitialThemeMode(): TThemeMode {
    if (!this._isBrowser) {
      return 'light';
    }

    const savedThemeMode = localStorage.getItem(THEME_STORAGE_KEY);

    return savedThemeMode === 'dark' ? 'dark' : 'light';
  }

  private _loadInitialFarbschema(): TThemeFarbschema {
    if (!this._isBrowser) return 'cyan-orange';

    const savedFarbschema = localStorage.getItem(THEME_FARBSCHEMA_STORAGE_KEY);
    return isThemeFarbschema(savedFarbschema) ? savedFarbschema : 'cyan-orange';
  }

  private _applyThemeMode(themeMode: TThemeMode): void {
    const bodyClassList = this._document.body.classList;

    bodyClassList.toggle(THEME_CLASS_LIGHT, themeMode === 'light');
    bodyClassList.toggle(THEME_CLASS_DARK, themeMode === 'dark');
  }

  private _applyFarbschema(farbschema: TThemeFarbschema): void {
    const bodyClassList = this._document.body.classList;
    bodyClassList.remove(...Object.values(THEME_FARBSCHEMA_KLASSEN));
    bodyClassList.add(THEME_FARBSCHEMA_KLASSEN[farbschema]);
  }

  private _saveThemeMode(themeMode: TThemeMode): void {
    if (!this._isBrowser) {
      return;
    }

    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }

  private _saveFarbschema(farbschema: TThemeFarbschema): void {
    if (!this._isBrowser) return;

    localStorage.setItem(THEME_FARBSCHEMA_STORAGE_KEY, farbschema);
  }
}
