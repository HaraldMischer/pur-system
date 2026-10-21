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

  it('should keep the monthly snapshot unchanged after later opening-rule changes', () => {
    const montag = createGeoeffnet('08:00', '18:00');
    const wochenregeln: TWochenoeffnungszeiten = {
      ...WOCHENREGELN,
      montag,
    };
    const kalendertag = createDienstplanKalendertage({
      monat: '2026-05',
      wochenregeln,
      sondertage: [],
      ausnahmen: [],
    }).find((eintrag) => {
      return eintrag.datum === '2026-05-04';
    });

    montag.beginnLokalzeit = '10:00';
    montag.endeLokalzeit = '16:00';

    expect(kalendertag?.oeffnungsregel).toEqual(createGeoeffnet('08:00', '18:00'));
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

  it('should keep one stable grid for weekdays, Sundays and holidays including a Sunday holiday', () => {
    const wochenregeln: TWochenoeffnungszeiten = {
      ...WOCHENREGELN,
      samstag: createGeoeffnet('08:00', '18:00'),
      sonntag: createGeoeffnet('10:00', '18:00'),
    };
    const tagDerArbeit = {
      ...createSondertag('tagDerArbeit', 'Tag der Arbeit', true, {
        typ: 'gesetzlicherFeiertag' as const,
        feiertagSchluessel: 'tagDerArbeit' as const,
      }),
      oeffnungsregel: createGeoeffnet('09:00', '17:00'),
    };
    const pfingstsonntag = {
      ...createSondertag('pfingstsonntag', 'Pfingstsonntag', true, {
        typ: 'gesetzlicherFeiertag' as const,
        feiertagSchluessel: 'pfingstsonntag' as const,
      }),
      oeffnungsregel: createGeoeffnet('12:00', '16:00'),
    };

    const kalendertage = createDienstplanKalendertage({
      monat: '2026-05',
      wochenregeln,
      sondertage: [tagDerArbeit, pfingstsonntag],
      ausnahmen: [],
      modellschichten: [
        createModellschicht('frueh', '08:00', '16:30'),
        createModellschicht('spaet', '16:30', '01:00', true),
      ],
      besondereRasterzeiten: [
        {
          sondertagId: 'pfingstsonntag',
          modellschichtId: 'frueh',
          beginnLokalzeit: '12:00',
          endeLokalzeit: '14:00',
          endetAmFolgetag: false,
        },
        {
          sondertagId: 'pfingstsonntag',
          modellschichtId: 'spaet',
          beginnLokalzeit: '14:00',
          endeLokalzeit: '16:00',
          endetAmFolgetag: false,
        },
      ],
    });
    const werktag = getKalendertag(kalendertage, '2026-05-04');
    const sonntag = getKalendertag(kalendertage, '2026-05-03');
    const feiertagAmWerktag = getKalendertag(kalendertage, '2026-05-01');
    const feiertagAmSonntag = getKalendertag(kalendertage, '2026-05-24');

    for (const kalendertag of [werktag, sonntag, feiertagAmWerktag, feiertagAmSonntag]) {
      expect(kalendertag.rasterzeiten.map((rasterzeit) => rasterzeit.modellschichtId)).toEqual([
        'frueh',
        'spaet',
      ]);
    }
    expect(werktag.rasterzeiten).toEqual([
      createRasterzeit('frueh', '08:00', '16:30'),
      createRasterzeit('spaet', '16:30', '18:00'),
    ]);
    expect(sonntag.rasterzeiten).toEqual([
      createRasterzeit('frueh', '10:00', '16:30'),
      createRasterzeit('spaet', '16:30', '18:00'),
    ]);
    expect(feiertagAmWerktag).toEqual(
      expect.objectContaining({
        istSonntag: false,
        bezeichnung: 'Tag der Arbeit',
        gesetzlicherFeiertag: {
          schluessel: 'tagDerArbeit',
          bezeichnung: 'Tag der Arbeit',
        },
      }),
    );
    expect(feiertagAmWerktag.rasterzeiten).toEqual([
      createRasterzeit('frueh', '09:00', '16:30'),
      createRasterzeit('spaet', '16:30', '17:00'),
    ]);
    expect(feiertagAmSonntag).toEqual(
      expect.objectContaining({
        istSonntag: true,
        bezeichnung: 'Pfingstsonntag',
        gesetzlicherFeiertag: {
          schluessel: 'pfingstsonntag',
          bezeichnung: 'Pfingstsonntag',
        },
      }),
    );
    expect(feiertagAmSonntag.rasterzeiten).toEqual([
      createRasterzeit('frueh', '12:00', '14:00'),
      createRasterzeit('spaet', '14:00', '16:00'),
    ]);
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
      createRasterzeit('frueh', '10:00', '13:00'),
      createRasterzeit('spaet', '12:00', '16:00'),
    ]);
  });

  it('should keep model inner limits for a one-time opening exception', () => {
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
      createRasterzeit('frueh', '09:00', '12:00'),
      createRasterzeit('spaet', '12:00', '17:00'),
    ]);
  });

  it('should adjust the outer raster times to an overnight opening rule with preparation', () => {
    const oeffnungsregel = createGeoeffnet('10:00', '01:00', true);
    const wochenregeln: TWochenoeffnungszeiten = {
      montag: oeffnungsregel,
      dienstag: oeffnungsregel,
      mittwoch: oeffnungsregel,
      donnerstag: oeffnungsregel,
      freitag: oeffnungsregel,
      samstag: oeffnungsregel,
      sonntag: oeffnungsregel,
    };
    const sonntag = createDienstplanKalendertage({
      monat: '2026-10',
      wochenregeln,
      sondertage: [],
      ausnahmen: [],
      modellschichten: [
        {
          ...createModellschicht('frueh', '08:00', '16:30'),
          vorbereitungsminuten: 30,
        },
        {
          ...createModellschicht('spaet', '16:30', '01:00', true),
          nachbereitungsminuten: 15,
        },
      ],
    }).find((eintrag) => {
      return eintrag.datum === '2026-10-11';
    });

    expect(sonntag?.rasterzeiten).toEqual([
      createRasterzeit('frueh', '09:30', '16:30'),
      createRasterzeit('spaet', '16:30', '01:15', true),
    ]);
  });

  it('should not provide raster times on a closed day', () => {
    const sonntag = createDienstplanKalendertage({
      monat: '2026-10',
      wochenregeln: WOCHENREGELN,
      sondertage: [],
      ausnahmen: [],
      modellschichten: [createModellschicht('frueh', '08:00', '16:30')],
    }).find((eintrag) => {
      return eintrag.datum === '2026-10-11';
    });

    expect(sonntag?.rasterzeiten).toEqual([]);
  });

  it('should reject a model shift without positive duration after opening adjustment', () => {
    const oeffnungsregel = createGeoeffnet('08:00', '14:00');
    const wochenregeln: TWochenoeffnungszeiten = {
      montag: oeffnungsregel,
      dienstag: oeffnungsregel,
      mittwoch: oeffnungsregel,
      donnerstag: oeffnungsregel,
      freitag: oeffnungsregel,
      samstag: oeffnungsregel,
      sonntag: oeffnungsregel,
    };

    expect(() => {
      return createDienstplanKalendertage({
        monat: '2026-10',
        wochenregeln,
        sondertage: [],
        ausnahmen: [],
        modellschichten: [
          createModellschicht('frueh', '08:00', '12:00'),
          createModellschicht('spaet', '16:30', '01:00', true),
        ],
      });
    }).toThrow(
      'Die Modellschicht spaet hat am 2026-10-01 nach der Anpassung an die Öffnungszeiten keine positive Dauer.',
    );
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

function createGeoeffnet(
  beginnLokalzeit: string,
  endeLokalzeit: string,
  endetAmFolgetag = false,
): TOeffnungsregel {
  return { geoeffnet: true, beginnLokalzeit, endeLokalzeit, endetAmFolgetag };
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

function createModellschicht(
  id: string,
  beginnLokalzeit: string,
  endeLokalzeit: string,
  endetAmFolgetag = false,
) {
  return { id, beginnLokalzeit, endeLokalzeit, endetAmFolgetag };
}

function createRasterzeit(
  modellschichtId: string,
  beginnLokalzeit: string,
  endeLokalzeit: string,
  endetAmFolgetag = false,
) {
  return { modellschichtId, beginnLokalzeit, endeLokalzeit, endetAmFolgetag };
}

function getKalendertag(
  kalendertage: ReturnType<typeof createDienstplanKalendertage>,
  datum: string,
) {
  const kalendertag = kalendertage.find((eintrag) => {
    return eintrag.datum === datum;
  });
  if (!kalendertag) throw new Error(`Der Kalendertag ${datum} fehlt im Test.`);
  return kalendertag;
}
