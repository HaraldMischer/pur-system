// pur-system/src/app/commons/utils/firestore/firestore-dokumentwerte.spec.ts

import { asRecord, getOptionalString, getString } from './firestore-dokumentwerte';

describe('Firestore-Dokumentwerte', () => {
  it('should accept only plain object values', () => {
    const record = { wert: true };

    expect(asRecord(record)).toBe(record);
    expect(asRecord(null)).toEqual({});
    expect(asRecord([])).toEqual({});
    expect(asRecord('text')).toEqual({});
  });

  it('should trim strings and use the provided fallback', () => {
    expect(getString(' Wert ')).toBe('Wert');
    expect(getString(' ', 'Fallback')).toBe('Fallback');
    expect(getString(123, 'Fallback')).toBe('Fallback');
  });

  it('should return undefined for missing optional strings', () => {
    expect(getOptionalString(' Wert ')).toBe('Wert');
    expect(getOptionalString(' ')).toBeUndefined();
    expect(getOptionalString(null)).toBeUndefined();
  });
});
