// pur-system/src/app/commons/constants/app-kontext-selector.constants.spec.ts

import {
  VERBORGENE_APP_KONTEXT_SELECTOR_KONFIGURATION,
  getAppKontextSelectorKonfiguration,
} from './app-kontext-selector.constants';

describe('App-Kontextselektor-Konfiguration', () => {
  it('should expose entrepreneur and company for a master in every configured area', () => {
    expect(getAppKontextSelectorKonfiguration('master', 'dashboard')).toMatchObject({
      unternehmer: 'editable',
      firma: 'editable',
    });
    expect(getAppKontextSelectorKonfiguration('master', 'systemverwaltung')).toMatchObject({
      unternehmer: 'editable',
      firma: 'editable',
    });
  });

  it('should keep the branch visible and configure its editability for a master', () => {
    expect(getAppKontextSelectorKonfiguration('master', 'dashboard').filiale).toBe('readonly');
    expect(getAppKontextSelectorKonfiguration('master', 'mitarbeiter').filiale).toBe('editable');
    expect(getAppKontextSelectorKonfiguration('master', 'schichtplan').filiale).toBe('editable');
    expect(getAppKontextSelectorKonfiguration('master', 'verwaltung').filiale).toBe('readonly');
  });

  it('should expose company and branch throughout the office areas', () => {
    expect(getAppKontextSelectorKonfiguration('office', 'dashboard')).toEqual({
      unternehmer: 'hidden',
      firma: 'editable',
      filiale: 'readonly',
    });
    expect(getAppKontextSelectorKonfiguration('office', 'schichtplan')).toEqual({
      unternehmer: 'hidden',
      firma: 'editable',
      filiale: 'editable',
    });
    expect(getAppKontextSelectorKonfiguration('office', 'verwaltung')).toEqual({
      unternehmer: 'hidden',
      firma: 'editable',
      filiale: 'readonly',
    });
  });

  it('should expose the required service-plan selectors for employees', () => {
    expect(getAppKontextSelectorKonfiguration('mitarbeiter', 'schichtplan')).toEqual({
      unternehmer: 'hidden',
      firma: 'hidden',
      filiale: 'editable',
    });
  });

  it('should hide every selector for unconfigured roles and routes without an app area', () => {
    expect(getAppKontextSelectorKonfiguration('filiale', 'dashboard')).toEqual(
      VERBORGENE_APP_KONTEXT_SELECTOR_KONFIGURATION,
    );
    expect(getAppKontextSelectorKonfiguration('master', null)).toEqual(
      VERBORGENE_APP_KONTEXT_SELECTOR_KONFIGURATION,
    );
  });
});
