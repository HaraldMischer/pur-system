// pur-system/src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.spec.ts

import { Timestamp } from 'firebase/firestore';

import type {
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungSondertagEintrag,
  TOeffnungsregel,
  TWochenoeffnungszeiten,
} from '../../models/domain/filialeinstellung';
import { resolveOeffnungsregel } from './oeffnungsregel-aufloesung';

const GESCHLOSSEN: TOeffnungsregel = { geoeffnet: false };
const WOCHENREGELN: TWochenoeffnungszeiten = {
  montag: {
    geoeffnet: true,
    beginnLokalzeit: '07:00',
    endeLokalzeit: '01:00',
    endetAmFolgetag: true,
  },
  dienstag: createGeoeffnet('08:00', '18:00'),
  mittwoch: createGeoeffnet('08:00', '18:00'),
  donnerstag: createGeoeffnet('08:00', '18:00'),
  freitag: createGeoeffnet('08:00', '18:00'),
  samstag: createGeoeffnet('08:00', '14:00'),
  sonntag: GESCHLOSSEN,
};

describe('resolveOeffnungsregel', () => {
  it('should resolve the weekday rule including its complete overnight interval', () => {
    expect(
      resolveOeffnungsregel({
        datum: '2026-10-19',
        wochenregeln: WOCHENREGELN,
        sondertage: [],
        ausnahmen: [],
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
      wochenregeln: WOCHENREGELN,
      sondertage: [heiligabend],
      ausnahmen: [],
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
      wochenregeln: WOCHENREGELN,
      sondertage: [karfreitag],
      ausnahmen: [],
    });

    expect(ergebnis.quelle).toBe('sondertag');
    expect(ergebnis.bezeichnung).toBe('Karfreitag');
  });

  it('should prefer a date exception over matching special days', () => {
    const sondertage = [
      createSondertag('heiligabend', 'Heiligabend', {
        typ: 'jaehrlichFestesDatum',
        monat: 12,
        tag: 24,
      }),
      createSondertag('betriebsjubilaeum', 'Betriebsjubiläum', {
        typ: 'jaehrlichFestesDatum',
        monat: 12,
        tag: 24,
      }),
    ];
    const ausnahme = createAusnahme('2026-12-24', 'Sonderöffnung');

    const ergebnis = resolveOeffnungsregel({
      datum: '2026-12-24',
      wochenregeln: WOCHENREGELN,
      sondertage,
      ausnahmen: [ausnahme],
    });

    expect(ergebnis.quelle).toBe('ausnahme');
    expect(ergebnis.ausnahmeId).toBe('2026-12-24');
    expect(ergebnis.bezeichnung).toBe('Sonderöffnung');
    expect(ergebnis.aktiveSondertage).toEqual([
      { id: 'heiligabend', bezeichnung: 'Heiligabend' },
      { id: 'betriebsjubilaeum', bezeichnung: 'Betriebsjubiläum' },
    ]);
  });

  it('should reject multiple active special days on the same date', () => {
    const sondertage = [
      createSondertag('heiligabend', 'Heiligabend', {
        typ: 'jaehrlichFestesDatum',
        monat: 12,
        tag: 24,
      }),
      createSondertag('betriebsjubilaeum', 'Betriebsjubiläum', {
        typ: 'jaehrlichFestesDatum',
        monat: 12,
        tag: 24,
      }),
    ];

    expect(() =>
      resolveOeffnungsregel({
        datum: '2026-12-24',
        wochenregeln: WOCHENREGELN,
        sondertage,
        ausnahmen: [],
      }),
    ).toThrow(
      'Für 2026-12-24 sind mehrere aktive Sondertage konfiguriert: Heiligabend, Betriebsjubiläum.',
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
        wochenregeln: WOCHENREGELN,
        sondertage: [heiligabend],
        ausnahmen: [],
      }).quelle,
    ).toBe('wochentag');
  });

  it.each(['2026-02-30', '2026-2-03', ''])('should reject the invalid date %s', (datum) => {
    expect(() =>
      resolveOeffnungsregel({
        datum,
        wochenregeln: WOCHENREGELN,
        sondertage: [],
        ausnahmen: [],
      }),
    ).toThrow();
  });

  it('should reject an incomplete weekday configuration instead of assuming an opening rule', () => {
    const unvollstaendigeWochenregeln = {
      ...WOCHENREGELN,
      montag: undefined,
    } as unknown as TWochenoeffnungszeiten;

    expect(() => {
      return resolveOeffnungsregel({
        datum: '2026-10-19',
        wochenregeln: unvollstaendigeWochenregeln,
        sondertage: [],
        ausnahmen: [],
      });
    }).toThrow('Für montag ist keine Öffnungsregel konfiguriert.');
  });
});

function createGeoeffnet(beginnLokalzeit: string, endeLokalzeit: string): TOeffnungsregel {
  return {
    geoeffnet: true,
    beginnLokalzeit,
    endeLokalzeit,
    endetAmFolgetag: false,
  };
}

function createSondertag(
  id: string,
  bezeichnung: string,
  datumsregel: IFilialeinstellungSondertagEintrag['datumsregel'],
): IFilialeinstellungSondertagEintrag {
  return {
    id,
    unternehmerId: 'unternehmer-1',
    firmaId: 'firma-1',
    filialeId: 'filiale-1',
    bezeichnung,
    aktiv: true,
    herkunft: 'system',
    datumsregel,
    oeffnungsregel: GESCHLOSSEN,
    erstelltAm: Timestamp.fromMillis(0),
    erstelltVonUid: 'master-1',
    aktualisiertAm: Timestamp.fromMillis(0),
    aktualisiertVonUid: 'master-1',
  };
}

function createAusnahme(datum: string, bezeichnung: string): IFilialeinstellungAusnahmeEintrag {
  return {
    id: datum,
    unternehmerId: 'unternehmer-1',
    firmaId: 'firma-1',
    filialeId: 'filiale-1',
    datum,
    bezeichnung,
    oeffnungsregel: createGeoeffnet('10:00', '14:00'),
    erstelltAm: Timestamp.fromMillis(0),
    erstelltVonUid: 'master-1',
    aktualisiertAm: Timestamp.fromMillis(0),
    aktualisiertVonUid: 'master-1',
  };
}
