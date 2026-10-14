// pur-system/src/app/services/core/theme.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const THEME_STORAGE_KEY = 'pur-office-theme-mode';
const THEME_FARBSCHEMA_STORAGE_KEY = 'pur-office-theme-farbschema';
const THEME_FARBSCHEMA_KLASSEN = [
  'pur-theme-color-azure-blue',
  'pur-theme-color-cyan-orange',
  'pur-theme-color-magenta-violet',
  'pur-theme-color-rose-red',
];

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_FARBSCHEMA_STORAGE_KEY);
    document.body.classList.remove('theme-light', 'theme-dark', ...THEME_FARBSCHEMA_KLASSEN);
    TestBed.resetTestingModule();
  });

  it('should apply the light theme by default', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.themeIcon()).toBe('dark_mode');
    expect(service.selectedFarbschema()).toBe('cyan-orange');
    expect(document.body.classList.contains('theme-light')).toBe(true);
    expect(document.body.classList.contains('theme-dark')).toBe(false);
    expect(document.body.classList.contains('pur-theme-color-cyan-orange')).toBe(true);
  });

  it('should load the dark theme from local storage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.themeIcon()).toBe('light_mode');
    expect(document.body.classList.contains('theme-light')).toBe(false);
    expect(document.body.classList.contains('theme-dark')).toBe(true);
  });

  it('should toggle from light to dark', () => {
    const service = TestBed.inject(ThemeService);

    service.toggleThemeMode();

    expect(service.themeIcon()).toBe('light_mode');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.body.classList.contains('theme-light')).toBe(false);
    expect(document.body.classList.contains('theme-dark')).toBe(true);
  });

  it('should toggle from dark to light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = TestBed.inject(ThemeService);

    service.toggleThemeMode();

    expect(service.themeIcon()).toBe('dark_mode');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.body.classList.contains('theme-light')).toBe(true);
    expect(document.body.classList.contains('theme-dark')).toBe(false);
  });

  it('should load a saved color scheme', () => {
    localStorage.setItem(THEME_FARBSCHEMA_STORAGE_KEY, 'azure-blue');

    const service = TestBed.inject(ThemeService);

    expect(service.selectedFarbschema()).toBe('azure-blue');
    expect(document.body.classList.contains('pur-theme-color-azure-blue')).toBe(true);
    expect(document.body.classList.contains('pur-theme-color-cyan-orange')).toBe(false);
  });

  it('should apply and save a selected color scheme', () => {
    const service = TestBed.inject(ThemeService);

    service.setFarbschema('rose-red');

    expect(service.selectedFarbschema()).toBe('rose-red');
    expect(localStorage.getItem(THEME_FARBSCHEMA_STORAGE_KEY)).toBe('rose-red');
    expect(document.body.classList.contains('pur-theme-color-rose-red')).toBe(true);
    expect(document.body.classList.contains('pur-theme-color-cyan-orange')).toBe(false);
  });

  it('should ignore an invalid saved color scheme', () => {
    localStorage.setItem(THEME_FARBSCHEMA_STORAGE_KEY, 'toString');

    const service = TestBed.inject(ThemeService);

    expect(service.selectedFarbschema()).toBe('cyan-orange');
    expect(document.body.classList.contains('pur-theme-color-cyan-orange')).toBe(true);
  });
});
