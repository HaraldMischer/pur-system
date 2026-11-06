// pur-system/src/app/commons/utils/dienstplan/dienstplan-kalendertage.spec.ts

import type {
  IFilialeinstellungSondertagEintrag,
  IGeoeffneteOeffnungsregel,
  TOeffnungsregel,
  TWochentag,
  TWochenregeln,
} from '../../models/domain/filialeinstellung';
import {
  createDienstplanKalendertage,
  getDienstplanRasterzeit,
  type IDienstplanRasterModellschicht,
} from './dienstplan-kalendertage';

type TAbsoluteWochenregeln = Readonly<Record<TWochentag, TOeffnungsregel>>;

const STANDARDOEFFNUNGSREGEL = createGeoeffnet('08:00', '18:00');
const ABSOLUTE_WOCHENREGELN: TAbsoluteWochenregeln = {
  montag: createGeoeffnet('08:00', '18:00'),
  dienstag: createGeoeffnet('08:00', '18:00'),
  mittwoch: createGeoeffnet('08:00', '18:00'),
  donnerstag: createGeoeffnet('08:00', '18:00'),
  freitag: createGeoeffnet('08:00', '18:00'),
  samstag: createGeoeffnet('08:00', '14:00'),
  sonntag: { geoeffnet: false },
};
const WOCHENREGELN = createWochenregeln(ABSOLUTE_WOCHENREGELN);

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

  it('should snapshot a user-defined annual special day and independent holiday data', () => {
    const neujahr = createSondertag('neujahr', 'Neujahr', true, {
      typ: 'gesetzlicherFeiertag',
      feiertagSchluessel: 'neujahr',
    });
    const sonderoeffnung = {
      ...createSondertag(
        'sonderoeffnung',
        'Sonderöffnung',
        true,
        { typ: 'jaehrlichFestesDatum', monat: 1, tag: 1 },
        'benutzer',
      ),
      oeffnungsregel: createGeoeffnet('09:00', '17:00'),
    };

    const [ersterJanuar] = createDienstplanKalendertage({
      monat: '2026-01',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage: [neujahr, sonderoeffnung],
    });

    expect(ersterJanuar).toEqual({
      datum: '2026-01-01',
      wochentag: 'donnerstag',
      istSonntag: false,
      aktiveSondertage: [
        { id: 'neujahr', bezeichnung: 'Neujahr' },
        { id: 'sonderoeffnung', bezeichnung: 'Sonderöffnung' },
      ],
      oeffnungsregelQuelle: 'sondertag',
      oeffnungsregel: sonderoeffnung.oeffnungsregel,
      rasterzeiten: [],
      bezeichnung: 'Sonderöffnung',
      sondertagId: 'sonderoeffnung',
      gesetzlicherFeiertag: { schluessel: 'neujahr', bezeichnung: 'Neujahr' },
    });
  });

  it('should keep the monthly snapshot unchanged after later opening-rule changes', () => {
    const montag = createGeoeffnet('08:00', '18:00');
    const modellschichten = [
      createModellschicht('frueh', '08:00', '12:00'),
      createModellschicht('spaet', '12:00', '18:00'),
    ];
    const absoluteWochenregeln: TAbsoluteWochenregeln = {
      ...ABSOLUTE_WOCHENREGELN,
      montag,
    };
    const kalendertag = createDienstplanKalendertage({
      monat: '2026-05',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: createWochenregeln(absoluteWochenregeln),
      sondertage: [],
      modellschichten,
    }).find((eintrag) => {
      return eintrag.datum === '2026-05-04';
    });

    montag.beginnLokalzeit = '10:00';
    montag.endeLokalzeit = '16:00';
    if (modellschichten[0].ende) modellschichten[0].ende.lokalzeit = '14:00';

    expect(kalendertag?.oeffnungsregel).toEqual(createGeoeffnet('08:00', '18:00'));
    expect(kalendertag?.rasterzeiten).toEqual([
      createRasterzeit('frueh', '08:00', '12:00'),
      createRasterzeit('spaet', '12:00', '18:00'),
    ]);
  });

  it('should preserve a statutory holiday in standard mode with the general standard opening', () => {
    const karfreitag = createSondertag('karfreitag', 'Karfreitag', false, {
      typ: 'gesetzlicherFeiertag',
      feiertagSchluessel: 'karfreitag',
    });

    const kalendertag = createDienstplanKalendertage({
      monat: '2026-04',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: {
        ...WOCHENREGELN,
        freitag: { modus: 'geschlossen' },
      },
      sondertage: [karfreitag],
    }).find((eintrag) => {
      return eintrag.datum === '2026-04-03';
    });

    expect(kalendertag).toEqual(
      expect.objectContaining({
        wochentag: 'freitag',
        oeffnungsregelQuelle: 'wochentag',
        oeffnungsregel: STANDARDOEFFNUNGSREGEL,
        gesetzlicherFeiertag: { schluessel: 'karfreitag', bezeichnung: 'Karfreitag' },
      }),
    );
  });

  it('should snapshot the Sunday opening source for a statutory holiday', () => {
    const sonntagsregel = createGeoeffnet('10:00', '01:00');
    const neujahr = {
      ...createSondertag('neujahr', 'Neujahr', true, {
        typ: 'gesetzlicherFeiertag' as const,
        feiertagSchluessel: 'neujahr' as const,
      }),
      modus: 'wieSonntag' as const,
    };

    const kalendertag = createDienstplanKalendertage({
      monat: '2026-01',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: {
        ...WOCHENREGELN,
        sonntag: { modus: 'abweichend', oeffnungsregel: sonntagsregel },
      },
      sondertage: [neujahr],
    })[0];

    expect(kalendertag).toEqual(
      expect.objectContaining({
        datum: '2026-01-01',
        istSonntag: false,
        oeffnungsregelQuelle: 'sonntag',
        oeffnungsregel: sonntagsregel,
        bezeichnung: 'Neujahr',
        sondertagId: 'neujahr',
        gesetzlicherFeiertag: { schluessel: 'neujahr', bezeichnung: 'Neujahr' },
      }),
    );
  });

  it('should keep one stable grid for weekdays, Sundays and holidays including a Sunday holiday', () => {
    const absoluteWochenregeln: TAbsoluteWochenregeln = {
      ...ABSOLUTE_WOCHENREGELN,
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
      oeffnungsregel: createGeoeffnet('12:00', '18:00'),
    };

    const kalendertage = createDienstplanKalendertage({
      monat: '2026-05',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: createWochenregeln(absoluteWochenregeln),
      sondertage: [tagDerArbeit, pfingstsonntag],
      modellschichten: [
        createModellschicht('frueh', '08:00', '16:30'),
        createModellschicht('spaet', '16:30', '01:00'),
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
      createRasterzeit('frueh', '12:00', '16:30'),
      createRasterzeit('spaet', '16:30', '18:00'),
    ]);
  });

  it('should keep model inner limits for a user-defined annual special opening', () => {
    const neujahr = createSondertag('neujahr', 'Neujahr', true, {
      typ: 'gesetzlicherFeiertag',
      feiertagSchluessel: 'neujahr',
    });
    const sonderoeffnung = {
      ...createSondertag(
        'sonderoeffnung',
        'Sonderöffnung',
        true,
        { typ: 'jaehrlichFestesDatum', monat: 1, tag: 1 },
        'benutzer',
      ),
      oeffnungsregel: createGeoeffnet('09:00', '17:00'),
    };

    const [ersterJanuar] = createDienstplanKalendertage({
      monat: '2026-01',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage: [neujahr, sonderoeffnung],
      modellschichten: [
        createModellschicht('frueh', '07:00', '12:00'),
        createModellschicht('spaet', '12:00', '18:00'),
      ],
    });

    expect(ersterJanuar.rasterzeiten).toEqual([
      createRasterzeit('frueh', '09:00', '12:00'),
      createRasterzeit('spaet', '12:00', '17:00'),
    ]);
  });

  it('should adjust the outer raster times to an overnight opening rule with preparation', () => {
    const oeffnungsregel = createGeoeffnet('10:00', '01:00', true);
    const absoluteWochenregeln: TAbsoluteWochenregeln = {
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
      standardoeffnungsregel: oeffnungsregel,
      wochenregeln: createWochenregeln(absoluteWochenregeln),
      sondertage: [],
      modellschichten: [
        {
          ...createModellschicht('frueh', '08:00', '16:30'),
          vorbereitungsminuten: 30,
        },
        {
          ...createModellschicht('spaet', '16:30', '01:00'),
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

  it('should resolve inner start-day and following-day boundaries within an overnight opening', () => {
    const oeffnungsregel = createGeoeffnet('18:00', '01:00', true);
    const absoluteWochenregeln: TAbsoluteWochenregeln = {
      montag: oeffnungsregel,
      dienstag: oeffnungsregel,
      mittwoch: oeffnungsregel,
      donnerstag: oeffnungsregel,
      freitag: oeffnungsregel,
      samstag: oeffnungsregel,
      sonntag: oeffnungsregel,
    };
    const [ersterOktober] = createDienstplanKalendertage({
      monat: '2026-10',
      standardoeffnungsregel: oeffnungsregel,
      wochenregeln: createWochenregeln(absoluteWochenregeln),
      sondertage: [],
      modellschichten: [
        {
          id: 'frueh',
          reihenfolge: 0,
          ende: { lokalzeit: '22:00', tag: 'starttag' },
        },
        {
          id: 'nacht',
          reihenfolge: 1,
          beginn: { lokalzeit: '22:00', tag: 'starttag' },
          ende: { lokalzeit: '00:30', tag: 'folgetag' },
        },
        {
          id: 'spaet',
          reihenfolge: 2,
          beginn: { lokalzeit: '00:30', tag: 'folgetag' },
        },
      ],
    });

    expect(ersterOktober.rasterzeiten).toEqual([
      createRasterzeit('frueh', '18:00', '22:00'),
      createRasterzeit('nacht', '22:00', '00:30', true),
      createRasterzeit('spaet', '00:30', '01:00', true, true),
    ]);
  });

  it('should not provide raster times on a closed day', () => {
    const sonntag = createDienstplanKalendertage({
      monat: '2026-10',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage: [],
      modellschichten: [createModellschicht('frueh', '08:00', '16:30')],
    }).find((eintrag) => {
      return eintrag.datum === '2026-10-11';
    });

    expect(sonntag?.rasterzeiten).toEqual([]);
  });

  it('should omit only a model shift that does not fit a short opening day', () => {
    const oeffnungsregel = createGeoeffnet('08:00', '14:00');
    const absoluteWochenregeln: TAbsoluteWochenregeln = {
      montag: oeffnungsregel,
      dienstag: oeffnungsregel,
      mittwoch: oeffnungsregel,
      donnerstag: oeffnungsregel,
      freitag: oeffnungsregel,
      samstag: oeffnungsregel,
      sonntag: oeffnungsregel,
    };

    const [ersterOktober] = createDienstplanKalendertage({
      monat: '2026-10',
      standardoeffnungsregel: oeffnungsregel,
      wochenregeln: createWochenregeln(absoluteWochenregeln),
      sondertage: [],
      modellschichten: [
        createModellschicht('frueh', '08:00', '12:00'),
        createModellschicht('spaet', '16:30', '01:00'),
      ],
    });

    expect(ersterOktober.rasterzeiten).toEqual([createRasterzeit('frueh', '08:00', '12:00')]);
  });

  it('should keep an opened day without raster times when no model shift fits', () => {
    const oeffnungsregel = createGeoeffnet('08:00', '10:00');
    const absoluteWochenregeln: TAbsoluteWochenregeln = {
      montag: oeffnungsregel,
      dienstag: oeffnungsregel,
      mittwoch: oeffnungsregel,
      donnerstag: oeffnungsregel,
      freitag: oeffnungsregel,
      samstag: oeffnungsregel,
      sonntag: oeffnungsregel,
    };
    const [ersterOktober] = createDienstplanKalendertage({
      monat: '2026-10',
      standardoeffnungsregel: oeffnungsregel,
      wochenregeln: createWochenregeln(absoluteWochenregeln),
      sondertage: [],
      modellschichten: [
        createModellschicht('frueh', '08:00', '12:00'),
        createModellschicht('spaet', '16:30', '01:00'),
      ],
    });

    expect(ersterOktober.oeffnungsregel).toEqual(oeffnungsregel);
    expect(ersterOktober.rasterzeiten).toEqual([]);
  });

  it('should reject multiple active user-defined annual special days', () => {
    const sondertage = [
      createSondertag(
        'heiligabend',
        'Heiligabend',
        true,
        {
          typ: 'jaehrlichFestesDatum',
          monat: 12,
          tag: 24,
        },
        'benutzer',
      ),
      createSondertag(
        'jubilaeum',
        'Jubiläum',
        true,
        {
          typ: 'jaehrlichFestesDatum',
          monat: 12,
          tag: 24,
        },
        'benutzer',
      ),
    ];

    expect(() => {
      return createDienstplanKalendertage({
        monat: '2026-12',
        standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
        wochenregeln: WOCHENREGELN,
        sondertage,
      });
    }).toThrow('Für 2026-12-24 sind mehrere aktive benutzerdefinierte Sondertage konfiguriert');
  });

  it('should reject a missing raster time instead of deriving a fallback', () => {
    const [kalendertag] = createDienstplanKalendertage({
      monat: '2026-01',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage: [],
    });

    expect(() => getDienstplanRasterzeit(kalendertag, 'frueh')).toThrow(
      'Die Modellschicht ist an diesem Kalendertag nicht verfügbar.',
    );
  });
});

function createGeoeffnet(
  beginnLokalzeit: string,
  endeLokalzeit: string,
  endetAmFolgetag = false,
): IGeoeffneteOeffnungsregel {
  return { geoeffnet: true, beginnLokalzeit, endeLokalzeit, endetAmFolgetag };
}

function createWochenregeln(absoluteWochenregeln: TAbsoluteWochenregeln): TWochenregeln {
  return Object.fromEntries(
    Object.entries(absoluteWochenregeln).map(([wochentag, regel]) => {
      if (!regel.geoeffnet) return [wochentag, { modus: 'geschlossen' }];
      const istStandard =
        regel.beginnLokalzeit === STANDARDOEFFNUNGSREGEL.beginnLokalzeit &&
        regel.endeLokalzeit === STANDARDOEFFNUNGSREGEL.endeLokalzeit &&
        regel.endetAmFolgetag === STANDARDOEFFNUNGSREGEL.endetAmFolgetag;
      return [
        wochentag,
        istStandard ? { modus: 'standard' } : { modus: 'abweichend', oeffnungsregel: regel },
      ];
    }),
  ) as TWochenregeln;
}

function createSondertag(
  id: string,
  bezeichnung: string,
  aktiv: boolean,
  datumsregel: IFilialeinstellungSondertagEintrag['datumsregel'],
  herkunft: IFilialeinstellungSondertagEintrag['herkunft'] = 'system',
): IFilialeinstellungSondertagEintrag {
  return {
    id,
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    filialeId: 'b-1',
    bezeichnung,
    aktiv,
    herkunft,
    datumsregel,
    oeffnungsregel: createGeoeffnet('10:00', '16:00'),
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}

function createModellschicht(
  id: string,
  beginnLokalzeit: string,
  endeLokalzeit: string,
): IDienstplanRasterModellschicht {
  const basis = {
    id,
    reihenfolge: id === 'spaet' ? 1 : 0,
  };
  if (id === 'spaet') {
    return {
      ...basis,
      beginn: { lokalzeit: beginnLokalzeit, tag: 'starttag' },
    };
  }
  return {
    ...basis,
    ende: {
      lokalzeit: endeLokalzeit,
      tag: 'starttag',
    },
  };
}

function createRasterzeit(
  modellschichtId: string,
  beginnLokalzeit: string,
  endeLokalzeit: string,
  endetAmFolgetag = false,
  beginntAmFolgetag = false,
) {
  return {
    modellschichtId,
    beginnLokalzeit,
    endeLokalzeit,
    beginntAmFolgetag,
    endetAmFolgetag,
  };
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
