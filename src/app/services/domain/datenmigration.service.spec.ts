// pur-system/src/app/services/domain/datenmigration.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { IDatenbereichMigrationDokument } from '../../commons/models/domain/datenmigration';
import { IPurCompanyDokument } from '../../commons/models/legacy/pur-company';
import { IPurCustomerEintrag } from '../../commons/models/legacy/pur-customer';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { DatenmigrationService } from './datenmigration.service';

describe('DatenmigrationService', () => {
  const purCustomer: IPurCustomerEintrag = {
    id: 'kunde-1',
    anzeigename: 'Kunde Nord',
    daten: {
      _admin_UID: 'admin-1',
      id: 'kunde-1',
      displayName: ' Kunde Nord ',
      firstName: ' Mara ',
      lastName: ' Muster ',
      person: {
        birthday: '1980-01-02',
      },
      address: {
        city: 'Hamburg',
        postcode: '20095',
        street: 'Musterstraße 12 a',
      },
      contact: {
        email: 'mara@example.com',
        landline: '040 123456',
        mobile: '0170 123456',
      },
    },
  };
  const erwarteterUnternehmer = {
    anzeigename: 'Mara Muster',
    nummer: 8,
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
    },
  };
  const purCompany: IPurCompanyDokument = {
    active: true,
    activeDate: '',
    address: {
      city: 'Bochum',
      postcode: 12345,
      street: 'Straße 99',
    },
    addressName: 'Address-Name',
    companyName: 'Test Firma',
    companyNumber: 1,
    company_ID: 'firma-alt',
    email: null,
    phone: {
      fax: null,
      fixedLineNumber: null,
      mobile: null,
    },
  };
  const erwarteteFirma = {
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
    kontakt: {},
  };
  const firestoreDbServiceMock = {
    loadCollection: vi.fn(),
    loadDocument: vi.fn(),
    updateDocument: vi.fn(),
    createDocumentId: vi.fn(),
    createServerTimestamp: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreDbServiceMock.loadCollection.mockResolvedValue([]);
    firestoreDbServiceMock.loadDocument.mockResolvedValue(null);
    firestoreDbServiceMock.updateDocument.mockResolvedValue(undefined);
    firestoreDbServiceMock.createDocumentId.mockReturnValue('unternehmer-ziel');
    firestoreDbServiceMock.createServerTimestamp.mockReturnValue('server-zeitstempel');

    TestBed.configureTestingModule({
      providers: [
        DatenmigrationService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
      ],
    });
  });

  it('should load and sort legacy customers for selection', async () => {
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'z', daten: { displayName: ' Zulu ' } },
      { id: 'a', daten: { displayName: 'Alpha' } },
      { id: 'fallback', daten: {} },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadPurCustomers()).resolves.toEqual([
      { id: 'a', anzeigename: 'Alpha', daten: { displayName: 'Alpha' } },
      { id: 'fallback', anzeigename: 'fallback', daten: {} },
      { id: 'z', anzeigename: 'Zulu', daten: { displayName: ' Zulu ' } },
    ]);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'purCustomers',
      'networkOnly',
    );
  });

  it('should load only known migration status documents', async () => {
    const unternehmerStatus = { status: 'completed' } as IDatenbereichMigrationDokument;
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'unternehmer_v1', daten: unternehmerStatus },
      { id: 'unbekannt_v1', daten: { status: 'completed' } },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadMigrationsstatus('kunde-1')).resolves.toEqual({
      unternehmer: unternehmerStatus,
    });
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'systemMigrationen/kunde-1/datenbereiche',
      'networkOnly',
    );
  });

  it('should load companies only from the selected legacy customer', async () => {
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: purCompany },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadPurCompanies('kunde-1')).resolves.toEqual([
      { id: 'firma-alt', daten: purCompany },
    ]);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'purCustomers/kunde-1/company',
      'networkOnly',
    );
  });

  it('should migrate one valid customer to an entrepreneur with a random stable document id', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'unternehmer-1', daten: { nummer: 3 } },
      { id: 'unternehmer-2', daten: { nummer: 7 } },
      { id: 'unternehmer-ohne-nummer', daten: {} },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateUnternehmer(purCustomer);

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'systemMigrationen/kunde-1',
      expect.objectContaining({
        purCustomerId: 'kunde-1',
        unternehmerId: 'unternehmer-ziel',
      }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel',
      {
        ...erwarteterUnternehmer,
        erstelltAm: 'server-zeitstempel',
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/unternehmer_v1',
      expect.objectContaining({
        status: 'completed',
        migrierteDokumente: 1,
        bereitsMigrierteDokumente: 0,
        konflikte: 0,
        fehler: 0,
      }),
    );
  });

  it('should treat an identical entrepreneur as already migrated without writing it again', async () => {
    const vorhandenerUnternehmer = { ...erwarteterUnternehmer, nummer: 7 };
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-vorhanden' },
      })
      .mockResolvedValueOnce({ id: 'unternehmer-vorhanden', daten: vorhandenerUnternehmer });
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateUnternehmer(purCustomer);

    expect(firestoreDbServiceMock.updateDocument).not.toHaveBeenCalledWith(
      'unternehmer/unternehmer-vorhanden',
      expect.anything(),
    );
    expect(firestoreDbServiceMock.createDocumentId).not.toHaveBeenCalled();
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/unternehmer_v1',
      expect.objectContaining({
        status: 'completed',
        migrierteDokumente: 0,
        bereitsMigrierteDokumente: 1,
      }),
    );
  });

  it('should preserve a differing entrepreneur and save a conflict', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'kunde-1',
      daten: { ...erwarteterUnternehmer, nummer: 7, anzeigename: 'Manuell geändert' },
    });
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateUnternehmer(purCustomer);

    expect(firestoreDbServiceMock.updateDocument).not.toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel',
      expect.anything(),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/unternehmer_v1',
      expect.objectContaining({
        status: 'conflict',
        konflikte: 1,
        probleme: [
          expect.objectContaining({
            typ: 'konflikt',
            quellPfad: 'purCustomers/kunde-1',
            zielPfad: 'unternehmer/unternehmer-ziel',
          }),
        ],
      }),
    );
  });

  it('should save validation problems without creating an entrepreneur', async () => {
    const service = TestBed.inject(DatenmigrationService);
    const ungueltigerKunde: IPurCustomerEintrag = {
      ...purCustomer,
      daten: {
        ...purCustomer.daten,
        address: { ...purCustomer.daten.address, addressName: 'Hinterhaus' },
      },
    };

    await service.migrateUnternehmer(ungueltigerKunde);

    expect(firestoreDbServiceMock.loadDocument).toHaveBeenCalledTimes(2);
    expect(firestoreDbServiceMock.updateDocument).not.toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel',
      expect.anything(),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/unternehmer_v1',
      expect.objectContaining({
        status: 'failed',
        fehler: 1,
        probleme: [
          expect.objectContaining({
            ursache: 'Der vorhandene Adresszusatz besitzt noch kein festgelegtes Zielfeld.',
          }),
        ],
      }),
    );
  });

  it('should save and propagate a technical migration error', async () => {
    const error = { code: 'unavailable' };
    firestoreDbServiceMock.loadDocument.mockResolvedValueOnce(null).mockRejectedValueOnce(error);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.migrateUnternehmer(purCustomer)).rejects.toBe(error);
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/unternehmer_v1',
      expect.objectContaining({ status: 'failed', fehler: 1 }),
    );
  });

  it('should migrate all companies of the selected customer with stable random target ids', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: purCompany },
    ]);
    firestoreDbServiceMock.createDocumentId.mockReturnValue('firma-ziel');
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'purCustomers/kunde-1/company',
      'networkOnly',
    );
    expect(firestoreDbServiceMock.createDocumentId).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma',
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'systemMigrationen/kunde-1',
      expect.objectContaining({ firmenIds: { 'firma-alt': 'firma-ziel' } }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel',
      {
        ...erwarteteFirma,
        erstelltAm: 'server-zeitstempel',
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/firmen_v1',
      expect.objectContaining({
        status: 'completed',
        quellDokumente: 1,
        migrierteDokumente: 1,
        bereitsMigrierteDokumente: 0,
        konflikte: 0,
        fehler: 0,
      }),
    );
  });

  it('should reuse a company target id and count identical data as already migrated', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-vorhanden' },
        },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce({ id: 'firma-vorhanden', daten: erwarteteFirma });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: purCompany },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.createDocumentId).not.toHaveBeenCalled();
    expect(firestoreDbServiceMock.updateDocument).not.toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-vorhanden',
      expect.anything(),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/firmen_v1',
      expect.objectContaining({
        status: 'completed',
        migrierteDokumente: 0,
        bereitsMigrierteDokumente: 1,
      }),
    );
  });

  it('should assign the next free company number when the legacy number is missing', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([
        { id: 'firma-alt', daten: { ...purCompany, companyNumber: undefined } },
      ])
      .mockResolvedValueOnce([
        { id: 'firma-1', daten: { nummer: 2 } },
        { id: 'firma-2', daten: { nummer: 7 } },
      ]);
    firestoreDbServiceMock.createDocumentId.mockReturnValue('firma-ziel');
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.loadCollection).toHaveBeenLastCalledWith(
      'unternehmer/unternehmer-ziel/firma',
      'networkOnly',
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel',
      expect.objectContaining({ nummer: 8 }),
    );
  });

  it('should reuse the existing target number when the legacy number is missing', async () => {
    const vorhandeneFirma = { ...erwarteteFirma, nummer: 8 };
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-vorhanden' },
        },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce({ id: 'firma-vorhanden', daten: vorhandeneFirma });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: { ...purCompany, companyNumber: undefined } },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledOnce();
    expect(firestoreDbServiceMock.updateDocument).not.toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-vorhanden',
      expect.anything(),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/firmen_v1',
      expect.objectContaining({ status: 'completed', bereitsMigrierteDokumente: 1 }),
    );
  });

  it('should preserve a differing company and save a conflict', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-vorhanden' },
        },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce({
        id: 'firma-vorhanden',
        daten: { ...erwarteteFirma, firmenname: 'Manuell geändert' },
      });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: purCompany },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/firmen_v1',
      expect.objectContaining({
        status: 'conflict',
        konflikte: 1,
        probleme: [
          expect.objectContaining({
            typ: 'konflikt',
            quellPfad: 'purCustomers/kunde-1/company/firma-alt',
            zielPfad: 'unternehmer/unternehmer-ziel/firma/firma-vorhanden',
          }),
        ],
      }),
    );
  });

  it('should save invalid company documents as migration errors', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: { ...purCompany, companyName: '' } },
    ]);
    firestoreDbServiceMock.createDocumentId.mockReturnValue('firma-ziel');
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).not.toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel',
      expect.anything(),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/firmen_v1',
      expect.objectContaining({ status: 'failed', fehler: 1 }),
    );
  });

  it('should require a completed entrepreneur migration before migrating companies', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'failed' } });
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.migrateFirmen('kunde-1')).rejects.toThrow(
      'Die Firmenmigration erfordert eine abgeschlossene Unternehmermigration.',
    );
    expect(firestoreDbServiceMock.loadCollection).not.toHaveBeenCalled();
  });
});
