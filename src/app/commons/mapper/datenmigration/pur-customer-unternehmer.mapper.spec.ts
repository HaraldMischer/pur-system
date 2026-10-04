// pur-system/src/app/commons/mapper/datenmigration/pur-customer-unternehmer.mapper.spec.ts

import { EGender } from '../../models/domain/person';
import { IPurCustomerEintrag } from '../../models/legacy/pur-customer';
import { mapPurCustomerToUnternehmer } from './pur-customer-unternehmer.mapper';

describe('mapPurCustomerToUnternehmer', () => {
  const purCustomer: IPurCustomerEintrag = {
    id: 'kunde-1',
    anzeigename: 'Kunde Nord',
    daten: {
      id: 'kunde-1',
      displayName: ' Kunde Nord ',
      firstName: ' Mara ',
      lastName: ' Muster ',
      person: {
        birthday: ' 1980-01-02 ',
        gender: EGender.FEMALE,
      },
      address: {
        city: ' Hamburg ',
        postcode: ' 20095 ',
        street: ' Musterstraße 12 a ',
      },
      contact: {
        email: ' mara@example.com ',
        landline: ' 040 123456 ',
        mobile: ' 0170 123456 ',
      },
    },
  };

  it('should map and normalize all supported entrepreneur fields', () => {
    expect(mapPurCustomerToUnternehmer(purCustomer, 7)).toEqual({
      daten: {
        anzeigename: 'Mara Muster',
        nummer: 7,
        aktiv: true,
        person: {
          vorname: 'Mara',
          nachname: 'Muster',
          adresse: {
            strasse: 'Musterstraße',
            hausnummer: '12a',
            postleitzahl: '20095',
            ort: 'Hamburg',
          },
          kontakt: {
            email: 'mara@example.com',
            telefon: '040 123456',
            mobil: '0170 123456',
          },
          geburtstag: '1980-01-02',
          geschlecht: EGender.FEMALE,
        },
      },
      probleme: [],
    });
  });

  it('should map a partial optional address without requiring a house number', () => {
    const ergebnis = mapPurCustomerToUnternehmer(
      {
        ...purCustomer,
        daten: {
          ...purCustomer.daten,
          address: { street: ' Musterstraße ' },
        },
      },
      7,
    );

    expect(ergebnis.probleme).toEqual([]);
    expect(ergebnis.daten?.person.adresse).toEqual({ strasse: 'Musterstraße' });
  });

  it('should omit an entirely empty optional address', () => {
    const ergebnis = mapPurCustomerToUnternehmer(
      {
        ...purCustomer,
        daten: {
          ...purCustomer.daten,
          address: {},
        },
      },
      7,
    );

    expect(ergebnis.probleme).toEqual([]);
    expect(ergebnis.daten?.person.adresse).toBeUndefined();
  });

  it('should report every unsupported or missing mandatory source value', () => {
    const ergebnis = mapPurCustomerToUnternehmer(
      {
        ...purCustomer,
        daten: {
          id: 'andere-id',
          displayName: ' ',
          person: {},
          address: { addressName: 'Hinterhaus' },
        },
      },
      7,
    );

    expect(ergebnis.daten).toBeNull();
    expect(ergebnis.probleme.map((problem) => problem.ursache)).toEqual([
      'Die eingebettete Kunden-ID weicht vom Quellpfad ab.',
      'Der Anzeigename fehlt.',
      'Der Vorname fehlt.',
      'Der Nachname fehlt.',
      'Der vorhandene Adresszusatz besitzt noch kein festgelegtes Zielfeld.',
    ]);
  });

});
