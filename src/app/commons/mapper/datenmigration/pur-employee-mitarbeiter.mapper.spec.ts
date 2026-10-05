// pur-system/src/app/commons/mapper/datenmigration/pur-employee-mitarbeiter.mapper.spec.ts

import { IPurEmployeeEintrag } from '../../models/legacy/pur-employee';
import { mapPurEmployeeToMitarbeiter } from './pur-employee-mitarbeiter.mapper';

describe('PurEmployee-Mitarbeiter-Mapper', () => {
  const purEmployee: IPurEmployeeEintrag = {
    id: 'mitarbeiter-alt',
    purCompanyId: 'firma-alt',
    purBranchId: 'filiale-alt',
    daten: {
      active: true,
      address: {
        city: 'Bochum',
        postcode: 44892,
        street: 'Ümminger Straße 86',
      },
      birthday: '1990-02-03',
      deleted: false,
      email: ' almina@example.com ',
      firstName: ' Almina ',
      gender: 'FEMALE',
      lastName: ' Vilkeviciene ',
      phone: { fixedLineNumber: ' 0234 123 ', mobile: ' 0170 456 ' },
      role: 'Service',
    },
  };

  it('bildet den Legacy-Mitarbeiter und seine neue Filialzuordnung ab', () => {
    expect(mapPurEmployeeToMitarbeiter('kunde-1', purEmployee, 'filiale-ziel')).toEqual({
      daten: {
        anzeigename: 'Almina Vilkeviciene',
        person: {
          vorname: 'Almina',
          nachname: 'Vilkeviciene',
          adresse: {
            strasse: 'Ümminger Straße',
            hausnummer: '86',
            postleitzahl: '44892',
            ort: 'Bochum',
          },
          kontakt: {
            email: 'almina@example.com',
            telefon: '0234 123',
            mobil: '0170 456',
          },
          geburtstag: '1990-02-03',
        },
        rollen: ['servicekraft'],
        filialIds: ['filiale-ziel'],
        aktiv: true,
      },
      probleme: [],
    });
  });

  it('bildet die bekannten Legacy-Rollen ab', () => {
    const rollenzuordnungen = [
      ['Service', 'servicekraft'],
      ['Techniker', 'techniker'],
      ['Kassierer', 'kassierer'],
      ['Administrator', 'administrator'],
    ] as const;

    for (const [legacyRolle, zielRolle] of rollenzuordnungen) {
      expect(
        mapPurEmployeeToMitarbeiter(
          'kunde-1',
          { ...purEmployee, daten: { ...purEmployee.daten, role: legacyRolle } },
          'filiale-ziel',
        ),
      ).toEqual({ daten: expect.objectContaining({ rollen: [zielRolle] }), probleme: [] });
    }
  });

  it('vereinigt die Legacy-Rolle mit bekannten Berechtigungen', () => {
    expect(
      mapPurEmployeeToMitarbeiter(
        'kunde-1',
        {
          ...purEmployee,
          daten: {
            ...purEmployee.daten,
            role: 'Service',
            authorisation: ['Filialkasse', 'Kassieren', 'Gerätetechnik', 'Einstellungen'],
          },
        },
        'filiale-ziel',
      ),
    ).toEqual({
      daten: expect.objectContaining({
        rollen: ['servicekraft', 'filialkasse', 'kassierer', 'techniker', 'administrator'],
      }),
      probleme: [],
    });
  });

  it('übernimmt fehlende optionale Personenfelder als leere Adresse', () => {
    const ergebnis = mapPurEmployeeToMitarbeiter(
      'kunde-1',
      {
        ...purEmployee,
        daten: {
          active: true,
          firstName: 'Almina',
          lastName: 'Vilkeviciene',
          role: 'Service',
        },
      },
      'filiale-ziel',
    );

    expect(ergebnis).toEqual({
      daten: expect.objectContaining({
        person: expect.objectContaining({
          adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
          kontakt: {},
        }),
      }),
      probleme: [],
    });
  });

  it('behandelt gelöschte Legacy-Mitarbeiter als inaktiv', () => {
    expect(
      mapPurEmployeeToMitarbeiter(
        'kunde-1',
        { ...purEmployee, daten: { ...purEmployee.daten, deleted: true } },
        'filiale-ziel',
      ),
    ).toEqual({
      daten: expect.objectContaining({ aktiv: false }),
      probleme: [],
    });
  });

  it('normalisiert einen einzelnen Legacy-Aktivstatus aus einem Array', () => {
    expect(
      mapPurEmployeeToMitarbeiter(
        'kunde-1',
        { ...purEmployee, daten: { ...purEmployee.daten, active: [true] } },
        'filiale-ziel',
      ),
    ).toEqual({ daten: expect.objectContaining({ aktiv: true }), probleme: [] });
    expect(
      mapPurEmployeeToMitarbeiter(
        'kunde-1',
        { ...purEmployee, daten: { ...purEmployee.daten, active: [false] } },
        'filiale-ziel',
      ),
    ).toEqual({ daten: expect.objectContaining({ aktiv: false }), probleme: [] });
  });

  it('lehnt mehrdeutige Legacy-Aktivstatus-Arrays ab', () => {
    const ergebnis = mapPurEmployeeToMitarbeiter(
      'kunde-1',
      { ...purEmployee, daten: { ...purEmployee.daten, active: [true, false] } },
      'filiale-ziel',
    );

    expect(ergebnis.daten).toBeNull();
    expect(ergebnis.probleme).toContainEqual(
      expect.objectContaining({ ursache: 'Der Aktivstatus fehlt oder ist ungültig.' }),
    );
  });

  it('meldet fehlende Pflichtdaten mit dem vollständigen Quellpfad', () => {
    const ergebnis = mapPurEmployeeToMitarbeiter(
      'kunde-1',
      { ...purEmployee, daten: {} },
      'filiale-ziel',
    );

    expect(ergebnis.daten).toBeNull();
    expect(ergebnis.probleme).toEqual([
      expect.objectContaining({
        quellPfad:
          'purCustomers/kunde-1/company/firma-alt/branches/filiale-alt/employee/mitarbeiter-alt',
        ursache: 'Der Vorname fehlt.',
      }),
      expect.objectContaining({ ursache: 'Der Nachname fehlt.' }),
      expect.objectContaining({ ursache: 'Die Mitarbeiterrolle fehlt oder ist unbekannt.' }),
      expect.objectContaining({ ursache: 'Der Aktivstatus fehlt oder ist ungültig.' }),
    ]);
  });
});
