// pur-system/src/app/services/core/theme.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const THEME_STORAGE_KEY = 'pur-office-theme-mode';
const THEME_FARBSCHEMA_STORAGE_KEY = 'pur-office-theme-farbschema';
describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_FARBSCHEMA_STORAGE_KEY);
    TestBed.resetTestingModule();
  });

  it('should select the light theme by default', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.themeIcon()).toBe('dark_mode');
    expect(service.selectedFarbschema()).toBe('cyan-orange');
  });

  it('should load the dark theme from local storage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.themeIcon()).toBe('light_mode');
  });

  it('should toggle from light to dark', () => {
    const service = TestBed.inject(ThemeService);

    service.toggleThemeMode();

    expect(service.themeIcon()).toBe('light_mode');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('should toggle from dark to light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = TestBed.inject(ThemeService);

    service.toggleThemeMode();

    expect(service.themeIcon()).toBe('dark_mode');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('should load a saved color scheme', () => {
    localStorage.setItem(THEME_FARBSCHEMA_STORAGE_KEY, 'azure-blue');

    const service = TestBed.inject(ThemeService);

    expect(service.selectedFarbschema()).toBe('azure-blue');
  });

  it('should select and save a color scheme', () => {
    const service = TestBed.inject(ThemeService);

    service.setFarbschema('rose-red');

    expect(service.selectedFarbschema()).toBe('rose-red');
    expect(localStorage.getItem(THEME_FARBSCHEMA_STORAGE_KEY)).toBe('rose-red');
  });

  it('should ignore an invalid saved color scheme', () => {
    localStorage.setItem(THEME_FARBSCHEMA_STORAGE_KEY, 'toString');

    const service = TestBed.inject(ThemeService);

    expect(service.selectedFarbschema()).toBe('cyan-orange');
  });
});
