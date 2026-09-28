// pur-system/src/app/services/domain/mitarbeiter.service.spec.ts

import { TestBed } from '@angular/core/testing';

import {
  IMitarbeiterAktualisierung,
  IMitarbeiterAnlage,
} from '../../commons/models/domain/mitarbeiter';
import { EGender } from '../../commons/models/domain/person';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { MitarbeiterService } from './mitarbeiter.service';

describe('MitarbeiterService', () => {
  const firestoreDbServiceMock = {
    loadCollection: vi.fn(),
    loadCollectionByArrayValue: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    createServerTimestamp: vi.fn(),
  };
  const anlage: IMitarbeiterAnlage = {
    person: {
      vorname: 'Mia',
      nachname: 'Muster',
      adresse: {
        strasse: 'Musterstraße',
        hausnummer: '1',
        postleitzahl: '12345',
        ort: 'Musterstadt',
      },
      kontakt: { email: 'mia@example.com' },
      geburtstag: '1990-01-02',
      geschlecht: EGender.FEMALE,
    },
    rolle: 'service',
    filialIds: ['filiale-1'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreDbServiceMock.loadCollection.mockResolvedValue([]);
    firestoreDbServiceMock.loadCollectionByArrayValue.mockResolvedValue([]);
    firestoreDbServiceMock.createDocument.mockResolvedValue('mitarbeiter-123');
    firestoreDbServiceMock.updateDocument.mockResolvedValue(undefined);
    firestoreDbServiceMock.deleteDocument.mockResolvedValue(undefined);
    firestoreDbServiceMock.createServerTimestamp.mockReturnValue('server-zeitstempel');

    TestBed.configureTestingModule({
      providers: [
        MitarbeiterService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
      ],
    });
  });

  it('should load, normalize and sort company employees', async () => {
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      {
        id: 'z',
        daten: {
          ...anlage,
          person: { ...anlage.person, vorname: ' Zoe ', nachname: ' Zimmer ' },
          filialIds: ['filiale-2', 'filiale-2', ' filiale-1 '],
          aktiv: true,
          benutzerUid: 'intern',
        },
      },
      {
        id: 'a',
        daten: {
          ...anlage,
          person: { ...anlage.person, vorname: ' Anton ', nachname: ' Albrecht ' },
          rolle: 'kasse',
          filialIds: [],
          aktiv: false,
        },
      },
    ]);
    const service = TestBed.inject(MitarbeiterService);

    await expect(service.loadMitarbeiter('unternehmer-1', 'firma-1')).resolves.toEqual([
      {
        id: 'a',
        unternehmerId: 'unternehmer-1',
        firmaId: 'firma-1',
        person: { ...anlage.person, vorname: 'Anton', nachname: 'Albrecht' },
        rolle: 'kasse',
        filialIds: [],
        aktiv: false,
      },
      {
        id: 'z',
        unternehmerId: 'unternehmer-1',
        firmaId: 'firma-1',
        person: { ...anlage.person, vorname: 'Zoe', nachname: 'Zimmer' },
        rolle: 'service',
        filialIds: ['filiale-2', 'filiale-1'],
        aktiv: true,
      },
    ]);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'unternehmer/unternehmer-1/firma/firma-1/mitarbeiter',
      'networkOnly',
    );
  });

  it('should map malformed optional employee data without exposing the user reference', async () => {
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      {
        id: 'm-1',
        daten: {
          person: {
            vorname: 42,
            nachname: ' Test ',
            adresse: null,
            kontakt: { email: ' ', telefon: ' 123 ' },
            geschlecht: 'unbekannt',
          },
          rolle: 'unbekannt',
          filialIds: [' ', null, 'filiale-1'],
          benutzerUid: 'auth-1',
        },
      },
    ]);
    const service = TestBed.inject(MitarbeiterService);

    await expect(service.loadMitarbeiter('u', 'f')).resolves.toEqual([
      {
        id: 'm-1',
        unternehmerId: 'u',
        firmaId: 'f',
        person: {
          vorname: '',
          nachname: 'Test',
          adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
          kontakt: { telefon: '123' },
        },
        rolle: 'service',
        filialIds: ['filiale-1'],
        aktiv: false,
      },
    ]);
  });

  it('should filter company employees by branch for a branch account', async () => {
    const service = TestBed.inject(MitarbeiterService);

    await service.loadMitarbeiter('u', 'f', 'b-1');

    expect(firestoreDbServiceMock.loadCollectionByArrayValue).toHaveBeenCalledWith(
      'unternehmer/u/firma/f/mitarbeiter',
      'filialIds',
      'b-1',
      'networkOnly',
    );
    expect(firestoreDbServiceMock.loadCollection).not.toHaveBeenCalled();
  });

  it('should create an active employee with server timestamps', async () => {
    const service = TestBed.inject(MitarbeiterService);

    await expect(service.createMitarbeiter('u', 'f', anlage)).resolves.toEqual({
      id: 'mitarbeiter-123',
    });
    expect(firestoreDbServiceMock.createDocument).toHaveBeenCalledWith(
      'unternehmer/u/firma/f/mitarbeiter',
      {
        ...anlage,
        aktiv: true,
        erstelltAm: 'server-zeitstempel',
        aktualisiertAm: 'server-zeitstempel',
      },
    );
  });

  it('should update editable employee data without overwriting the user reference', async () => {
    const aktualisierung: IMitarbeiterAktualisierung = {
      ...anlage,
      aktiv: false,
    };
    const service = TestBed.inject(MitarbeiterService);

    await service.updateMitarbeiter('u', 'f', 'm-1', aktualisierung);

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith(
      'unternehmer/u/firma/f/mitarbeiter/m-1',
      {
        ...aktualisierung,
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument.mock.calls[0][1]).not.toHaveProperty(
      'benutzerUid',
    );
  });

  it('should delete an employee document', async () => {
    const service = TestBed.inject(MitarbeiterService);

    await service.deleteMitarbeiter('u', 'f', 'm-1');

    expect(firestoreDbServiceMock.deleteDocument).toHaveBeenCalledWith(
      'unternehmer/u/firma/f/mitarbeiter/m-1',
    );
  });

  it('should propagate Firestore errors', async () => {
    const error = { code: 'permission-denied' };
    firestoreDbServiceMock.createDocument.mockRejectedValue(error);
    const service = TestBed.inject(MitarbeiterService);

    await expect(service.createMitarbeiter('u', 'f', anlage)).rejects.toBe(error);
  });
});
