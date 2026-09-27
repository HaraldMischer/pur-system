// pur-system/src/app/services/domain/filiale.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { IFilialeAnlage } from '../../commons/models/domain/filiale';
import { FilialeService } from './filiale.service';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { StrukturVerwaltungService } from '../firebase/struktur-verwaltung.service';

describe('FilialeService', () => {
  const strukturVerwaltungServiceMock = { deleteStruktureintrag: vi.fn() };
  const firestoreDbServiceMock = {
    loadCollection: vi.fn(),
    loadDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    createServerTimestamp: vi.fn(),
  };
  const anlage: IFilialeAnlage = {
    anzeigename: 'Gevelsberg 1',
    filialname: 'Spielhalle',
    adresse: {
      strasse: 'Mittelstraße',
      hausnummer: '102',
      postleitzahl: '58285',
      ort: 'Gevelsberg',
    },
    kontakt: {
      email: 'gevelsberg@example.com',
      telefon: '02332 123456',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreDbServiceMock.loadCollection.mockResolvedValue([]);
    firestoreDbServiceMock.loadDocument.mockResolvedValue(null);
    firestoreDbServiceMock.createDocument.mockResolvedValue('filiale-123');
    firestoreDbServiceMock.updateDocument.mockResolvedValue(undefined);
    firestoreDbServiceMock.createServerTimestamp.mockReturnValue('server-zeitstempel');
    strukturVerwaltungServiceMock.deleteStruktureintrag.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        FilialeService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
        { provide: StrukturVerwaltungService, useValue: strukturVerwaltungServiceMock },
      ],
    });
  });

  it('should delete a branch through the protected structure service', async () => {
    const service = TestBed.inject(FilialeService);

    await service.deleteFiliale('unternehmer-1', 'firma-1', 'filiale-1');

    expect(strukturVerwaltungServiceMock.deleteStruktureintrag).toHaveBeenCalledWith({
      typ: 'filiale',
      unternehmerId: 'unternehmer-1',
      firmaId: 'firma-1',
      filialId: 'filiale-1',
    });
  });

  it('should load one assigned branch by its complete path', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'filiale-1',
      daten: { ...anlage, anzeigename: ' Filiale Nord ', nummer: 3, aktiv: true },
    });
    const service = TestBed.inject(FilialeService);

    await expect(
      service.loadFilialeEintrag('unternehmer-1', 'firma-1', 'filiale-1'),
    ).resolves.toEqual({
      id: 'filiale-1',
      anzeigename: 'Filiale Nord',
      filialname: 'Spielhalle',
      nummer: 3,
      aktiv: true,
      adresse: anlage.adresse,
      kontakt: anlage.kontakt,
    });
    expect(firestoreDbServiceMock.loadDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1',
    );
  });

  it('should return null for a missing assigned branch', async () => {
    const service = TestBed.inject(FilialeService);

    await expect(
      service.loadFilialeEintrag('unternehmer-1', 'firma-1', 'unbekannt'),
    ).resolves.toBeNull();
  });

  it('should load, normalize and sort branches of a company', async () => {
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'b', daten: { ...anlage, anzeigename: ' Beta ', nummer: 2, aktiv: true } },
      { id: 'a', daten: { ...anlage, anzeigename: 'Alpha', nummer: 1, aktiv: true } },
      { id: 'z', daten: { anzeigename: 42, nummer: -1 } },
    ]);
    const service = TestBed.inject(FilialeService);

    await expect(service.loadFilialen('unternehmer-1', 'firma-1')).resolves.toEqual([
      { id: 'a', ...anlage, anzeigename: 'Alpha', nummer: 1, aktiv: true },
      { id: 'b', ...anlage, anzeigename: 'Beta', nummer: 2, aktiv: true },
      {
        id: 'z',
        anzeigename: 'z',
        filialname: 'z',
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
      'unternehmer/unternehmer-1/firma/firma-1/filiale',
    );
  });

  it('should create an active branch with server timestamps', async () => {
    const service = TestBed.inject(FilialeService);

    await expect(service.createFiliale('unternehmer-1', 'firma-1', anlage, 8)).resolves.toEqual({
      id: 'filiale-123',
      nummer: 8,
      anzeigename: 'Gevelsberg 1',
    });
    expect(firestoreDbServiceMock.createServerTimestamp).toHaveBeenCalledOnce();
    expect(firestoreDbServiceMock.createDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-1/firma/firma-1/filiale',
      {
        ...anlage,
        nummer: 8,
        aktiv: true,
        erstelltAm: 'server-zeitstempel',
        aktualisiertAm: 'server-zeitstempel',
      },
    );
  });

  it('should update only editable branch data with a server timestamp', async () => {
    const service = TestBed.inject(FilialeService);

    await service.updateFiliale('unternehmer-1', 'firma-1', 'filiale-1', anlage);

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1',
      {
        ...anlage,
        aktualisiertAm: 'server-zeitstempel',
      },
    );
  });

  it('should propagate Firestore errors', async () => {
    const error = { code: 'permission-denied' };
    firestoreDbServiceMock.createDocument.mockRejectedValue(error);
    const service = TestBed.inject(FilialeService);

    await expect(service.createFiliale('unternehmer-1', 'firma-1', anlage, 1)).rejects.toBe(error);
  });

  it('should propagate update errors', async () => {
    const error = { code: 'permission-denied' };
    firestoreDbServiceMock.updateDocument.mockRejectedValue(error);
    const service = TestBed.inject(FilialeService);

    await expect(
      service.updateFiliale('unternehmer-1', 'firma-1', 'filiale-1', anlage),
    ).rejects.toBe(error);
  });
});
