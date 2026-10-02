// pur-system/src/app/commons/mapper/datenmigration/pur-company-firma.mapper.spec.ts

import { IPurCompanyEintrag } from '../../models/legacy/pur-company';
import { entsprichtFirmaMigration, mapPurCompanyToFirma } from './pur-company-firma.mapper';

describe('PurCompany-Firma-Mapper', () => {
  const purCompany: IPurCompanyEintrag = {
    id: 'firma-alt',
    daten: {
      active: true,
      activeDate: '',
      address: {
        city: 'Bochum',
        postcode: 12345,
        street: 'Straße 99',
      },
      addressName: 'Address-Name',
      companyName: ' Test Firma ',
      companyNumber: 1,
      company_ID: 'firma-alt',
      email: ' info@example.com ',
      phone: {
        fax: '0234 000000',
        fixedLineNumber: ' 0234 123456 ',
        mobile: ' 0170 123456 ',
      },
    },
  };

  it('bildet die realen Legacy-Firmenfelder in das Firmenmodell ab', () => {
    expect(mapPurCompanyToFirma('kunde-1', purCompany)).toEqual({
      daten: {
        anzeigename: 'Test Firma',
        firmenname: 'Test Firma',
        nummer: 1,
        aktiv: true,
        adresse: {
          strasse: 'Straße',
          hausnummer: '99',
          postleitzahl: '12345',
          ort: 'Bochum',
        },
        kontakt: {
          email: 'info@example.com',
          telefon: '0234 123456',
          mobil: '0170 123456',
        },
      },
      probleme: [],
    });
  });

  it('übernimmt eine fehlende oder teilweise Adresse ohne Migrationsfehler', () => {
    expect(
      mapPurCompanyToFirma('kunde-1', {
        ...purCompany,
        daten: { ...purCompany.daten, address: { street: 'Gewerbepark' } },
      }),
    ).toEqual({
      daten: expect.objectContaining({ adresse: { strasse: 'Gewerbepark' } }),
      probleme: [],
    });
    expect(
      mapPurCompanyToFirma('kunde-1', {
        ...purCompany,
        daten: { ...purCompany.daten, address: undefined },
      }),
    ).toEqual({
      daten: expect.not.objectContaining({ adresse: expect.anything() }),
      probleme: [],
    });
  });

  it('verwendet bei fehlender Legacy-Nummer eine vorgegebene Ersatznummer', () => {
    expect(
      mapPurCompanyToFirma(
        'kunde-1',
        {
          ...purCompany,
          daten: { ...purCompany.daten, companyNumber: undefined },
        },
        8,
      ),
    ).toEqual({
      daten: expect.objectContaining({ nummer: 8 }),
      probleme: [],
    });
  });

  it('meldet fehlende Pflichtdaten und eine abweichende eingebettete ID', () => {
    const ergebnis = mapPurCompanyToFirma('kunde-1', {
      id: 'firma-alt',
      daten: {
        company_ID: 'andere-firma',
        companyName: ' ',
        companyNumber: 0,
      },
    });

    expect(ergebnis.daten).toBeNull();
    expect(ergebnis.probleme).toEqual([
      expect.objectContaining({
        quellPfad: 'purCustomers/kunde-1/company/firma-alt',
        ursache: 'Die eingebettete Firmen-ID weicht vom Quellpfad ab.',
      }),
      expect.objectContaining({ ursache: 'Der Firmenname fehlt.' }),
      expect.objectContaining({ ursache: 'Die Firmennummer fehlt oder ist ungültig.' }),
      expect.objectContaining({ ursache: 'Der Aktivstatus fehlt oder ist ungültig.' }),
    ]);
  });

  it('erkennt identische und abweichende Ziel-Firmendaten', () => {
    const mapping = mapPurCompanyToFirma('kunde-1', purCompany);
    if (!mapping.daten) throw new Error('Testdaten müssen gültig sein.');

    expect(entsprichtFirmaMigration(mapping.daten, mapping.daten)).toBe(true);
    expect(
      entsprichtFirmaMigration({ ...mapping.daten, firmenname: 'Manuell geändert' }, mapping.daten),
    ).toBe(false);
  });
});
