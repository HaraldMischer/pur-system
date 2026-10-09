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

  it('should expose the branch in employee and service-plan areas for a master', () => {
    expect(getAppKontextSelectorKonfiguration('master', 'dashboard').filiale).toBe('hidden');
    expect(getAppKontextSelectorKonfiguration('master', 'mitarbeiter').filiale).toBe('editable');
    expect(getAppKontextSelectorKonfiguration('master', 'schichtplan').filiale).toBe('editable');
  });

  it('should expose the required service-plan selectors for office and employees', () => {
    expect(getAppKontextSelectorKonfiguration('office', 'schichtplan')).toEqual({
      unternehmer: 'editable',
      firma: 'editable',
      filiale: 'editable',
    });
    expect(getAppKontextSelectorKonfiguration('mitarbeiter', 'schichtplan')).toEqual({
      unternehmer: 'hidden',
      firma: 'hidden',
      filiale: 'editable',
    });
  });

  it('should hide every selector for unconfigured roles and routes without an app area', () => {
    expect(getAppKontextSelectorKonfiguration('office', 'dashboard')).toEqual(
      VERBORGENE_APP_KONTEXT_SELECTOR_KONFIGURATION,
    );
    expect(getAppKontextSelectorKonfiguration('master', null)).toEqual(
      VERBORGENE_APP_KONTEXT_SELECTOR_KONFIGURATION,
    );
  });
});
