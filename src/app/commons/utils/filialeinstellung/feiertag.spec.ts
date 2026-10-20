// pur-system/src/app/commons/utils/filialeinstellung/feiertag.spec.ts

import {
  createInitialeSondertage,
  getGesetzlicheFeiertage,
  getGesetzlicherFeiertagDatum,
  getGesetzlicherFeiertagKatalogeintrag,
  reconcileInitialeSondertage,
} from './feiertag';

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

  it('should create inactive initial holidays including Christmas Eve and New Years Eve', () => {
    const sondertage = createInitialeSondertage('DE-NW');
    const heiligabend = sondertage.find((sondertag) => {
      return sondertag.id === 'heiligabend';
    });
    const silvester = sondertage.find((sondertag) => {
      return sondertag.id === 'silvester';
    });

    expect(sondertage.every((sondertag) => !sondertag.aktiv)).toBe(true);
    expect(sondertage.every((sondertag) => sondertag.herkunft === 'system')).toBe(true);
    expect(sondertage.every((sondertag) => !sondertag.oeffnungsregel.geoeffnet)).toBe(true);
    expect(heiligabend?.datumsregel).toEqual({
      typ: 'jaehrlichFestesDatum',
      monat: 12,
      tag: 24,
    });
    expect(silvester?.datumsregel).toEqual({
      typ: 'jaehrlichFestesDatum',
      monat: 12,
      tag: 31,
    });
  });

  it('should reconcile state holidays while preserving existing and user-defined special days', () => {
    const nordrheinWestfalen = createInitialeSondertage('DE-NW').map((sondertag) => {
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
    });
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
    expect(abgeglichen).toContain(eigenerSondertag);
  });

  it('should add newly applicable state holidays as inactive', () => {
    const hessen = createInitialeSondertage('DE-HE');

    const abgeglichen = reconcileInitialeSondertage(hessen, 'DE-BW');

    expect(
      abgeglichen.find((sondertag) => {
        return sondertag.id === 'heiligeDreiKoenige';
      })?.aktiv,
    ).toBe(false);
  });

  it.each([1582, 10.5, 10_000])('should reject the invalid year %s', (jahr) => {
    expect(() => {
      return getGesetzlicheFeiertage(jahr, 'DE-NW');
    }).toThrow('Das Feiertagsjahr muss eine ganze Zahl zwischen 1583 und 9999 sein.');
  });
});
