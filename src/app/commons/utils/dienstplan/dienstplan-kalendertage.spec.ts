// pur-system/src/app/commons/utils/dienstplan/dienstplan-kalendertage.spec.ts

import type {
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungSondertagEintrag,
  TOeffnungsregel,
  TWochenoeffnungszeiten,
} from '../../models/domain/filialeinstellung';
import { createDienstplanKalendertage, getDienstplanRasterzeit } from './dienstplan-kalendertage';

const WOCHENREGELN: TWochenoeffnungszeiten = {
  montag: createGeoeffnet('08:00', '18:00'),
  dienstag: createGeoeffnet('08:00', '18:00'),
  mittwoch: createGeoeffnet('08:00', '18:00'),
  donnerstag: createGeoeffnet('08:00', '18:00'),
  freitag: createGeoeffnet('08:00', '18:00'),
  samstag: createGeoeffnet('08:00', '14:00'),
  sonntag: { geoeffnet: false },
};

describe('createDienstplanKalendertage', () => {
  it.each([
    ['2025-02', 28, '2025-02-28'],
    ['2024-02', 29, '2024-02-29'],
    ['2026-12', 31, '2026-12-31'],
  ])('should resolve the complete month %s', (monat, anzahl, letztesDatum) => {
    const kalendertage = createDienstplanKalendertage({
      monat,
      wochenregeln: WOCHENREGELN,
      sondertage: [],
      ausnahmen: [],
    });

    expect(kalendertage).toHaveLength(anzahl);
    expect(kalendertage[0]?.datum).toBe(`${monat}-01`);
    expect(kalendertage.at(-1)?.datum).toBe(letztesDatum);
  });

  it('should snapshot an active holiday and a date exception with independent calendar data', () => {
    const neujahr = createSondertag('neujahr', 'Neujahr', true, {
      typ: 'gesetzlicherFeiertag',
      feiertagSchluessel: 'neujahr',
    });
    const ausnahme = createAusnahme('2026-01-01', 'Sonderöffnung');

    const [ersterJanuar] = createDienstplanKalendertage({
      monat: '2026-01',
      wochenregeln: WOCHENREGELN,
      sondertage: [neujahr],
      ausnahmen: [ausnahme],
    });

    expect(ersterJanuar).toEqual({
      datum: '2026-01-01',
      wochentag: 'donnerstag',
      istSonntag: false,
      aktiveSondertage: [{ id: 'neujahr', bezeichnung: 'Neujahr' }],
      oeffnungsregelQuelle: 'ausnahme',
      oeffnungsregel: ausnahme.oeffnungsregel,
      rasterzeiten: [],
      bezeichnung: 'Sonderöffnung',
      ausnahmeId: '2026-01-01',
      gesetzlicherFeiertag: { schluessel: 'neujahr', bezeichnung: 'Neujahr' },
    });
  });

  it('should preserve an inactive statutory holiday while using the weekday opening rule', () => {
    const karfreitag = createSondertag('karfreitag', 'Karfreitag', false, {
      typ: 'gesetzlicherFeiertag',
      feiertagSchluessel: 'karfreitag',
    });

    const kalendertag = createDienstplanKalendertage({
      monat: '2026-04',
      wochenregeln: WOCHENREGELN,
      sondertage: [karfreitag],
      ausnahmen: [],
    }).find((eintrag) => {
      return eintrag.datum === '2026-04-03';
    });

    expect(kalendertag).toEqual(
      expect.objectContaining({
        wochentag: 'freitag',
        oeffnungsregelQuelle: 'wochentag',
        gesetzlicherFeiertag: { schluessel: 'karfreitag', bezeichnung: 'Karfreitag' },
      }),
    );
  });

  it('should snapshot special raster times without changing the fixed model grid', () => {
    const neujahr = createSondertag('neujahr', 'Neujahr', true, {
      typ: 'gesetzlicherFeiertag',
      feiertagSchluessel: 'neujahr',
    });

    const [ersterJanuar] = createDienstplanKalendertage({
      monat: '2026-01',
      wochenregeln: WOCHENREGELN,
      sondertage: [neujahr],
      ausnahmen: [],
      modellschichten: [
        createModellschicht('frueh', '07:00', '12:00'),
        createModellschicht('spaet', '12:00', '18:00'),
      ],
      besondereRasterzeiten: [
        {
          sondertagId: 'neujahr',
          modellschichtId: 'frueh',
          beginnLokalzeit: '09:30',
          endeLokalzeit: '13:00',
          endetAmFolgetag: false,
        },
      ],
    });

    expect(ersterJanuar.rasterzeiten).toEqual([
      createRasterzeit('frueh', '09:30', '13:00'),
      createRasterzeit('spaet', '12:00', '18:00'),
    ]);
  });

  it('should prefer a one-time raster override over a special-day raster time', () => {
    const neujahr = createSondertag('neujahr', 'Neujahr', true, {
      typ: 'gesetzlicherFeiertag',
      feiertagSchluessel: 'neujahr',
    });

    const [ersterJanuar] = createDienstplanKalendertage({
      monat: '2026-01',
      wochenregeln: WOCHENREGELN,
      sondertage: [neujahr],
      ausnahmen: [],
      modellschichten: [createModellschicht('frueh', '07:00', '12:00')],
      besondereRasterzeiten: [
        {
          sondertagId: 'neujahr',
          modellschichtId: 'frueh',
          beginnLokalzeit: '09:30',
          endeLokalzeit: '13:00',
          endetAmFolgetag: false,
        },
      ],
      datumRasterzeiten: [
        {
          datum: '2026-01-01',
          rasterzeiten: [createRasterzeit('frueh', '06:30', '11:00')],
        },
      ],
    });

    expect(ersterJanuar.rasterzeiten).toEqual([createRasterzeit('frueh', '06:30', '11:00')]);
  });

  it('should reject multiple active special days without a date exception', () => {
    const sondertage = [
      createSondertag('heiligabend', 'Heiligabend', true, {
        typ: 'jaehrlichFestesDatum',
        monat: 12,
        tag: 24,
      }),
      createSondertag('jubilaeum', 'Jubiläum', true, {
        typ: 'jaehrlichFestesDatum',
        monat: 12,
        tag: 24,
      }),
    ];

    expect(() => {
      return createDienstplanKalendertage({
        monat: '2026-12',
        wochenregeln: WOCHENREGELN,
        sondertage,
        ausnahmen: [],
      });
    }).toThrow('Für 2026-12-24 sind mehrere aktive Sondertage konfiguriert');
  });

  it('should reject a missing raster time instead of deriving a fallback', () => {
    const [kalendertag] = createDienstplanKalendertage({
      monat: '2026-01',
      wochenregeln: WOCHENREGELN,
      sondertage: [],
      ausnahmen: [],
    });

    expect(() => getDienstplanRasterzeit(kalendertag, 'frueh')).toThrow(
      'Die Rasterzeit wurde im Kalendertag nicht gefunden.',
    );
  });
});

