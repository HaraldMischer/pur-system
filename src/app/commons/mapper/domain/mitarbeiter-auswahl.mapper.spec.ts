// pur-system/src/app/commons/mapper/domain/mitarbeiter-auswahl.mapper.spec.ts

import { mapMitarbeiterAuswahl } from './mitarbeiter-auswahl.mapper';

describe('Mitarbeiter-Auswahl-Mapper', () => {
  it('should return sorted active and unlinked employees with complete names', () => {
    expect(
      mapMitarbeiterAuswahl([
        {
          id: 'm-z',
          daten: { aktiv: true, person: { vorname: ' Zoe ', nachname: ' Zimmer ' } },
        },
        {
          id: 'm-a',
          daten: {
            aktiv: true,
            benutzerUid: '',
            person: { vorname: ' Anton ', nachname: ' Alpha ' },
          },
        },
        {
          id: 'm-inaktiv',
          daten: { aktiv: false, person: { vorname: 'Ina', nachname: 'Inaktiv' } },
        },
        {
          id: 'm-verknuepft',
          daten: {
            aktiv: true,
            benutzerUid: 'uid-1',
            person: { vorname: 'Vera', nachname: 'Verknüpft' },
          },
        },
        { id: 'm-unvollstaendig', daten: { aktiv: true, person: { vorname: 'Nur' } } },
      ]),
    ).toEqual([
      { id: 'm-a', anzeigename: 'Alpha, Anton' },
      { id: 'm-z', anzeigename: 'Zimmer, Zoe' },
    ]);
  });
});
