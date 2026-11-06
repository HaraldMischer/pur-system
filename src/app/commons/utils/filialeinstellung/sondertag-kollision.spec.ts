// pur-system/src/app/commons/utils/filialeinstellung/sondertag-kollision.spec.ts

import type { IFilialeinstellungSondertagEintrag } from '../../models/domain/filialeinstellung';
import { assertKeineAktiveSondertagDatumskollision } from './sondertag-kollision';

describe('assertKeineAktiveSondertagDatumskollision', () => {
  it('should name both active special days when their annual dates collide', () => {
    expect(() => {
      assertKeineAktiveSondertagDatumskollision(
        [createSondertag('heiligabend', 'Heiligabend', true, 12, 24)],
        {
          bezeichnung: 'Betriebsruhe',
          aktiv: true,
          herkunft: 'benutzer',
          datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
        },
      );
    }).toThrow(
      'Die aktiven Sondertage „Betriebsruhe“ und „Heiligabend“ verwenden beide den 24.12.',
    );
  });

  it('should allow inactive, different and currently edited special days', () => {
    const bestand = [createSondertag('heiligabend', 'Heiligabend', true, 12, 24)];
    expect(() => {
      assertKeineAktiveSondertagDatumskollision(bestand, {
        bezeichnung: 'Inaktiv',
        aktiv: false,
        herkunft: 'benutzer',
        datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
      });
      assertKeineAktiveSondertagDatumskollision(bestand, {
        bezeichnung: 'Silvester',
        aktiv: true,
        herkunft: 'benutzer',
        datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 31 },
      });
      assertKeineAktiveSondertagDatumskollision(
        bestand,
        {
          bezeichnung: 'Heiligabend neu',
          aktiv: true,
          herkunft: 'benutzer',
          datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
        },
        'heiligabend',
      );
    }).not.toThrow();
  });

  it('should allow a user-defined annual special day on a system special day', () => {
    const systemSondertag = {
      ...createSondertag('heiligabend', 'Heiligabend', true, 12, 24),
      herkunft: 'system' as const,
    };

    expect(() => {
      assertKeineAktiveSondertagDatumskollision([systemSondertag], {
        bezeichnung: 'Betriebsruhe',
        aktiv: true,
        herkunft: 'benutzer',
        datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
      });
    }).not.toThrow();
  });
});

function createSondertag(
  id: string,
  bezeichnung: string,
  aktiv: boolean,
  monat: number,
  tag: number,
): IFilialeinstellungSondertagEintrag {
  return {
    id,
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    filialeId: 'b-1',
    bezeichnung,
    aktiv,
    herkunft: 'benutzer',
    datumsregel: { typ: 'jaehrlichFestesDatum', monat, tag },
    oeffnungsregel: { geoeffnet: false },
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}
