// pur-system/src/app/commons/mapper/datenmigration/pur-branch-filiale.mapper.spec.ts

import { IPurBranchEintrag } from '../../models/legacy/pur-branch';
import { mapPurBranchToFiliale } from './pur-branch-filiale.mapper';

describe('PurBranch-Filiale-Mapper', () => {
  const purBranch: IPurBranchEintrag = {
    id: 'filiale-alt',
    purCompanyId: 'firma-alt',
    daten: {
      active: true,
      activeDate: '2020-07-06T20:14:51.258Z',
      address: {
        city: 'Bochum',
        postcode: '44892',
        street: 'Ümminger Straße 86',
      },
      addressName: ' Spielhalle ',
      appVersion: 'v2.3.47',
      branchName: ' Bochum 2 ',
      branchNumber: 4,
      branch_ID: 'abweichende-id',
      company_ID: 'abweichende-firma',
      customer_ID: 'abweichender-kunde',
      email: ' info@example.com ',
      module: ['Kasse', 'Zeiterfassung'],
      phone: {
        fax: '0234 000000',
        fixedLineNumber: ' 0234 123456 ',
        mobile: ' 0170 123456 ',
      },
    },
  };

  it('bildet die Legacy-Filialfelder ab und ignoriert veraltete Metadaten', () => {
    expect(mapPurBranchToFiliale('kunde-1', purBranch)).toEqual({
      daten: {
        anzeigename: 'Bochum 2',
        filialname: 'Spielhalle',
        nummer: 4,
        aktiv: true,
        adresse: {
          strasse: 'Ümminger Straße',
          hausnummer: '86',
          postleitzahl: '44892',
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
      mapPurBranchToFiliale('kunde-1', {
        ...purBranch,
        daten: { ...purBranch.daten, address: { street: 'Gewerbepark' } },
      }),
    ).toEqual({
      daten: expect.objectContaining({ adresse: { strasse: 'Gewerbepark' } }),
      probleme: [],
    });
    expect(
      mapPurBranchToFiliale('kunde-1', {
        ...purBranch,
        daten: { ...purBranch.daten, address: undefined },
      }),
    ).toEqual({
      daten: expect.not.objectContaining({ adresse: expect.anything() }),
      probleme: [],
    });
  });

  it('verwendet branchName und addressName gegenseitig als Ersatz', () => {
    expect(
      mapPurBranchToFiliale('kunde-1', {
        ...purBranch,
        daten: { ...purBranch.daten, addressName: undefined },
      }),
    ).toEqual({
      daten: expect.objectContaining({
        anzeigename: 'Bochum 2',
        filialname: 'Bochum 2',
      }),
      probleme: [],
    });
    expect(
      mapPurBranchToFiliale('kunde-1', {
        ...purBranch,
        daten: { ...purBranch.daten, branchName: undefined },
      }),
    ).toEqual({
      daten: expect.objectContaining({
        anzeigename: 'Spielhalle',
        filialname: 'Spielhalle',
      }),
      probleme: [],
    });
  });

  it('verwendet bei fehlender Legacy-Nummer eine vorgegebene Ersatznummer', () => {
    expect(
      mapPurBranchToFiliale(
        'kunde-1',
        { ...purBranch, daten: { ...purBranch.daten, branchNumber: 0 } },
        8,
      ),
    ).toEqual({
      daten: expect.objectContaining({ nummer: 8 }),
      probleme: [],
    });
  });

  it('meldet ausschließlich fehlende Pflichtdaten', () => {
    const ergebnis = mapPurBranchToFiliale('kunde-1', {
      id: 'filiale-alt',
      purCompanyId: 'firma-alt',
      daten: {
        branch_ID: 'abweichende-id',
        company_ID: 'abweichende-firma',
        customer_ID: 'abweichender-kunde',
      },
    });

    expect(ergebnis.daten).toBeNull();
    expect(ergebnis.probleme).toEqual([
      expect.objectContaining({
        quellPfad: 'purCustomers/kunde-1/company/firma-alt/branches/filiale-alt',
        ursache: 'Der Anzeigename fehlt.',
      }),
      expect.objectContaining({ ursache: 'Der Filialname fehlt.' }),
      expect.objectContaining({ ursache: 'Die Filialnummer fehlt oder ist ungültig.' }),
      expect.objectContaining({ ursache: 'Der Aktivstatus fehlt oder ist ungültig.' }),
    ]);
  });

});
