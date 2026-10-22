// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-farbkennung.spec.ts

import { getMitarbeiterFarbe } from './mitarbeiter-farbkennung';

describe('getMitarbeiterFarbe', () => {
  it('should resolve a stored identifier to its display color', () => {
    expect(getMitarbeiterFarbe('blau')).toBe('#1976d2');
  });

  it('should preserve an existing legacy color value', () => {
    expect(getMitarbeiterFarbe(' #123456 ')).toBe('#123456');
  });

  it('should return null without a color identifier', () => {
    expect(getMitarbeiterFarbe(undefined)).toBeNull();
    expect(getMitarbeiterFarbe('')).toBeNull();
  });
});
