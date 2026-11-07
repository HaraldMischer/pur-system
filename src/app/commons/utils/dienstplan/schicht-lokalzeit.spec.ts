// pur-system/src/app/commons/utils/dienstplan/schicht-lokalzeit.spec.ts

import {
  addLokalzeitMinuten,
  calculateModellschichtdauerMinuten,
  calculateSchichtdauerMinuten,
  createSchichtZeitstempel,
  createSchichtZeitstempelAusLokalzeiten,
  formatSchichtDatum,
  formatSchichtUhrzeit,
  getLokalzeitMinuten,
  getModellschichtTagFuerLokalzeit,
  istLokalzeitImMinutenraster,
} from './schicht-lokalzeit';

describe('Schicht-Lokalzeit', () => {
  it('should format preparation and follow-up offsets across midnight', () => {
    expect(addLokalzeitMinuten('00:15', -30)).toBeNull();
    expect(addLokalzeitMinuten('23:45', 30)).toBe('00:15');
    expect(addLokalzeitMinuten('10:00', -15)).toBe('09:45');
  });

  it('should convert a valid local time into minutes since start of day', () => {
    expect(getLokalzeitMinuten('16:30')).toBe(990);
    expect(getLokalzeitMinuten('24:00')).toBeNull();
  });

  it('should detect whether a local time lies on the configured minute grid', () => {
    expect(istLokalzeitImMinutenraster('08:15', 15)).toBe(true);
    expect(istLokalzeitImMinutenraster('08:07', 15)).toBe(false);
    expect(istLokalzeitImMinutenraster('ungültig', 15)).toBe(false);
  });

  it('should derive the model-shift day from the standard opening rule', () => {
    const standardoeffnungsregel = {
      geoeffnet: true as const,
      beginnLokalzeit: '06:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    } as const;

    expect(getModellschichtTagFuerLokalzeit('16:00', standardoeffnungsregel)).toBe('starttag');
    expect(getModellschichtTagFuerLokalzeit('00:30', standardoeffnungsregel)).toBe('folgetag');
    expect(getModellschichtTagFuerLokalzeit('ungültig', standardoeffnungsregel)).toBeNull();
    expect(
      getModellschichtTagFuerLokalzeit('20:00', {
        geoeffnet: true,
        beginnLokalzeit: '06:00',
        endeLokalzeit: '22:00',
        endetAmFolgetag: false,
      }),
    ).toBe('starttag');
  });

  it('should calculate same-day and overnight shift durations', () => {
    expect(calculateSchichtdauerMinuten('08:00', '16:30')).toBe(510);
    expect(calculateSchichtdauerMinuten('16:30', '01:00')).toBe(510);
  });

  it('should reject invalid or equal shift times', () => {
    expect(calculateSchichtdauerMinuten('08:00', '08:00')).toBeNull();
    expect(calculateSchichtdauerMinuten('ungültig', '16:30')).toBeNull();
  });

  it('should calculate model shift durations from explicit day assignments', () => {
    expect(
      calculateModellschichtdauerMinuten(
        { lokalzeit: '20:00', tag: 'starttag' },
        { lokalzeit: '01:00', tag: 'folgetag' },
      ),
    ).toBe(300);
    expect(
      calculateModellschichtdauerMinuten(
        { lokalzeit: '00:30', tag: 'folgetag' },
        { lokalzeit: '01:00', tag: 'folgetag' },
      ),
    ).toBe(30);
    expect(
      calculateModellschichtdauerMinuten(
        { lokalzeit: '20:00', tag: 'starttag' },
        { lokalzeit: '01:00', tag: 'starttag' },
      ),
    ).toBeNull();
  });

  it('should preserve Berlin local date and time across daylight saving time', () => {
    const timestamp = createSchichtZeitstempel('2026-07-15', '08:30', 'Europe/Berlin');
    expect(formatSchichtDatum(timestamp, 'Europe/Berlin')).toBe('2026-07-15');
    expect(formatSchichtUhrzeit(timestamp, 'Europe/Berlin')).toBe('08:30');
  });

  it('should reject a missing local time during the daylight saving transition', () => {
    expect(() => createSchichtZeitstempel('2026-03-29', '02:30', 'Europe/Berlin')).toThrow();
  });

  it('should create a shift ending on the following local calendar day', () => {
    const ergebnis = createSchichtZeitstempelAusLokalzeiten(
      '2026-10-05',
      {
        beginnLokalzeit: '16:30',
        endeLokalzeit: '01:00',
        beginntAmFolgetag: false,
        endetAmFolgetag: true,
      },
      'Europe/Berlin',
    );

    expect(ergebnis.beginn.toDate().toISOString()).toBe('2026-10-05T14:30:00.000Z');
    expect(ergebnis.ende.toDate().toISOString()).toBe('2026-10-05T23:00:00.000Z');
  });

  it('should create a shift beginning and ending on the following local calendar day', () => {
    const ergebnis = createSchichtZeitstempelAusLokalzeiten(
      '2026-10-05',
      {
        beginnLokalzeit: '00:30',
        endeLokalzeit: '01:00',
        beginntAmFolgetag: true,
        endetAmFolgetag: true,
      },
      'Europe/Berlin',
    );

    expect(ergebnis.beginn.toDate().toISOString()).toBe('2026-10-05T22:30:00.000Z');
    expect(ergebnis.ende.toDate().toISOString()).toBe('2026-10-05T23:00:00.000Z');
  });
});