function createGeoeffnet(beginnLokalzeit: string, endeLokalzeit: string): TOeffnungsregel {
  return { geoeffnet: true, beginnLokalzeit, endeLokalzeit, endetAmFolgetag: false };
}

function createSondertag(
  id: string,
  bezeichnung: string,
  aktiv: boolean,
  datumsregel: IFilialeinstellungSondertagEintrag['datumsregel'],
): IFilialeinstellungSondertagEintrag {
  return {
    id,
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    filialeId: 'b-1',
    bezeichnung,
    aktiv,
    herkunft: 'system',
    datumsregel,
    oeffnungsregel: createGeoeffnet('10:00', '16:00'),
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}

function createAusnahme(datum: string, bezeichnung: string): IFilialeinstellungAusnahmeEintrag {
  return {
    id: datum,
    datum,
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    filialeId: 'b-1',
    bezeichnung,
    oeffnungsregel: createGeoeffnet('09:00', '17:00'),
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}

function createModellschicht(id: string, beginnLokalzeit: string, endeLokalzeit: string) {
  return { id, beginnLokalzeit, endeLokalzeit, endetAmFolgetag: false };
}

function createRasterzeit(modellschichtId: string, beginnLokalzeit: string, endeLokalzeit: string) {
  return { modellschichtId, beginnLokalzeit, endeLokalzeit, endetAmFolgetag: false };
}
