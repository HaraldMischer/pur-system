// pur-system/src/app/commons/utils/filialeinstellung/feiertag.spec.ts

import {
  createInitialeSondertage,
  getBerechneterSondertagDatum,
  getGesetzlicheFeiertage,
  getGesetzlicherFeiertagDatum,
  getGesetzlicherFeiertagKatalogeintrag,
  reconcileInitialeSondertage,
} from './feiertag';

const OEFFNUNGSRAHMEN = {
  geoeffnet: true as const,
  beginnLokalzeit: '06:00',
  endeLokalzeit: '01:00',
  endetAmFolgetag: true,
};

describe('Feiertagsauflösung', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2038, '2038-04-25'],
  ])('should calculate Easter Sunday for %s', (jahr, erwartetesDatum) => {
    expect(getGesetzlicherFeiertagDatum(jahr, 'ostersonntag')).toBe(erwartetesDatum);
  });

  it.each([
    [2022, '2022-11-13', '2022-11-20'],
    [2024, '2024-11-17', '2024-11-24'],
    [2026, '2026-11-15', '2026-11-22'],
    [2023, '2023-11-19', '2023-11-26'],
  ])(
    'should calculate memorial Sundays for %s',
    (jahr, erwarteterVolkstrauertag, erwarteterTotensonntag) => {
      expect(getBerechneterSondertagDatum(jahr, 'volkstrauertag')).toBe(erwarteterVolkstrauertag);
      expect(getBerechneterSondertagDatum(jahr, 'totensonntag')).toBe(erwarteterTotensonntag);
    },
  );

  it.each([
    ['karfreitag', '2026-04-03'],
    ['ostersonntag', '2026-04-05'],
    ['ostermontag', '2026-04-06'],
    ['christiHimmelfahrt', '2026-05-14'],
    ['pfingstsonntag', '2026-05-24'],
    ['pfingstmontag', '2026-05-25'],
    ['fronleichnam', '2026-06-04'],
    ['bussUndBettag', '2026-11-18'],
  ] as const)('should calculate %s for 2026', (schluessel, erwartetesDatum) => {
    expect(getGesetzlicherFeiertagDatum(2026, schluessel)).toBe(erwartetesDatum);
  });

  it('should include nationwide and North Rhine-Westphalia holidays in chronological order', () => {
    const feiertage = getGesetzlicheFeiertage(2026, 'DE-NW');

    expect(feiertage.map((feiertag) => feiertag.schluessel)).toEqual([
      'neujahr',
      'karfreitag',
      'ostermontag',
      'tagDerArbeit',
      'christiHimmelfahrt',
      'pfingstmontag',
      'fronleichnam',
      'tagDerDeutschenEinheit',
      'allerheiligen',
      'ersterWeihnachtstag',
      'zweiterWeihnachtstag',
    ]);
  });

  it('should include Easter and Pentecost Sunday only automatically for Brandenburg', () => {
    const brandenburg = getGesetzlicheFeiertage(2026, 'DE-BB').map((feiertag) => {
      return feiertag.schluessel;
    });
    const berlin = getGesetzlicheFeiertage(2026, 'DE-BE').map((feiertag) => {
      return feiertag.schluessel;
    });

    expect(brandenburg).toContain('ostersonntag');
    expect(brandenburg).toContain('pfingstsonntag');
    expect(berlin).not.toContain('ostersonntag');
    expect(berlin).not.toContain('pfingstsonntag');
  });

  it('should apply state-specific holidays only in their configured states', () => {
    const berlin = getGesetzlicheFeiertage(2026, 'DE-BE').map((feiertag) => {
      return feiertag.schluessel;
    });
    const thueringen = getGesetzlicheFeiertage(2026, 'DE-TH').map((feiertag) => {
      return feiertag.schluessel;
    });
    const nordrheinWestfalen = getGesetzlicheFeiertage(2026, 'DE-NW').map((feiertag) => {
      return feiertag.schluessel;
    });

    expect(berlin).toContain('internationalerFrauentag');
    expect(thueringen).toContain('weltkindertag');
    expect(nordrheinWestfalen).not.toContain('internationalerFrauentag');
    expect(nordrheinWestfalen).not.toContain('weltkindertag');
  });

  it('should resolve fixed holidays independently across a year boundary', () => {
    const dezember2026 = getGesetzlicheFeiertage(2026, 'DE-NW');
    const januar2027 = getGesetzlicheFeiertage(2027, 'DE-NW');

    expect(dezember2026.at(-1)).toEqual({
      schluessel: 'zweiterWeihnachtstag',
      bezeichnung: '2. Weihnachtstag',
      datum: '2026-12-26',
    });
    expect(januar2027[0]).toEqual({
      schluessel: 'neujahr',
      bezeichnung: 'Neujahr',
      datum: '2027-01-01',
    });
  });

  it('should handle the one-time Berlin holiday only in 2028', () => {
    expect(getGesetzlicherFeiertagDatum(2027, 'aufstand17Juni2028')).toBeNull();
    expect(getGesetzlicherFeiertagDatum(2028, 'aufstand17Juni2028')).toBe('2028-06-17');
    expect(
      getGesetzlicheFeiertage(2028, 'DE-BE').find((feiertag) => {
        return feiertag.schluessel === 'aufstand17Juni2028';
      }),
    ).toEqual({
      schluessel: 'aufstand17Juni2028',
      bezeichnung: '75. Jahrestag des Aufstands vom 17. Juni 1953',
      datum: '2028-06-17',
    });
  });

  it('should not automatically apply municipality-specific holidays from the state alone', () => {
    const bayern = getGesetzlicheFeiertage(2026, 'DE-BY').map((feiertag) => {
      return feiertag.schluessel;
    });
    const friedensfest = getGesetzlicherFeiertagKatalogeintrag('augsburgerFriedensfest');
    const mariaHimmelfahrt = getGesetzlicherFeiertagKatalogeintrag('mariaHimmelfahrt');

    expect(bayern).not.toContain('augsburgerFriedensfest');
    expect(bayern).not.toContain('mariaHimmelfahrt');
    expect(friedensfest.lokalBegrenzteBundeslaender).toEqual(['DE-BY']);
    expect(mariaHimmelfahrt.lokalBegrenzteBundeslaender).toEqual(['DE-BY']);
  });

  it('should distinguish fixed and calculated holiday dates', () => {
    expect(getGesetzlicherFeiertagKatalogeintrag('tagDerDeutschenEinheit').datumsart).toBe('fest');
    expect(getGesetzlicherFeiertagKatalogeintrag('karfreitag').datumsart).toBe('berechnet');
  });

  it('should create statutory holidays and system-defined annual special days', () => {
    const sondertage = createInitialeSondertage('DE-NW', OEFFNUNGSRAHMEN);
    const heiligabend = sondertage.find((sondertag) => {
      return sondertag.id === 'heiligabend';
    });
    const silvester = sondertage.find((sondertag) => {
      return sondertag.id === 'silvester';
    });
    const volkstrauertag = sondertage.find((sondertag) => {
      return sondertag.id === 'volkstrauertag';
    });
    const totensonntag = sondertage.find((sondertag) => {
      return sondertag.id === 'totensonntag';
    });
    const karfreitag = sondertage.find((sondertag) => {
      return sondertag.id === 'karfreitag';
    });
    const allerheiligen = sondertage.find((sondertag) => {
      return sondertag.id === 'allerheiligen';
    });

    expect(sondertage.every((sondertag) => sondertag.herkunft === 'system')).toBe(true);
    expect(
      sondertage
        .filter((sondertag) => {
          return (
            sondertag.datumsregel.typ === 'gesetzlicherFeiertag' &&
            sondertag.id !== 'karfreitag' &&
            sondertag.id !== 'allerheiligen'
          );
        })
        .every((sondertag) => {
          return sondertag.aktiv && sondertag.modus === 'wieSonntag';
        }),
    ).toBe(true);
    expect(karfreitag).toMatchObject({
      aktiv: true,
      modus: 'geschlossen',
      oeffnungsregel: { geoeffnet: false },
    });
    expect(allerheiligen).toMatchObject({
      aktiv: true,
      modus: 'abweichend',
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '18:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
    expect(heiligabend).toMatchObject({
      aktiv: true,
      modus: 'abweichend',
      datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '06:00',
        endeLokalzeit: '16:00',
        endetAmFolgetag: false,
      },
    });
    expect(silvester).toMatchObject({
      aktiv: true,
      modus: 'abweichend',
      datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 31 },
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '06:00',
        endeLokalzeit: '16:00',
        endetAmFolgetag: false,
      },
    });
    expect(volkstrauertag).toMatchObject({
      aktiv: true,
      modus: 'abweichend',
      datumsregel: {
        typ: 'berechneterSondertag',
        sondertagSchluessel: 'volkstrauertag',
      },
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '13:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
    expect(totensonntag).toMatchObject({
      aktiv: true,
      modus: 'abweichend',
      datumsregel: {
        typ: 'berechneterSondertag',
        sondertagSchluessel: 'totensonntag',
      },
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '18:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
    const hessen = createInitialeSondertage('DE-HE', OEFFNUNGSRAHMEN);
    expect(hessen).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'volkstrauertag' }),
        expect.objectContaining({ id: 'totensonntag' }),
      ]),
    );
    expect(
      hessen.every((sondertag) => {
        return !sondertag.aktiv && sondertag.modus === undefined;
      }),
    ).toBe(true);
  });

  it('should close Christmas Eve and New Years Eve when the standard opens at 16:00 or later', () => {
    const sondertage = createInitialeSondertage('DE-NW', {
      ...OEFFNUNGSRAHMEN,
      beginnLokalzeit: '16:00',
    });

    expect(
      sondertage.filter((sondertag) => {
        return sondertag.id === 'heiligabend' || sondertag.id === 'silvester';
      }),
    ).toEqual([
      expect.objectContaining({
        aktiv: true,
        modus: 'geschlossen',
        oeffnungsregel: { geoeffnet: false },
      }),
      expect.objectContaining({
        aktiv: true,
        modus: 'geschlossen',
        oeffnungsregel: { geoeffnet: false },
      }),
    ]);
  });

  it('should reconcile state holidays while preserving existing and user-defined special days', () => {
    const nordrheinWestfalen = createInitialeSondertage('DE-NW', OEFFNUNGSRAHMEN).map(
      (sondertag) => {
        return sondertag.id === 'fronleichnam'
          ? {
              ...sondertag,
              oeffnungsregel: {
                geoeffnet: true as const,
                beginnLokalzeit: '10:00',
                endeLokalzeit: '14:00',
                endetAmFolgetag: false,
              },
            }
          : sondertag;
      },
    );
    const eigenerSondertag = {
      id: 'jubilaeum',
      bezeichnung: 'Jubiläum',
      aktiv: true,
      herkunft: 'benutzer' as const,
      datumsregel: {
        typ: 'jaehrlichFestesDatum' as const,
        monat: 7,
        tag: 1,
      },
      oeffnungsregel: {
        geoeffnet: false as const,
      },
    };

    const abgeglichen = reconcileInitialeSondertage(
      [...nordrheinWestfalen, eigenerSondertag],
      'DE-HE',
      OEFFNUNGSRAHMEN,
    );

    expect(
      abgeglichen.find((sondertag) => {
        return sondertag.id === 'fronleichnam';
      })?.oeffnungsregel,
    ).toEqual({
      geoeffnet: true,
      beginnLokalzeit: '10:00',
      endeLokalzeit: '14:00',
      endetAmFolgetag: false,
    });
    expect(
      abgeglichen.some((sondertag) => {
        return sondertag.id === 'allerheiligen';
      }),
    ).toBe(false);
    expect(
      abgeglichen.some((sondertag) => {
        return sondertag.id === 'volkstrauertag' || sondertag.id === 'totensonntag';
      }),
    ).toBe(false);
    expect(abgeglichen).toContain(eigenerSondertag);
  });

  it('should add newly applicable state holidays as inactive', () => {
    const hessen = createInitialeSondertage('DE-HE', OEFFNUNGSRAHMEN);

    const abgeglichen = reconcileInitialeSondertage(hessen, 'DE-BW', OEFFNUNGSRAHMEN);

    expect(
      abgeglichen.find((sondertag) => {
        return sondertag.id === 'heiligeDreiKoenige';
      }),
    ).toMatchObject({
      aktiv: false,
      oeffnungsregel: {
        geoeffnet: false,
        beginnLokalzeit: '06:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
  });

  it.each([1582, 10.5, 10_000])('should reject the invalid year %s', (jahr) => {
    expect(() => {
      return getGesetzlicheFeiertage(jahr, 'DE-NW');
    }).toThrow('Das Feiertagsjahr muss eine ganze Zahl zwischen 1583 und 9999 sein.');
  });
});
