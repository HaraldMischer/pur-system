// pur-system/src/app/services/domain/mitarbeiter.service.spec.ts

import { TestBed } from '@angular/core/testing';

import {
  IMitarbeiterAktualisierung,
  IMitarbeiterAnlage,
} from '../../commons/models/domain/mitarbeiter';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { MitarbeiterService } from './mitarbeiter.service';

describe('MitarbeiterService', () => {
  const firestoreDbServiceMock = {
    loadCollection: vi.fn(),
    loadCollectionByArrayValue: vi.fn(),
    loadCollectionByAnyArrayValue: vi.fn(),
    loadDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    replaceDocumentFields: vi.fn(),
    deleteDocument: vi.fn(),
    updateDocumentsAtomically: vi.fn(),
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
    },
    rollen: ['servicekraft'],
    filialIds: ['filiale-1'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreDbServiceMock.loadCollection.mockResolvedValue([]);
    firestoreDbServiceMock.loadCollectionByArrayValue.mockResolvedValue([]);
    firestoreDbServiceMock.loadCollectionByAnyArrayValue.mockResolvedValue([]);
    firestoreDbServiceMock.loadDocument.mockResolvedValue(null);
    firestoreDbServiceMock.createDocument.mockResolvedValue('mitarbeiter-123');
    firestoreDbServiceMock.updateDocument.mockResolvedValue(undefined);
    firestoreDbServiceMock.replaceDocumentFields.mockResolvedValue(undefined);
    firestoreDbServiceMock.deleteDocument.mockResolvedValue(undefined);
    firestoreDbServiceMock.updateDocumentsAtomically.mockResolvedValue(undefined);
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
          person: {
            ...anlage.person,
            vorname: ' Zoe ',
            nachname: ' Zimmer ',
            geschlecht: 'weiblich',
          },
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
          rollen: ['filialkasse'],
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
        rollen: ['filialkasse'],
        filialIds: [],
        aktiv: false,
      },
      {
        id: 'z',
        unternehmerId: 'unternehmer-1',
        firmaId: 'firma-1',
        person: { ...anlage.person, vorname: 'Zoe', nachname: 'Zimmer' },
        rollen: ['servicekraft'],
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
          rollen: ['unbekannt'],
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
        rollen: ['servicekraft'],
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

  it('should load employees of multiple branches with one query', async () => {
    firestoreDbServiceMock.loadCollectionByAnyArrayValue.mockResolvedValue([
      {
        id: 'm-1',
        daten: {
          ...anlage,
          filialIds: ['b-1', 'b-2'],
          aktiv: true,
        },
      },
    ]);
    const service = TestBed.inject(MitarbeiterService);

    await expect(
      service.loadMitarbeiterNachFilialen('u', 'f', ['b-2', 'b-1', 'b-2']),
    ).resolves.toEqual([
      {
        ...anlage,
        id: 'm-1',
        unternehmerId: 'u',
        firmaId: 'f',
        filialIds: ['b-1', 'b-2'],
        aktiv: true,
      },
    ]);
    expect(firestoreDbServiceMock.loadCollectionByAnyArrayValue).toHaveBeenCalledOnce();
    expect(firestoreDbServiceMock.loadCollectionByAnyArrayValue).toHaveBeenCalledWith(
      'unternehmer/u/firma/f/mitarbeiter',
      'filialIds',
      ['b-2', 'b-1'],
      'networkOnly',
    );
  });

  it('should not query employees without assigned branches', async () => {
    const service = TestBed.inject(MitarbeiterService);

    await expect(service.loadMitarbeiterNachFilialen('u', 'f', [])).resolves.toEqual([]);
    expect(firestoreDbServiceMock.loadCollectionByAnyArrayValue).not.toHaveBeenCalled();
  });

  it('should load and map a single employee document', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'm-1',
      daten: {
        ...anlage,
        filialIds: ['filiale-2', 'filiale-2', ' filiale-1 '],
        aktiv: true,
      },
    });
    const service = TestBed.inject(MitarbeiterService);

    await expect(service.loadMitarbeiterEintrag('u', 'f', 'm-1', 'cacheOnly')).resolves.toEqual({
      ...anlage,
      id: 'm-1',
      unternehmerId: 'u',
      firmaId: 'f',
      filialIds: ['filiale-2', 'filiale-1'],
      aktiv: true,
    });
    expect(firestoreDbServiceMock.loadDocument).toHaveBeenCalledWith(
      'unternehmer/u/firma/f/mitarbeiter/m-1',
      'cacheOnly',
    );
  });

  it('should return null for a missing employee document', async () => {
    const service = TestBed.inject(MitarbeiterService);

    await expect(service.loadMitarbeiterEintrag('u', 'f', 'm-1')).resolves.toBeNull();
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
        anzeigename: 'Mia Muster',
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
        anzeigename: 'Mia Muster',
        aktualisiertAm: 'server-zeitstempel',
      },
    );
    expect(firestoreDbServiceMock.updateDocument.mock.calls[0][1]).not.toHaveProperty(
      'benutzerUid',
    );
  });

  it('should delete an employee and remove matching migration mappings atomically', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({ id: 'm-1', daten: anlage });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      {
        id: 'kunde-1',
        daten: {
          unternehmerId: 'u',
          firmenIds: { 'firma-alt': 'f' },
          mitarbeiterIds: {
            'firma-alt': { 'filiale-alt': { 'mitarbeiter-alt': 'm-1' } },
          },
        },
      },
    ]);
    const service = TestBed.inject(MitarbeiterService);

    await service.deleteMitarbeiter('u', 'f', 'm-1');

    expect(firestoreDbServiceMock.updateDocumentsAtomically).toHaveBeenCalledWith([
      {
        documentPath: 'unternehmer/u/firma/f/mitarbeiter/m-1',
        delete: true,
      },
      {
        documentPath: 'systemMigrationen/kunde-1',
        daten: {
          mitarbeiterIds: { 'firma-alt': { 'filiale-alt': {} } },
          aktualisiertAm: 'server-zeitstempel',
        },
        replaceFields: true,
      },
    ]);
  });

  it('should merge employees and redirect all matching migration mappings atomically', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'm-quelle',
        daten: { ...anlage, rollen: ['techniker'], filialIds: ['b-1'], aktiv: false },
      })
      .mockResolvedValueOnce({
        id: 'm-ziel',
        daten: { ...anlage, filialIds: ['b-2'], aktiv: true },
      });
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      {
        id: 'kunde-1',
        daten: {
          unternehmerId: 'u',
          firmenIds: { 'firma-alt': 'f' },
          mitarbeiterIds: {
            'firma-alt': {
              'filiale-alt': {
                'mitarbeiter-alt-1': 'm-quelle',
                'mitarbeiter-alt-2': 'm-ziel',
              },
            },
          },
        },
      },
    ]);
    const service = TestBed.inject(MitarbeiterService);

    await service.mergeMitarbeiter('u', 'f', 'm-quelle', 'm-ziel');

    expect(firestoreDbServiceMock.updateDocumentsAtomically).toHaveBeenCalledWith([
      {
        documentPath: 'unternehmer/u/firma/f/mitarbeiter/m-ziel',
        daten: {
          filialIds: ['b-2', 'b-1'],
          rollen: ['servicekraft', 'techniker'],
          aktualisiertAm: 'server-zeitstempel',
        },
      },
      {
        documentPath: 'unternehmer/u/firma/f/mitarbeiter/m-quelle',
        delete: true,
      },
      {
        documentPath: 'systemMigrationen/kunde-1',
        daten: {
          mitarbeiterIds: {
            'firma-alt': {
              'filiale-alt': {
                'mitarbeiter-alt-1': 'm-ziel',
                'mitarbeiter-alt-2': 'm-ziel',
              },
            },
          },
          aktualisiertAm: 'server-zeitstempel',
        },
        replaceFields: true,
      },
    ]);
  });

  it('should propagate Firestore errors', async () => {
    const error = { code: 'permission-denied' };
    firestoreDbServiceMock.createDocument.mockRejectedValue(error);
    const service = TestBed.inject(MitarbeiterService);

    await expect(service.createMitarbeiter('u', 'f', anlage)).rejects.toBe(error);
  });
});
