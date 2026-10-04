// pur-system/src/app/services/domain/datenmigration.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { IDatenbereichMigrationDokument } from '../../commons/models/domain/datenmigration';
import { IPurBranchDokument } from '../../commons/models/legacy/pur-branch';
import { IPurCompanyDokument } from '../../commons/models/legacy/pur-company';
import { IPurCustomerEintrag } from '../../commons/models/legacy/pur-customer';
import { IPurEmployeeDokument } from '../../commons/models/legacy/pur-employee';
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
  const purBranch: IPurBranchDokument = {
    active: true,
    address: {
      city: 'Bochum',
      postcode: '44892',
      street: 'Ümminger Straße 86',
    },
    addressName: 'Spielhalle',
    branchName: 'Bochum 2',
    branchNumber: 4,
    email: 'bochum@example.com',
    phone: { fixedLineNumber: '0234 123456', mobile: '0170 123456' },
  };
  const erwarteteFiliale = {
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
      email: 'bochum@example.com',
      telefon: '0234 123456',
      mobil: '0170 123456',
    },
  };
  const purEmployee: IPurEmployeeDokument = {
    active: true,
    deleted: false,
    firstName: 'Almina',
    lastName: 'Vilkeviciene',
    role: 'Service',
  };
  const erwarteterMitarbeiter = {
    anzeigename: 'Almina Vilkeviciene',
    person: {
      vorname: 'Almina',
      nachname: 'Vilkeviciene',
      adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
      kontakt: {},
    },
    rolle: 'service',
    filialIds: ['filiale-ziel'],
    aktiv: true,
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
    firestoreDbServiceMock.createDocumentId.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'unternehmer') return 'unternehmer-ziel';
      if (collectionPath.endsWith('/firma')) return 'firma-ziel';
      if (collectionPath.endsWith('/filiale')) return 'filiale-ziel';
      return 'mitarbeiter-ziel';
    });
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

  it('should load branches from every company of the selected legacy customer', async () => {
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([
        { id: 'firma-1', daten: purCompany },
        { id: 'firma-2', daten: purCompany },
      ])
      .mockResolvedValueOnce([{ id: 'filiale-1', daten: purBranch }])
      .mockResolvedValueOnce([{ id: 'filiale-2', daten: purBranch }]);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadPurBranches('kunde-1')).resolves.toEqual([
      { id: 'filiale-1', purCompanyId: 'firma-1', daten: purBranch },
      { id: 'filiale-2', purCompanyId: 'firma-2', daten: purBranch },
    ]);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenNthCalledWith(
      2,
      'purCustomers/kunde-1/company/firma-1/branches',
      'networkOnly',
    );
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenNthCalledWith(
      3,
      'purCustomers/kunde-1/company/firma-2/branches',
      'networkOnly',
    );
  });

  it('should load employees from every branch of the selected legacy customer', async () => {
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([{ id: 'filiale-alt', daten: purBranch }])
      .mockResolvedValueOnce([{ id: 'mitarbeiter-alt', daten: purEmployee }]);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadPurEmployees('kunde-1')).resolves.toEqual([
      {
        id: 'mitarbeiter-alt',
        purCompanyId: 'firma-alt',
        purBranchId: 'filiale-alt',
        daten: purEmployee,
      },
    ]);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenLastCalledWith(
      'purCustomers/kunde-1/company/firma-alt/branches/filiale-alt/employee',
      'networkOnly',
    );
  });

  it('should count the selected entrepreneur in the target', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
      })
      .mockResolvedValueOnce({ id: 'unternehmer-ziel', daten: {} });
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadUnternehmerZielDokumente('kunde-1')).resolves.toBe(1);
    expect(firestoreDbServiceMock.loadDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel',
      'networkOnly',
    );
  });

  it('should report an empty target before an entrepreneur id is assigned', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue(null);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadUnternehmerZielDokumente('kunde-1')).resolves.toBe(0);
    expect(firestoreDbServiceMock.loadDocument).toHaveBeenCalledOnce();
  });

  it('should count all companies in the target collection', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'kunde-1',
      daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
    });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-1', daten: {} },
      { id: 'firma-2', daten: {} },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadFirmenZielDokumente('kunde-1')).resolves.toBe(2);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma',
      'networkOnly',
    );
  });

  it('should count branches from every company in the target', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'kunde-1',
      daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
    });
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([
        { id: 'firma-1', daten: {} },
        { id: 'firma-2', daten: {} },
      ])
      .mockResolvedValueOnce([{ id: 'filiale-1', daten: {} }])
      .mockResolvedValueOnce([
        { id: 'filiale-2', daten: {} },
        { id: 'filiale-3', daten: {} },
      ]);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadFilialenZielDokumente('kunde-1')).resolves.toBe(3);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenNthCalledWith(
      2,
      'unternehmer/unternehmer-ziel/firma/firma-1/filiale',
      'networkOnly',
    );
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenNthCalledWith(
      3,
      'unternehmer/unternehmer-ziel/firma/firma-2/filiale',
      'networkOnly',
    );
  });

  it('should count employees from every company in the target', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'kunde-1',
      daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
    });
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-ziel', daten: {} }])
      .mockResolvedValueOnce([
        { id: 'mitarbeiter-1', daten: {} },
        { id: 'mitarbeiter-2', daten: {} },
      ]);
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.loadMitarbeiterZielDokumente('kunde-1')).resolves.toBe(2);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenLastCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/mitarbeiter',
      'networkOnly',
    );
  });

  it('should migrate one valid customer using a stored random entrepreneur id', async () => {
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
    expect(firestoreDbServiceMock.createDocumentId).toHaveBeenCalledWith('unternehmer');
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
        fehler: 0,
      }),
    );
  });

  it('should update an existing entrepreneur with the mapped source data', async () => {
    const vorhandenerUnternehmer = { ...erwarteterUnternehmer, nummer: 7 };
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-bestehend' },
      })
      .mockResolvedValueOnce({ id: 'unternehmer-bestehend', daten: vorhandenerUnternehmer });
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateUnternehmer(purCustomer);

    expect(firestoreDbServiceMock.createDocumentId).not.toHaveBeenCalled();
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-bestehend',
      {
        ...erwarteterUnternehmer,
        nummer: 7,
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/unternehmer_v1',
      expect.objectContaining({
        status: 'completed',
        migrierteDokumente: 1,
      }),
    );
  });

  it('should overwrite differing mapped entrepreneur fields', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'kunde-1',
      daten: { ...erwarteterUnternehmer, nummer: 7, anzeigename: 'Manuell geändert' },
    });
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateUnternehmer(purCustomer);

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel',
      {
        ...erwarteterUnternehmer,
        nummer: 7,
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/unternehmer_v1',
      expect.objectContaining({
        status: 'completed',
        migrierteDokumente: 1,
        fehler: 0,
        probleme: [],
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

  it('should migrate all companies using stored random target ids', async () => {
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
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'purCustomers/kunde-1/company',
      'networkOnly',
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
        fehler: 0,
      }),
    );
  });

  it('should update an existing company with the mapped source data', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
        },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce({ id: 'firma-alt', daten: erwarteteFirma });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: purCompany },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel',
      {
        ...erwarteteFirma,
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/firmen_v1',
      expect.objectContaining({
        status: 'completed',
        migrierteDokumente: 1,
      }),
    );
  });

  it('should assign the next free company number when the legacy number is missing', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
        },
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
          firmenIds: { 'firma-alt': 'firma-ziel' },
        },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce({ id: 'firma-alt', daten: vorhandeneFirma });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: { ...purCompany, companyNumber: undefined } },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledOnce();
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel',
      expect.objectContaining({ nummer: 8, aktualisiertAm: 'server-zeitstempel' }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/firmen_v1',
      expect.objectContaining({ status: 'completed', migrierteDokumente: 1 }),
    );
  });

  it('should overwrite differing mapped company fields', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
        },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce({
        id: 'firma-alt',
        daten: { ...erwarteteFirma, firmenname: 'Manuell geändert' },
      });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: purCompany },
    ]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel',
      {
        ...erwarteteFirma,
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/firmen_v1',
      expect.objectContaining({
        status: 'completed',
        migrierteDokumente: 1,
        fehler: 0,
        probleme: [],
      }),
    );
  });

  it('should save invalid company documents as migration errors', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
        },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-alt', daten: { ...purCompany, companyName: '' } },
    ]);
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

  it('should continue with the next company after a technical document error', async () => {
    let firmenNummer = 0;
    firestoreDbServiceMock.createDocumentId.mockImplementation((collectionPath: string) => {
      if (collectionPath.endsWith('/firma')) {
        firmenNummer += 1;
        return `firma-ziel-${firmenNummer}`;
      }
      return 'nicht-verwendet';
    });
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'firma-fehler', daten: { ...purCompany, company_ID: 'firma-fehler' } },
      {
        id: 'firma-erfolg',
        daten: { ...purCompany, companyNumber: 2, company_ID: 'firma-erfolg' },
      },
    ]);
    firestoreDbServiceMock.updateDocument.mockImplementation(async (documentPath: string) => {
      if (documentPath.endsWith('/firma/firma-ziel-1')) {
        throw new Error('Schreiben fehlgeschlagen');
      }
    });
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFirmen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel-2',
      expect.objectContaining({ nummer: 2 }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/firmen_v1',
      expect.objectContaining({
        status: 'failed',
        migrierteDokumente: 1,
        fehler: 1,
        probleme: [
          {
            typ: 'fehler',
            quellPfad: 'purCustomers/kunde-1/company/firma-fehler',
            zielPfad: 'unternehmer/unternehmer-ziel/firma/firma-ziel-1',
            ursache: 'Das Firmendokument konnte technisch nicht migriert werden.',
          },
        ],
      }),
    );
  });

  it('should require a completed entrepreneur migration before migrating companies', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
        },
      })
      .mockResolvedValueOnce({ id: 'unternehmer_v1', daten: { status: 'failed' } });
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.migrateFirmen('kunde-1')).rejects.toThrow(
      'Die Firmenmigration erfordert eine abgeschlossene Unternehmermigration.',
    );
    expect(firestoreDbServiceMock.loadCollection).not.toHaveBeenCalled();
  });

  it('should migrate branches using stored random target ids', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
        },
      })
      .mockResolvedValueOnce({ id: 'firmen_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([{ id: 'filiale-alt', daten: purBranch }]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFilialen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'systemMigrationen/kunde-1',
      expect.objectContaining({
        filialenIds: { 'firma-alt': { 'filiale-alt': 'filiale-ziel' } },
      }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/filiale/filiale-ziel',
      {
        ...erwarteteFiliale,
        erstelltAm: 'server-zeitstempel',
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/filialen_v1',
      expect.objectContaining({
        status: 'completed',
        quellDokumente: 1,
        migrierteDokumente: 1,
        fehler: 0,
      }),
    );
  });

  it('should assign the next free branch number when the legacy number is missing', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
          filialenIds: { 'firma-alt': { 'filiale-alt': 'filiale-ziel' } },
        },
      })
      .mockResolvedValueOnce({ id: 'firmen_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([
        { id: 'filiale-alt', daten: { ...purBranch, branchNumber: undefined } },
      ])
      .mockResolvedValueOnce([
        { id: 'filiale-1', daten: { nummer: 2 } },
        { id: 'filiale-2', daten: { nummer: 7 } },
      ]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFilialen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/filiale/filiale-ziel',
      expect.objectContaining({ nummer: 8 }),
    );
  });

  it('should update an existing branch with the mapped source data', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
          filialenIds: { 'firma-alt': { 'filiale-alt': 'filiale-ziel' } },
        },
      })
      .mockResolvedValueOnce({ id: 'firmen_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce({ id: 'filiale-ziel', daten: erwarteteFiliale });
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([{ id: 'filiale-alt', daten: purBranch }]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFilialen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/filiale/filiale-ziel',
      {
        ...erwarteteFiliale,
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/filialen_v1',
      expect.objectContaining({
        status: 'completed',
        migrierteDokumente: 1,
      }),
    );
  });

  it('should overwrite differing mapped branch fields', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
          filialenIds: { 'firma-alt': { 'filiale-alt': 'filiale-ziel' } },
        },
      })
      .mockResolvedValueOnce({ id: 'firmen_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce({
        id: 'filiale-ziel',
        daten: { ...erwarteteFiliale, filialname: 'Manuell geändert' },
      });
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([{ id: 'filiale-alt', daten: purBranch }]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFilialen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/filiale/filiale-ziel',
      {
        ...erwarteteFiliale,
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/filialen_v1',
      expect.objectContaining({
        status: 'completed',
        migrierteDokumente: 1,
        fehler: 0,
        probleme: [],
      }),
    );
  });

  it('should continue with the next branch after a technical document error', async () => {
    let filialNummer = 0;
    firestoreDbServiceMock.createDocumentId.mockImplementation((collectionPath: string) => {
      if (collectionPath.endsWith('/filiale')) {
        filialNummer += 1;
        return `filiale-ziel-${filialNummer}`;
      }
      return 'nicht-verwendet';
    });
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
        },
      })
      .mockResolvedValueOnce({ id: 'firmen_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([
        { id: 'filiale-fehler', daten: purBranch },
        { id: 'filiale-erfolg', daten: { ...purBranch, branchNumber: 5 } },
      ]);
    firestoreDbServiceMock.updateDocument.mockImplementation(async (documentPath: string) => {
      if (documentPath.endsWith('/filiale/filiale-ziel-1')) {
        throw new Error('Schreiben fehlgeschlagen');
      }
    });
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFilialen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/filiale/filiale-ziel-2',
      expect.objectContaining({ nummer: 5 }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/filialen_v1',
      expect.objectContaining({
        status: 'failed',
        migrierteDokumente: 1,
        fehler: 1,
        probleme: [
          {
            typ: 'fehler',
            quellPfad: 'purCustomers/kunde-1/company/firma-alt/branches/filiale-fehler',
            zielPfad: 'unternehmer/unternehmer-ziel/firma/firma-ziel/filiale/filiale-ziel-1',
            ursache: 'Das Filialdokument konnte technisch nicht migriert werden.',
          },
        ],
      }),
    );
  });

  it('should require a completed company migration before migrating branches', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
          filialenIds: { 'firma-alt': { 'filiale-alt': 'filiale-ziel' } },
        },
      })
      .mockResolvedValueOnce({ id: 'firmen_v1', daten: { status: 'failed' } });
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.migrateFilialen('kunde-1')).rejects.toThrow(
      'Die Filialmigration erfordert eine abgeschlossene Firmenmigration.',
    );
    expect(firestoreDbServiceMock.loadCollection).not.toHaveBeenCalled();
  });

  it('should report a missing company target id while migrating branches', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
        },
      })
      .mockResolvedValueOnce({ id: 'firmen_v1', daten: { status: 'completed' } });
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([{ id: 'filiale-alt', daten: purBranch }]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateFilialen('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).not.toHaveBeenCalledWith(
      expect.stringContaining('/filiale/'),
      expect.anything(),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/filialen_v1',
      expect.objectContaining({
        status: 'failed',
        migrierteDokumente: 0,
        fehler: 1,
        probleme: [
          expect.objectContaining({
            ursache: 'Für die Legacy-Firma fehlt die gespeicherte Ziel-ID.',
          }),
        ],
      }),
    );
  });

  it('should migrate branch employees using stored random target ids', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
          filialenIds: { 'firma-alt': { 'filiale-alt': 'filiale-ziel' } },
        },
      })
      .mockResolvedValueOnce({ id: 'filialen_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([{ id: 'filiale-alt', daten: purBranch }])
      .mockResolvedValueOnce([{ id: 'mitarbeiter-alt', daten: purEmployee }]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateMitarbeiter('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'systemMigrationen/kunde-1',
      expect.objectContaining({
        mitarbeiterIds: {
          'firma-alt': { 'filiale-alt': { 'mitarbeiter-alt': 'mitarbeiter-ziel' } },
        },
      }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/mitarbeiter/mitarbeiter-ziel',
      {
        ...erwarteterMitarbeiter,
        erstelltAm: 'server-zeitstempel',
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/mitarbeiter_v1',
      expect.objectContaining({
        status: 'completed',
        quellDokumente: 1,
        migrierteDokumente: 1,
        fehler: 0,
      }),
    );
  });

  it('should assign different target ids to the same legacy employee id in two branches', async () => {
    let mitarbeiterNummer = 0;
    firestoreDbServiceMock.createDocumentId.mockImplementation((collectionPath: string) => {
      if (collectionPath.endsWith('/mitarbeiter')) {
        mitarbeiterNummer += 1;
        return `mitarbeiter-ziel-${mitarbeiterNummer}`;
      }
      return 'nicht-verwendet';
    });
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
          filialenIds: {
            'firma-alt': {
              'filiale-1': 'filiale-ziel-1',
              'filiale-2': 'filiale-ziel-2',
            },
          },
        },
      })
      .mockResolvedValueOnce({ id: 'filialen_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([
        { id: 'filiale-1', daten: purBranch },
        { id: 'filiale-2', daten: purBranch },
      ])
      .mockResolvedValueOnce([{ id: 'mitarbeiter-alt', daten: purEmployee }])
      .mockResolvedValueOnce([{ id: 'mitarbeiter-alt', daten: purEmployee }]);
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateMitarbeiter('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'systemMigrationen/kunde-1',
      expect.objectContaining({
        mitarbeiterIds: {
          'firma-alt': {
            'filiale-1': { 'mitarbeiter-alt': 'mitarbeiter-ziel-1' },
            'filiale-2': { 'mitarbeiter-alt': 'mitarbeiter-ziel-2' },
          },
        },
      }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/mitarbeiter/mitarbeiter-ziel-1',
      expect.objectContaining({ filialIds: ['filiale-ziel-1'] }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/mitarbeiter/mitarbeiter-ziel-2',
      expect.objectContaining({ filialIds: ['filiale-ziel-2'] }),
    );
  });

  it('should continue with the next employee after a technical document error', async () => {
    let mitarbeiterNummer = 0;
    firestoreDbServiceMock.createDocumentId.mockImplementation((collectionPath: string) => {
      if (collectionPath.endsWith('/mitarbeiter')) {
        mitarbeiterNummer += 1;
        return `mitarbeiter-ziel-${mitarbeiterNummer}`;
      }
      return 'nicht-verwendet';
    });
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: {
          purCustomerId: 'kunde-1',
          unternehmerId: 'unternehmer-ziel',
          firmenIds: { 'firma-alt': 'firma-ziel' },
          filialenIds: {
            'firma-alt': {
              'filiale-1': 'filiale-ziel-1',
              'filiale-2': 'filiale-ziel-2',
            },
          },
        },
      })
      .mockResolvedValueOnce({ id: 'filialen_v1', daten: { status: 'completed' } })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([{ id: 'firma-alt', daten: purCompany }])
      .mockResolvedValueOnce([
        { id: 'filiale-1', daten: purBranch },
        { id: 'filiale-2', daten: purBranch },
      ])
      .mockResolvedValueOnce([{ id: 'mitarbeiter-fehler', daten: purEmployee }])
      .mockResolvedValueOnce([{ id: 'mitarbeiter-erfolg', daten: purEmployee }]);
    firestoreDbServiceMock.updateDocument.mockImplementation(async (documentPath: string) => {
      if (documentPath.endsWith('/mitarbeiter/mitarbeiter-ziel-1')) {
        throw new Error('Schreiben fehlgeschlagen');
      }
    });
    const service = TestBed.inject(DatenmigrationService);

    await service.migrateMitarbeiter('kunde-1');

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-ziel/firma/firma-ziel/mitarbeiter/mitarbeiter-ziel-2',
      expect.objectContaining({ filialIds: ['filiale-ziel-2'] }),
    );
    expect(firestoreDbServiceMock.updateDocument).toHaveBeenLastCalledWith(
      'systemMigrationen/kunde-1/datenbereiche/mitarbeiter_v1',
      expect.objectContaining({
        status: 'failed',
        migrierteDokumente: 1,
        fehler: 1,
        probleme: [
          {
            typ: 'fehler',
            quellPfad:
              'purCustomers/kunde-1/company/firma-alt/branches/filiale-1/employee/mitarbeiter-fehler',
            zielPfad:
              'unternehmer/unternehmer-ziel/firma/firma-ziel/mitarbeiter/mitarbeiter-ziel-1',
            ursache: 'Das Mitarbeiterdokument konnte technisch nicht migriert werden.',
          },
        ],
      }),
    );
  });

  it('should require a completed branch migration before migrating employees', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'kunde-1',
        daten: { purCustomerId: 'kunde-1', unternehmerId: 'unternehmer-ziel' },
      })
      .mockResolvedValueOnce({ id: 'filialen_v1', daten: { status: 'failed' } });
    const service = TestBed.inject(DatenmigrationService);

    await expect(service.migrateMitarbeiter('kunde-1')).rejects.toThrow(
      'Die Mitarbeitermigration erfordert eine abgeschlossene Filialmigration.',
    );
    expect(firestoreDbServiceMock.loadCollection).not.toHaveBeenCalled();
  });
});
