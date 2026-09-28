// pur-system/src/app/services/domain/unternehmer.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { IUnternehmerAnlage } from '../../commons/models/domain/unternehmer';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { StrukturVerwaltungService } from '../firebase/struktur-verwaltung.service';
import { UnternehmerService } from './unternehmer.service';

describe('UnternehmerService', () => {
  const strukturVerwaltungServiceMock = { deleteStruktureintrag: vi.fn() };
  const firestoreDbServiceMock = {
    loadCollection: vi.fn(),
    loadDocument: vi.fn(),
    createDocument: vi.fn(),
    createServerTimestamp: vi.fn(),
  };
  const anlage: IUnternehmerAnlage = {
    anzeigename: 'Unternehmer Nord',
    person: {
      vorname: 'Max',
      nachname: 'Mustermann',
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
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreDbServiceMock.loadCollection.mockResolvedValue([]);
    firestoreDbServiceMock.loadDocument.mockResolvedValue(null);
    firestoreDbServiceMock.createDocument.mockResolvedValue('unternehmer-123');
    firestoreDbServiceMock.createServerTimestamp.mockReturnValue('server-zeitstempel');
    strukturVerwaltungServiceMock.deleteStruktureintrag.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        UnternehmerService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
        { provide: StrukturVerwaltungService, useValue: strukturVerwaltungServiceMock },
      ],
    });
  });

  it('should delete an entrepreneur through the protected structure service', async () => {
    const service = TestBed.inject(UnternehmerService);

    await service.deleteUnternehmer('unternehmer-1');

    expect(strukturVerwaltungServiceMock.deleteStruktureintrag).toHaveBeenCalledWith({
      typ: 'unternehmer',
      unternehmerId: 'unternehmer-1',
    });
  });

  it('should load one assigned entrepreneur by document id', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'unternehmer-1',
      daten: { anzeigename: ' Unternehmer Nord ', nummer: 3 },
    });
    const service = TestBed.inject(UnternehmerService);

    await expect(service.loadUnternehmerEintrag('unternehmer-1')).resolves.toEqual({
      id: 'unternehmer-1',
      anzeigename: 'Unternehmer Nord',
      nummer: 3,
    });
    expect(firestoreDbServiceMock.loadDocument).toHaveBeenCalledWith(
      'unternehmer/unternehmer-1',
      'networkOnly',
    );
  });

  it('should return null for a missing assigned entrepreneur', async () => {
    const service = TestBed.inject(UnternehmerService);

    await expect(service.loadUnternehmerEintrag('unbekannt')).resolves.toBeNull();
  });

  it('should load, normalize and sort entrepreneurs', async () => {
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      { id: 'b', daten: { anzeigename: ' Beta ', nummer: 2 } },
      { id: 'a', daten: { anzeigename: 'Alpha', nummer: 1 } },
      { id: 'z', daten: { anzeigename: 42, nummer: -1 } },
    ]);
    const service = TestBed.inject(UnternehmerService);

    await expect(service.loadUnternehmer()).resolves.toEqual([
      { id: 'a', anzeigename: 'Alpha', nummer: 1 },
      { id: 'b', anzeigename: 'Beta', nummer: 2 },
      { id: 'z', anzeigename: 'z', nummer: 0 },
    ]);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'unternehmer',
      'networkOnly',
    );
  });

  it('should create an active entrepreneur with server timestamps', async () => {
    const service = TestBed.inject(UnternehmerService);

    await expect(service.createUnternehmer(anlage, 8)).resolves.toEqual({
      id: 'unternehmer-123',
      nummer: 8,
      anzeigename: 'Unternehmer Nord',
    });
    expect(firestoreDbServiceMock.createServerTimestamp).toHaveBeenCalledOnce();
    expect(firestoreDbServiceMock.createDocument).toHaveBeenCalledWith('unternehmer', {
      ...anlage,
      nummer: 8,
      aktiv: true,
      erstelltAm: 'server-zeitstempel',
      aktualisiertAm: 'server-zeitstempel',
    });
  });

  it('should propagate Firestore errors', async () => {
    const error = { code: 'permission-denied' };
    firestoreDbServiceMock.createDocument.mockRejectedValue(error);
    const service = TestBed.inject(UnternehmerService);

    await expect(service.createUnternehmer(anlage, 1)).rejects.toBe(error);
  });
});
