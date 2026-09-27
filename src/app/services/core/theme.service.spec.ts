// pur-system/src/app/services/core/theme.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const THEME_STORAGE_KEY = 'pur-office-theme-mode';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.body.classList.remove('theme-light', 'theme-dark');
    TestBed.resetTestingModule();
  });

  it('should apply the light theme by default', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.themeIcon()).toBe('dark_mode');
    expect(document.body.classList.contains('theme-light')).toBe(true);
    expect(document.body.classList.contains('theme-dark')).toBe(false);
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
});
