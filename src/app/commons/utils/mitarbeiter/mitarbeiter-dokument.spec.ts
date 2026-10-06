// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-dokument.spec.ts

import { IMitarbeiterEintrag } from '../../models/domain/mitarbeiter';
import { EGender, IPerson } from '../../models/domain/person';
import {
  createAnzeigename,
  createMitarbeiterPerson,
  mapMitarbeiterEintrag,
  sortMitarbeiter,
} from './mitarbeiter-dokument';

describe('Mitarbeiter-Dokument-Utilities', () => {
  const person: IPerson = {
    vorname: ' Mia ',
    nachname: ' Muster ',
    adresse: {
      strasse: 'Musterstraße',
      hausnummer: '1',
      postleitzahl: '12345',
      ort: 'Musterstadt',
    },
    kontakt: { email: 'mia@example.com' },
  };

  it('should normalize a Firestore employee entry', () => {
    expect(
      mapMitarbeiterEintrag('u-1', 'f-1', 'm-1', {
        person: {
          ...person,
          kontakt: { email: ' mia@example.com ', mobil: '', unbekannt: 'wert' },
          geschlecht: EGender.FEMALE,
        },
        rolle: 'unbekannt',
        filialIds: [' b-1 ', 'b-1', '', null],
        aktiv: true,
      }),
    ).toEqual({
      id: 'm-1',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      person: {
        vorname: 'Mia',
        nachname: 'Muster',
        adresse: person.adresse,
        kontakt: { email: 'mia@example.com' },
        geschlecht: EGender.FEMALE,
      },
      rollen: ['servicekraft'],
      filialIds: ['b-1'],
      aktiv: true,
    });
  });

  it('should create the display name and supported person data', () => {
    expect(createAnzeigename(person)).toBe('Mia Muster');
    expect(
      createMitarbeiterPerson({
        ...person,
        geburtstag: '1990-01-02',
        geschlecht: EGender.DIVERSE,
      }),
    ).toEqual({
      ...person,
      geburtstag: '1990-01-02',
      geschlecht: EGender.DIVERSE,
    });
  });

  it('should read the previous scalar role format compatibly', () => {
    expect(
      mapMitarbeiterEintrag('u-1', 'f-1', 'm-1', {
        person,
        rolle: 'kasse',
        filialIds: [],
        aktiv: true,
      }).rollen,
    ).toEqual(['filialkasse']);
  });

  it('should sort employees by last name and first name without changing the input', () => {
    const zulu: IMitarbeiterEintrag = {
      id: 'z',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      person: { ...person, vorname: 'Zoe', nachname: 'Zulu' },
      rollen: ['servicekraft'],
      filialIds: [],
      aktiv: true,
    };
    const alpha: IMitarbeiterEintrag = {
      ...zulu,
      id: 'a',
      person: { ...person, vorname: 'Anton', nachname: 'Alpha' },
    };
    const eingabe = [zulu, alpha];

    expect(sortMitarbeiter(eingabe)).toEqual([alpha, zulu]);
    expect(eingabe).toEqual([zulu, alpha]);
  });
});
