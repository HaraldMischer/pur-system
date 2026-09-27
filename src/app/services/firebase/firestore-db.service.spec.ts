// pur-system/src/app/services/firebase/firestore-db.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';

import {
  FIRESTORE_ADD_DOC,
  FIRESTORE_COLLECTION,
  FIRESTORE_DELETE_DOC,
  FIRESTORE_DOC,
  FIRESTORE_GET_DOC,
  FIRESTORE_GET_DOCS,
  FIRESTORE_ON_SNAPSHOT,
  FIRESTORE_QUERY,
  FIRESTORE_SERVER_TIMESTAMP,
  FIRESTORE_SET_DOC,
  FIRESTORE_WHERE,
} from '../../commons/tokens/firebase.tokens';
import { LoadingService } from '../core/loading.service';
import { NetzwerkStatusService } from '../core/netzwerk-status.service';
import { FirestoreDbService } from './firestore-db.service';

describe('FirestoreDbService', () => {
  const firestoreMock = {} as Firestore;
  const collectionMock = vi.fn().mockReturnValue('collection-ref');
  const docMock = vi.fn().mockReturnValue('document-ref');
  const deleteDocMock = vi.fn();
  const getDocsMock = vi.fn();
  const getDocMock = vi.fn();
  const addDocMock = vi.fn();
  const onSnapshotMock = vi.fn();
  const queryMock = vi.fn().mockReturnValue('query-ref');
  const setDocMock = vi.fn();
  const unsubscribeMock = vi.fn();
  const serverTimestampMock = vi.fn().mockReturnValue('server-zeitstempel');
  const whereMock = vi.fn().mockReturnValue('where-constraint');
  const trackLoadMock = vi.fn(async <T>(aktion: () => Promise<T>): Promise<T> => {
    return aktion();
  });
  const trackWriteMock = vi.fn(async <T>(aktion: () => Promise<T>): Promise<T> => {
    return aktion();
  });
  const assertOnlineMock = vi.fn();
  let snapshotNext: (snapshot: {
    id: string;
    exists: () => boolean;
    data: () => Record<string, unknown>;
  }) => void;
  let snapshotError: (error: unknown) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    getDocsMock.mockResolvedValue({ docs: [] });
    getDocMock.mockResolvedValue({ exists: () => false });
    addDocMock.mockResolvedValue({ id: 'neu-123' });
    deleteDocMock.mockResolvedValue(undefined);
    onSnapshotMock.mockImplementation(
      (_documentRef: unknown, next: typeof snapshotNext, error: typeof snapshotError) => {
        snapshotNext = next;
        snapshotError = error;
        return unsubscribeMock;
      },
    );
    setDocMock.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        FirestoreDbService,
        { provide: Firestore, useValue: firestoreMock },
        { provide: FIRESTORE_ADD_DOC, useValue: addDocMock },
        { provide: FIRESTORE_COLLECTION, useValue: collectionMock },
        { provide: FIRESTORE_DELETE_DOC, useValue: deleteDocMock },
        { provide: FIRESTORE_DOC, useValue: docMock },
        { provide: FIRESTORE_GET_DOC, useValue: getDocMock },
        { provide: FIRESTORE_GET_DOCS, useValue: getDocsMock },
        { provide: FIRESTORE_ON_SNAPSHOT, useValue: onSnapshotMock },
        { provide: FIRESTORE_QUERY, useValue: queryMock },
        { provide: FIRESTORE_SERVER_TIMESTAMP, useValue: serverTimestampMock },
        { provide: FIRESTORE_SET_DOC, useValue: setDocMock },
        { provide: FIRESTORE_WHERE, useValue: whereMock },
        {
          provide: LoadingService,
          useValue: { trackLoad: trackLoadMock, trackWrite: trackWriteMock },
        },
        { provide: NetzwerkStatusService, useValue: { assertOnline: assertOnlineMock } },
      ],
    });
  });

  it('should load a collection with document ids', async () => {
    getDocsMock.mockResolvedValue({
      docs: [{ id: 'dokument-1', data: () => ({ anzeigename: 'Eintrag' }) }],
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadCollection('unternehmer')).resolves.toEqual([
      { id: 'dokument-1', daten: { anzeigename: 'Eintrag' } },
    ]);
    expect(trackLoadMock).toHaveBeenCalledWith(expect.any(Function));
    expect(collectionMock).toHaveBeenCalledWith(firestoreMock, 'unternehmer');
    expect(getDocsMock).toHaveBeenCalledWith('collection-ref');
  });

  it('should share parallel collection loads for the same path', async () => {
    let resolveSnapshot!: (value: { docs: [] }) => void;
    getDocsMock.mockReturnValue(
      new Promise<{ docs: [] }>((resolve) => {
        resolveSnapshot = resolve;
      }),
    );
    const service = TestBed.inject(FirestoreDbService);

    const ersterAuftrag = service.loadCollection('unternehmer');
    const zweiterAuftrag = service.loadCollection('unternehmer');

    expect(ersterAuftrag).toBe(zweiterAuftrag);
    expect(trackLoadMock).toHaveBeenCalledOnce();
    expect(getDocsMock).toHaveBeenCalledOnce();

    resolveSnapshot({ docs: [] });
    await Promise.all([ersterAuftrag, zweiterAuftrag]);
    await service.loadCollection('unternehmer');

    expect(trackLoadMock).toHaveBeenCalledTimes(2);
    expect(getDocsMock).toHaveBeenCalledTimes(2);
  });

  it('should load a collection filtered by an array value', async () => {
    getDocsMock.mockResolvedValue({
      docs: [{ id: 'm-1', data: () => ({ filialIds: ['b-1'] }) }],
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(
      service.loadCollectionByArrayValue('unternehmer/u/firma/f/mitarbeiter', 'filialIds', 'b-1'),
    ).resolves.toEqual([{ id: 'm-1', daten: { filialIds: ['b-1'] } }]);
    expect(whereMock).toHaveBeenCalledWith('filialIds', 'array-contains', 'b-1');
    expect(queryMock).toHaveBeenCalledWith('collection-ref', 'where-constraint');
    expect(getDocsMock).toHaveBeenCalledWith('query-ref');
  });

  it('should load an existing document', async () => {
    getDocMock.mockResolvedValue({
      id: 'dokument-1',
      exists: () => true,
      data: () => ({ anzeigename: 'Eintrag' }),
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadDocument('unternehmer/dokument-1')).resolves.toEqual({
      id: 'dokument-1',
      daten: { anzeigename: 'Eintrag' },
    });
    expect(trackLoadMock).toHaveBeenCalledWith(expect.any(Function));
    expect(docMock).toHaveBeenCalledWith(firestoreMock, 'unternehmer/dokument-1');
    expect(getDocMock).toHaveBeenCalledWith('document-ref');
  });

  it('should return null for a missing document', async () => {
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadDocument('unternehmer/unbekannt')).resolves.toBeNull();
  });

  it('should delete a document while tracking the write', async () => {
    const service = TestBed.inject(FirestoreDbService);

    await service.deleteDocument('unternehmer/u-1/firma/f-1/mitarbeiter/m-1');

    expect(assertOnlineMock).toHaveBeenCalledOnce();
    expect(docMock).toHaveBeenCalledWith(
      firestoreMock,
      'unternehmer/u-1/firma/f-1/mitarbeiter/m-1',
    );
    expect(deleteDocMock).toHaveBeenCalledWith('document-ref');
    expect(trackWriteMock).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should share parallel document loads for the same path', async () => {
    let resolveSnapshot!: (value: { exists: () => false }) => void;
    getDocMock.mockReturnValue(
      new Promise<{ exists: () => false }>((resolve) => {
        resolveSnapshot = resolve;
      }),
    );
    const service = TestBed.inject(FirestoreDbService);

    const ersterAuftrag = service.loadDocument('unternehmer/dokument-1');
    const zweiterAuftrag = service.loadDocument('unternehmer/dokument-1');

    expect(ersterAuftrag).toBe(zweiterAuftrag);
    expect(trackLoadMock).toHaveBeenCalledOnce();
    expect(getDocMock).toHaveBeenCalledOnce();

    resolveSnapshot({ exists: () => false });
    await Promise.all([ersterAuftrag, zweiterAuftrag]);

    expect(trackLoadMock).toHaveBeenCalledOnce();
    expect(getDocMock).toHaveBeenCalledOnce();
  });

  it('should observe document updates and return the unsubscribe function', () => {
    const next = vi.fn();
    const error = vi.fn();
    const service = TestBed.inject(FirestoreDbService);

    const unsubscribe = service.observeDocument('benutzerprofil/benutzer-123', next, error);
    snapshotNext({
      id: 'benutzer-123',
      exists: () => true,
      data: () => ({ aktiv: false }),
    });
    snapshotNext({
      id: 'benutzer-123',
      exists: () => false,
      data: () => ({}),
    });
    const listenerError = { code: 'permission-denied' };
    snapshotError(listenerError);
    unsubscribe();

    expect(docMock).toHaveBeenCalledWith(firestoreMock, 'benutzerprofil/benutzer-123');
    expect(onSnapshotMock).toHaveBeenCalledWith(
      'document-ref',
      expect.any(Function),
      expect.any(Function),
    );
    expect(next).toHaveBeenNthCalledWith(1, {
      id: 'benutzer-123',
      daten: { aktiv: false },
    });
    expect(next).toHaveBeenNthCalledWith(2, null);
    expect(error).toHaveBeenCalledWith(listenerError);
    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });

  it('should create a document and return its id', async () => {
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.createDocument('unternehmer', { aktiv: true })).resolves.toBe('neu-123');
    expect(assertOnlineMock).toHaveBeenCalledOnce();
    expect(trackWriteMock).toHaveBeenCalledWith(expect.any(Function));
    expect(addDocMock).toHaveBeenCalledWith('collection-ref', { aktiv: true });
  });

  it('should update a document with merge', async () => {
    const service = TestBed.inject(FirestoreDbService);

    await service.updateDocument('unternehmer/dokument-1', { aktiv: false });

    expect(assertOnlineMock).toHaveBeenCalledOnce();
    expect(trackWriteMock).toHaveBeenCalledWith(expect.any(Function));
    expect(setDocMock).toHaveBeenCalledWith('document-ref', { aktiv: false }, { merge: true });
  });

  it('should reject writes before accessing Firestore while offline', async () => {
    const error = { code: 'app/offline' };
    assertOnlineMock.mockImplementation(() => {
      throw error;
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.createDocument('unternehmer', { aktiv: true })).rejects.toBe(error);
    await expect(service.updateDocument('unternehmer/dokument-1', { aktiv: false })).rejects.toBe(
      error,
    );
    expect(addDocMock).not.toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
    expect(trackWriteMock).not.toHaveBeenCalled();
  });

  it('should create a server timestamp', () => {
    const service = TestBed.inject(FirestoreDbService);

    expect(service.createServerTimestamp()).toBe('server-zeitstempel');
  });
});
