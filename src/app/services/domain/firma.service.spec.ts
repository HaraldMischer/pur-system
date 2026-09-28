// pur-system/src/app/services/domain/firma.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { IFirmaAnlage } from '../../commons/models/domain/firma';
import { FirmaService } from './firma.service';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { StrukturVerwaltungService } from '../firebase/struktur-verwaltung.service';

describe('FirmaService', () => {
  const strukturVerwaltungServiceMock = { deleteStruktureintrag: vi.fn() };
  const firestoreDbServiceMock = {
    loadCollection: vi.fn(),
    loadDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    createServerTimestamp: vi.fn(),
  };
  const anlage: IFirmaAnlage = {
    anzeigename: 'Firma Nord',
    firmenname: 'Firma Nord GmbH',
    adresse: {
      strasse: 'Hauptstraße',
      hausnummer: '1',
      postleitzahl: '20095',
      ort: 'Hamburg',
    },
    kontakt: {
      email: 'info@example.com',
      telefon: '040 123456',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreDbServiceMock.loadCollection.mockResolvedValue([]);
    firestoreDbServiceMock.loadDocument.mockResolvedValue(null);
    firestoreDbServiceMock.createDocument.mockResolvedValue('firma-123');
    firestoreDbServiceMock.updateDocument.mockResolvedValue(undefined);
    firestoreDbServiceMock.createServerTimestamp.mockReturnValue('server-zeitstempel');
    strukturVerwaltungServiceMock.deleteStruktureintrag.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        FirmaService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
        { provide: StrukturVerwaltungService, useValue: strukturVerwaltungServiceMock },
      ],
    });
  });

  it('should delete a company through the protected structure service', async () => {
    const service = TestBed.inject(FirmaService);

    await service.deleteFirma('unternehmer-1', 'firma-1');

    expect(strukturVerwaltungServiceMock.deleteStruktureintrag).toHaveBeenCalledWith({
      typ: 'firma',
      unternehmerId: 'unternehmer-1',
      firmaId: 'firma-1',
    });
  });

  it('should load one assigned company by its complete path', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'firma-1',
      daten: {
        ...anlage,
        anzeigename: ' Firma Nord ',
        nummer: 3,
        aktiv: true,
      },
    });
    const service = TestBed.inject(FirmaService);

    await expect(service.loadFirmaEintrag('unternehmer-1', 'firma-1')).resolves.toEqual({
      id: 'firma-1',
      anzeigename: 'Firma Nord',
      firmenname: 'Firma Nord GmbH',
      nummer: 3,
      aktiv: true,
      adresse: anlage.adresse,
      kontakt: anlage.kontakt,
    });
    expect(firestoreDbServiceMock.loadDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-1/firma/firma-1',
      'networkOnly',
    );
  });

  it('should return null for a missing assigned company', async () => {
    const service = TestBed.inject(FirmaService);

    await expect(service.loadFirmaEintrag('unternehmer-1', 'unbekannt')).resolves.toBeNull();
  });

  it('should load, normalize and sort companies of an entrepreneur', async () => {
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'b', daten: { ...anlage, anzeigename: ' Beta ', nummer: 2, aktiv: true } },
      { id: 'a', daten: { ...anlage, anzeigename: 'Alpha', nummer: 1, aktiv: true } },
      { id: 'z', daten: { anzeigename: 42, nummer: -1 } },
    ]);
    const service = TestBed.inject(FirmaService);

    await expect(service.loadFirmen('unternehmer-1')).resolves.toEqual([
      {
        id: 'a',
        ...anlage,
        anzeigename: 'Alpha',
        nummer: 1,
        aktiv: true,
      },
      {
        id: 'b',
        ...anlage,
        anzeigename: 'Beta',
        nummer: 2,
        aktiv: true,
      },
      {
        id: 'z',
        anzeigename: 'z',
        firmenname: 'z',
        nummer: 0,
        aktiv: false,
        adresse: {
          strasse: '',
          hausnummer: '',
          postleitzahl: '',
          ort: '',
        },
        kontakt: {},
      },
    ]);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'unternehmer/unternehmer-1/firma',
      'networkOnly',
    );
  });

  it('should create an active company with server timestamps', async () => {
    const service = TestBed.inject(FirmaService);

    await expect(service.createFirma('unternehmer-1', anlage, 8)).resolves.toEqual({
      id: 'firma-123',
      nummer: 8,
      anzeigename: 'Firma Nord',
    });
    expect(firestoreDbServiceMock.createServerTimestamp).toHaveBeenCalledOnce();
    expect(firestoreDbServiceMock.createDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-1/firma',
      {
        ...anlage,
        nummer: 8,
        aktiv: true,
        erstelltAm: 'server-zeitstempel',
        aktualisiertAm: 'server-zeitstempel',
      },
    );
  });

  it('should update only editable company data with a server timestamp', async () => {
    const service = TestBed.inject(FirmaService);

    await service.updateFirma('unternehmer-1', 'firma-1', anlage);

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-1/firma/firma-1',
      {
        ...anlage,
        aktualisiertAm: 'server-zeitstempel',
      },
    );
  });

  it('should propagate Firestore errors', async () => {
    const error = { code: 'permission-denied' };
    firestoreDbServiceMock.createDocument.mockRejectedValue(error);
    const service = TestBed.inject(FirmaService);

    await expect(service.createFirma('unternehmer-1', anlage, 1)).rejects.toBe(error);
  });

  it('should propagate update errors', async () => {
    const error = { code: 'permission-denied' };
    firestoreDbServiceMock.updateDocument.mockRejectedValue(error);
    const service = TestBed.inject(FirmaService);

    await expect(service.updateFirma('unternehmer-1', 'firma-1', anlage)).rejects.toBe(error);
  });
});
