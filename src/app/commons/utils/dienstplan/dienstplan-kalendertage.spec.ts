// pur-system/src/app/commons/utils/dienstplan/dienstplan-kalendertage.spec.ts

import type {
  IFilialeinstellungSondertagEintrag,
  IGeoeffneteOeffnungsregel,
  TWochenregeln,
} from '../../models/domain/filialeinstellung';
import { createDienstplanKalendertage } from './dienstplan-kalendertage';

const STANDARDOEFFNUNGSREGEL: IGeoeffneteOeffnungsregel = {
  geoeffnet: true,
  beginnLokalzeit: '08:00',
  endeLokalzeit: '18:00',
  endetAmFolgetag: false,
};
const WOCHENREGELN: TWochenregeln = {
  montag: { modus: 'standard' },
  dienstag: { modus: 'standard' },
  mittwoch: { modus: 'standard' },
  donnerstag: { modus: 'standard' },
  freitag: { modus: 'standard' },
  samstag: { modus: 'abweichend', oeffnungsregel: createGeoeffnet('08:00', '14:00') },
  sonntag: { modus: 'geschlossen' },
};

describe('createDienstplanKalendertage', () => {
  it.each([
    ['2025-02', 28, '2025-02-28'],
    ['2024-02', 29, '2024-02-29'],
    ['2026-12', 31, '2026-12-31'],
  ])('should resolve the complete month %s', (monat, anzahl, letztesDatum) => {
    const kalendertage = createDienstplanKalendertage({
      monat,
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage: [],
    });

    expect(kalendertage).toHaveLength(anzahl);
    expect(kalendertage[0]?.datum).toBe(`${monat}-01`);
    expect(kalendertage.at(-1)?.datum).toBe(letztesDatum);
  });

  it('should snapshot a user-defined special opening and statutory holiday data', () => {
    const neujahr = createSondertag('neujahr', 'Neujahr', 'system', {
      typ: 'gesetzlicherFeiertag',
      feiertagSchluessel: 'neujahr',
    });
    const sonderoeffnung = createSondertag('sonderoeffnung', 'Sonderöffnung', 'benutzer', {
      typ: 'jaehrlichFestesDatum',
      monat: 1,
      tag: 1,
    });

    const [ersterJanuar] = createDienstplanKalendertage({
      monat: '2026-01',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage: [neujahr, sonderoeffnung],
    });

    expect(ersterJanuar).toEqual(
      expect.objectContaining({
        datum: '2026-01-01',
        bezeichnung: 'Sonderöffnung',
        sondertagId: 'sonderoeffnung',
        oeffnungsregelQuelle: 'sondertag',
        gesetzlicherFeiertag: { schluessel: 'neujahr', bezeichnung: 'Neujahr' },
      }),
    );
  });

  it('should keep the monthly opening snapshot independent from later settings changes', () => {
    const montag = createGeoeffnet('07:00', '19:00');
    const wochenregeln: TWochenregeln = {
      ...WOCHENREGELN,
      montag: { modus: 'abweichend', oeffnungsregel: montag },
    };
    const kalendertag = createDienstplanKalendertage({
      monat: '2026-05',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln,
      sondertage: [],
    }).find((eintrag) => {
      return eintrag.datum === '2026-05-04';
    });

    montag.beginnLokalzeit = '10:00';

    expect(kalendertag?.oeffnungsregel).toEqual(createGeoeffnet('07:00', '19:00'));
  });

  it('should reject multiple active user-defined special days for the same date', () => {
    const datumsregel = { typ: 'jaehrlichFestesDatum' as const, monat: 12, tag: 24 };

    expect(() => {
      return createDienstplanKalendertage({
        monat: '2026-12',
        standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
        wochenregeln: WOCHENREGELN,
        sondertage: [
          createSondertag('heiligabend', 'Heiligabend', 'benutzer', datumsregel),
          createSondertag('jubilaeum', 'Jubiläum', 'benutzer', datumsregel),
        ],
      });
    }).toThrow('Für 2026-12-24 sind mehrere aktive benutzerdefinierte Sondertage konfiguriert');
  });
});

function createGeoeffnet(
  beginnLokalzeit: string,
  endeLokalzeit: string,
): IGeoeffneteOeffnungsregel {
  return { geoeffnet: true, beginnLokalzeit, endeLokalzeit, endetAmFolgetag: false };
}

function createSondertag(
  id: string,
  bezeichnung: string,
  herkunft: IFilialeinstellungSondertagEintrag['herkunft'],
  datumsregel: IFilialeinstellungSondertagEintrag['datumsregel'],
): IFilialeinstellungSondertagEintrag {
  return {
    id,
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    filialeId: 'b-1',
    bezeichnung,
    aktiv: true,
    herkunft,
    datumsregel,
    oeffnungsregel: createGeoeffnet('10:00', '16:00'),
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}
