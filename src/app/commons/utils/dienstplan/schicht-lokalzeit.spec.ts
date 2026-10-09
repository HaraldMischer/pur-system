// pur-system/src/app/commons/utils/dienstplan/schicht-lokalzeit.spec.ts

import {
  createSchichtZeitstempel,
  createSchichtZeitstempelAusVorlage,
  formatSchichtDatum,
  formatSchichtUhrzeit,
} from './schicht-lokalzeit';

describe('Schicht-Lokalzeit', () => {
  it('should preserve Berlin local date and time across daylight saving time', () => {
    const timestamp = createSchichtZeitstempel('2026-07-15', '08:30', 'Europe/Berlin');
    expect(formatSchichtDatum(timestamp, 'Europe/Berlin')).toBe('2026-07-15');
    expect(formatSchichtUhrzeit(timestamp, 'Europe/Berlin')).toBe('08:30');
  });

  it('should reject a missing local time during the daylight saving transition', () => {
    expect(() => createSchichtZeitstempel('2026-03-29', '02:30', 'Europe/Berlin')).toThrow();
  });

  it('should create a shift ending on the following local calendar day', () => {
    const ergebnis = createSchichtZeitstempelAusVorlage(
      '2026-10-05',
      {
        beginnLokalzeit: '16:30',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
      'Europe/Berlin',
    );

    expect(ergebnis.beginn.toDate().toISOString()).toBe('2026-10-05T14:30:00.000Z');
    expect(ergebnis.ende.toDate().toISOString()).toBe('2026-10-05T23:00:00.000Z');
  });
});
