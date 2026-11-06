// pur-system/src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.spec.ts

import { Timestamp } from 'firebase/firestore';

import type {
  IFilialeinstellungSondertagEintrag,
  IGeoeffneteOeffnungsregel,
  TOeffnungsregel,
  TWochenregeln,
} from '../../models/domain/filialeinstellung';
import { resolveOeffnungsregel } from './oeffnungsregel-aufloesung';

const GESCHLOSSEN: TOeffnungsregel = { geoeffnet: false };
const STANDARDOEFFNUNGSREGEL = createGeoeffnet('08:00', '18:00');
const WOCHENREGELN: TWochenregeln = {
  montag: { modus: 'abweichend', oeffnungsregel: createGeoeffnet('07:00', '01:00') },
  dienstag: { modus: 'standard' },
  mittwoch: { modus: 'standard' },
  donnerstag: { modus: 'standard' },
  freitag: { modus: 'standard' },
  samstag: { modus: 'abweichend', oeffnungsregel: createGeoeffnet('08:00', '14:00') },
  sonntag: { modus: 'geschlossen' },
};

describe('resolveOeffnungsregel', () => {
  it('should apply a changed standard only to inheriting weekdays', () => {
    const geaenderterStandard = createGeoeffnet('09:00', '17:00');
    const dienstag = resolveOeffnungsregel({
      datum: '2026-10-20',
      standardoeffnungsregel: geaenderterStandard,
      wochenregeln: WOCHENREGELN,
      sondertage: [],
    });
    const montag = resolveOeffnungsregel({
      datum: '2026-10-19',
      standardoeffnungsregel: geaenderterStandard,
      wochenregeln: WOCHENREGELN,
      sondertage: [],
    });

    expect(dienstag.oeffnungsregel).toEqual(geaenderterStandard);
    expect(montag.oeffnungsregel).toEqual(createGeoeffnet('07:00', '01:00'));
  });

  it('should resolve the weekday rule including its complete overnight interval', () => {
    expect(
      resolveOeffnungsregel({
        datum: '2026-10-19',
        standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
        wochenregeln: WOCHENREGELN,
        sondertage: [],
      }),
    ).toEqual({
      datum: '2026-10-19',
      wochentag: 'montag',
      aktiveSondertage: [],
      quelle: 'wochentag',
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '07:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
  });

  it('should prefer an active fixed special day over the weekday rule', () => {
    const heiligabend = createSondertag('heiligabend', 'Heiligabend', {
      typ: 'jaehrlichFestesDatum',
      monat: 12,
      tag: 24,
    });

    const ergebnis = resolveOeffnungsregel({
      datum: '2026-12-24',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage: [heiligabend],
    });

    expect(ergebnis.quelle).toBe('sondertag');
    expect(ergebnis.sondertagId).toBe('heiligabend');
    expect(ergebnis.oeffnungsregel).toEqual(GESCHLOSSEN);
  });

  it('should resolve a calculated statutory holiday', () => {
    const karfreitag = createSondertag('karfreitag', 'Karfreitag', {
      typ: 'gesetzlicherFeiertag',
      feiertagSchluessel: 'karfreitag',
    });

    const ergebnis = resolveOeffnungsregel({
      datum: '2026-04-03',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage: [karfreitag],
    });

    expect(ergebnis.quelle).toBe('sondertag');
    expect(ergebnis.bezeichnung).toBe('Karfreitag');
  });

  it('should resolve a calculated system special day', () => {
    const volkstrauertag = {
      ...createSondertag('volkstrauertag', 'Volkstrauertag', {
        typ: 'berechneterSondertag' as const,
        sondertagSchluessel: 'volkstrauertag' as const,
      }),
      modus: 'abweichend' as const,
      oeffnungsregel: createGeoeffnet('13:00', '01:00'),
    };

    const ergebnis = resolveOeffnungsregel({
      datum: '2026-11-15',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage: [volkstrauertag],
    });

    expect(ergebnis).toMatchObject({
      wochentag: 'sonntag',
      quelle: 'sondertag',
      sondertagId: 'volkstrauertag',
      oeffnungsregel: createGeoeffnet('13:00', '01:00'),
    });
  });

  it('should use the general standard opening for a statutory holiday in standard mode', () => {
    const neujahr = {
      ...createSondertag('neujahr', 'Neujahr', {
        typ: 'gesetzlicherFeiertag' as const,
        feiertagSchluessel: 'neujahr' as const,
      }),
      aktiv: false,
      modus: 'standard' as const,
    };

    const ergebnis = resolveOeffnungsregel({
      datum: '2026-01-01',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: {
        ...WOCHENREGELN,
        donnerstag: { modus: 'geschlossen' },
      },
      sondertage: [neujahr],
    });

    expect(ergebnis).toMatchObject({
      wochentag: 'donnerstag',
      quelle: 'wochentag',
      oeffnungsregel: STANDARDOEFFNUNGSREGEL,
      gesetzlicherFeiertag: { schluessel: 'neujahr', bezeichnung: 'Neujahr' },
    });
  });

  it('should resolve a statutory holiday like the current Sunday opening', () => {
    const sonntagsregel = createGeoeffnet('10:00', '01:00');
    const neujahr = {
      ...createSondertag('neujahr', 'Neujahr', {
        typ: 'gesetzlicherFeiertag' as const,
        feiertagSchluessel: 'neujahr' as const,
      }),
      modus: 'wieSonntag' as const,
    };

    const ergebnis = resolveOeffnungsregel({
      datum: '2026-01-01',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: {
        ...WOCHENREGELN,
        sonntag: { modus: 'abweichend', oeffnungsregel: sonntagsregel },
      },
      sondertage: [neujahr],
    });

    expect(ergebnis).toMatchObject({
      quelle: 'sonntag',
      sondertagId: 'neujahr',
      bezeichnung: 'Neujahr',
      oeffnungsregel: sonntagsregel,
      gesetzlicherFeiertag: { schluessel: 'neujahr', bezeichnung: 'Neujahr' },
    });
  });

  it('should prefer a user-defined annual special day over a system special day', () => {
    const sondertage = [
      createSondertag('heiligabend', 'Heiligabend', {
        typ: 'jaehrlichFestesDatum',
        monat: 12,
        tag: 24,
      }),
      createSondertag(
        'betriebsjubilaeum',
        'Betriebsjubiläum',
        {
          typ: 'jaehrlichFestesDatum',
          monat: 12,
          tag: 24,
        },
        'benutzer',
      ),
    ];

    const ergebnis = resolveOeffnungsregel({
      datum: '2026-12-24',
      standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
      wochenregeln: WOCHENREGELN,
      sondertage,
    });

    expect(ergebnis.quelle).toBe('sondertag');
    expect(ergebnis.sondertagId).toBe('betriebsjubilaeum');
    expect(ergebnis.bezeichnung).toBe('Betriebsjubiläum');
    expect(ergebnis.aktiveSondertage).toEqual([
      { id: 'heiligabend', bezeichnung: 'Heiligabend' },
      { id: 'betriebsjubilaeum', bezeichnung: 'Betriebsjubiläum' },
    ]);
  });

  it('should reject multiple active special days on the same date', () => {
    const sondertage = [
      createSondertag(
        'heiligabend',
        'Heiligabend',
        {
          typ: 'jaehrlichFestesDatum',
          monat: 12,
          tag: 24,
        },
        'benutzer',
      ),
      createSondertag(
        'betriebsjubilaeum',
        'Betriebsjubiläum',
        {
          typ: 'jaehrlichFestesDatum',
          monat: 12,
          tag: 24,
        },
        'benutzer',
      ),
    ];

    expect(() =>
      resolveOeffnungsregel({
        datum: '2026-12-24',
        standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
        wochenregeln: WOCHENREGELN,
        sondertage,
      }),
    ).toThrow(
      'Für 2026-12-24 sind mehrere aktive benutzerdefinierte Sondertage konfiguriert: Heiligabend, Betriebsjubiläum.',
    );
  });

  it('should ignore inactive special days', () => {
    const heiligabend = {
      ...createSondertag('heiligabend', 'Heiligabend', {
        typ: 'jaehrlichFestesDatum',
        monat: 12,
        tag: 24,
      }),
      aktiv: false,
    };

    expect(
      resolveOeffnungsregel({
        datum: '2026-12-24',
        standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
        wochenregeln: WOCHENREGELN,
        sondertage: [heiligabend],
      }).quelle,
    ).toBe('wochentag');
  });

  it.each(['2026-02-30', '2026-2-03', ''])('should reject the invalid date %s', (datum) => {
    expect(() =>
      resolveOeffnungsregel({
        datum,
        standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
        wochenregeln: WOCHENREGELN,
        sondertage: [],
      }),
    ).toThrow();
  });

  it('should reject an incomplete weekday configuration instead of assuming an opening rule', () => {
    const unvollstaendigeWochenregeln = {
      ...WOCHENREGELN,
      montag: undefined,
    } as unknown as TWochenregeln;

    expect(() => {
      return resolveOeffnungsregel({
        datum: '2026-10-19',
        standardoeffnungsregel: STANDARDOEFFNUNGSREGEL,
        wochenregeln: unvollstaendigeWochenregeln,
        sondertage: [],
      });
    }).toThrow('Für montag ist keine Öffnungsregel konfiguriert.');
  });
});

function createGeoeffnet(
  beginnLokalzeit: string,
  endeLokalzeit: string,
): IGeoeffneteOeffnungsregel {
  return {
    geoeffnet: true,
    beginnLokalzeit,
    endeLokalzeit,
    endetAmFolgetag: endeLokalzeit < beginnLokalzeit,
  };
}

function createSondertag(
  id: string,
  bezeichnung: string,
  datumsregel: IFilialeinstellungSondertagEintrag['datumsregel'],
  herkunft: IFilialeinstellungSondertagEintrag['herkunft'] = 'system',
): IFilialeinstellungSondertagEintrag {
  return {
    id,
    unternehmerId: 'unternehmer-1',
    firmaId: 'firma-1',
    filialeId: 'filiale-1',
    bezeichnung,
    aktiv: true,
    herkunft,
    datumsregel,
    oeffnungsregel: GESCHLOSSEN,
    erstelltAm: Timestamp.fromMillis(0),
    erstelltVonUid: 'master-1',
    aktualisiertAm: Timestamp.fromMillis(0),
    aktualisiertVonUid: 'master-1',
  };
}
