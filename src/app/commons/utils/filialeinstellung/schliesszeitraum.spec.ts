// pur-system/src/app/commons/utils/filialeinstellung/schliesszeitraum.spec.ts

import {
  getMaximalerOeffnungsrahmen,
  isGueltigerSchliesszeitraum,
  isOeffnungsregelInnerhalbOeffnungsrahmen,
} from './schliesszeitraum';

describe('Schließzeitraum', () => {
  const schliesszeitraum = {
    beginnLokalzeit: '01:00',
    endeLokalzeit: '06:00',
    endetAmFolgetag: false,
  } as const;

  it('should derive the overnight opening frame from the standard closing period', () => {
    expect(getMaximalerOeffnungsrahmen(schliesszeitraum)).toEqual({
      geoeffnet: true,
      beginnLokalzeit: '06:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    });
  });

  it('should derive a same-day opening frame from an overnight closing period', () => {
    expect(
      getMaximalerOeffnungsrahmen({
        beginnLokalzeit: '23:00',
        endeLokalzeit: '05:00',
        endetAmFolgetag: true,
      }),
    ).toEqual({
      geoeffnet: true,
      beginnLokalzeit: '05:00',
      endeLokalzeit: '23:00',
      endetAmFolgetag: false,
    });
  });

  it('should reject invalid closing periods', () => {
    expect(
      isGueltigerSchliesszeitraum({
        beginnLokalzeit: '06:00',
        endeLokalzeit: '06:00',
        endetAmFolgetag: false,
      }),
    ).toBe(false);
    expect(
      isGueltigerSchliesszeitraum({
        beginnLokalzeit: '23:00',
        endeLokalzeit: '05:00',
        endetAmFolgetag: false,
      }),
    ).toBe(false);
  });

  it('should accept only opening rules within the derived opening frame', () => {
    expect(
      isOeffnungsregelInnerhalbOeffnungsrahmen(
        {
          geoeffnet: true,
          beginnLokalzeit: '07:00',
          endeLokalzeit: '00:30',
          endetAmFolgetag: true,
        },
        schliesszeitraum,
      ),
    ).toBe(true);
    expect(
      isOeffnungsregelInnerhalbOeffnungsrahmen(
        {
          geoeffnet: true,
          beginnLokalzeit: '05:30',
          endeLokalzeit: '01:00',
          endetAmFolgetag: true,
        },
        schliesszeitraum,
      ),
    ).toBe(false);
    expect(
      isOeffnungsregelInnerhalbOeffnungsrahmen(
        {
          geoeffnet: true,
          beginnLokalzeit: '06:00',
          endeLokalzeit: '01:30',
          endetAmFolgetag: true,
        },
        schliesszeitraum,
      ),
    ).toBe(false);
    expect(isOeffnungsregelInnerhalbOeffnungsrahmen({ geoeffnet: false }, schliesszeitraum)).toBe(
      true,
    );
  });
});
