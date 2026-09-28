// pur-system/src/app/services/firebase/firestore-db.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';

import {
  FIRESTORE_ADD_DOC,
  FIRESTORE_COLLECTION,
  FIRESTORE_DELETE_DOC,
  FIRESTORE_DOC,
  FIRESTORE_GET_DOC_FROM_CACHE,
  FIRESTORE_GET_DOC_FROM_SERVER,
  FIRESTORE_GET_DOCS_FROM_CACHE,
  FIRESTORE_GET_DOCS_FROM_SERVER,
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
  const getDocsFromCacheMock = vi.fn();
  const getDocsFromServerMock = vi.fn();
  const getDocFromCacheMock = vi.fn();
  const getDocFromServerMock = vi.fn();
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
    getDocsFromCacheMock.mockRejectedValue({ code: 'unavailable' });
    getDocsFromServerMock.mockResolvedValue({ docs: [] });
    getDocFromCacheMock.mockRejectedValue({ code: 'unavailable' });
    getDocFromServerMock.mockResolvedValue({ exists: () => false });
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
        { provide: FIRESTORE_GET_DOC_FROM_CACHE, useValue: getDocFromCacheMock },
        { provide: FIRESTORE_GET_DOC_FROM_SERVER, useValue: getDocFromServerMock },
        { provide: FIRESTORE_GET_DOCS_FROM_CACHE, useValue: getDocsFromCacheMock },
        { provide: FIRESTORE_GET_DOCS_FROM_SERVER, useValue: getDocsFromServerMock },
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
    getDocsFromServerMock.mockResolvedValue({
      docs: [{ id: 'dokument-1', data: () => ({ anzeigename: 'Eintrag' }) }],
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadCollection('unternehmer', 'networkOnly')).resolves.toEqual([
      { id: 'dokument-1', daten: { anzeigename: 'Eintrag' } },
    ]);
    expect(trackLoadMock).toHaveBeenCalledWith(expect.any(Function));
    expect(collectionMock).toHaveBeenCalledWith(firestoreMock, 'unternehmer');
    expect(getDocsFromServerMock).toHaveBeenCalledWith('collection-ref');
  });

  it('should share parallel collection loads for the same path', async () => {
    let resolveSnapshot!: (value: { docs: [] }) => void;
    getDocsFromServerMock.mockReturnValue(
      new Promise<{ docs: [] }>((resolve) => {
        resolveSnapshot = resolve;
      }),
    );
    const service = TestBed.inject(FirestoreDbService);

    const ersterAuftrag = service.loadCollection('unternehmer', 'networkOnly');
    const zweiterAuftrag = service.loadCollection('unternehmer', 'networkOnly');

    expect(ersterAuftrag).toBe(zweiterAuftrag);
    expect(trackLoadMock).toHaveBeenCalledOnce();
    expect(getDocsFromServerMock).toHaveBeenCalledOnce();

    resolveSnapshot({ docs: [] });
    await Promise.all([ersterAuftrag, zweiterAuftrag]);
    await service.loadCollection('unternehmer', 'networkOnly');

    expect(trackLoadMock).toHaveBeenCalledTimes(2);
    expect(getDocsFromServerMock).toHaveBeenCalledTimes(2);
  });

  it('should load a collection filtered by an array value', async () => {
    getDocsFromServerMock.mockResolvedValue({
      docs: [{ id: 'm-1', data: () => ({ filialIds: ['b-1'] }) }],
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(
      service.loadCollectionByArrayValue(
        'unternehmer/u/firma/f/mitarbeiter',
        'filialIds',
        'b-1',
        'networkOnly',
      ),
    ).resolves.toEqual([{ id: 'm-1', daten: { filialIds: ['b-1'] } }]);
    expect(whereMock).toHaveBeenCalledWith('filialIds', 'array-contains', 'b-1');
    expect(queryMock).toHaveBeenCalledWith('collection-ref', 'where-constraint');
    expect(getDocsFromServerMock).toHaveBeenCalledWith('query-ref');
  });

  it('should load an existing document', async () => {
    getDocFromServerMock.mockResolvedValue({
      id: 'dokument-1',
      exists: () => true,
      data: () => ({ anzeigename: 'Eintrag' }),
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadDocument('unternehmer/dokument-1', 'networkOnly')).resolves.toEqual({
      id: 'dokument-1',
      daten: { anzeigename: 'Eintrag' },
    });
    expect(trackLoadMock).toHaveBeenCalledWith(expect.any(Function));
    expect(docMock).toHaveBeenCalledWith(firestoreMock, 'unternehmer/dokument-1');
    expect(getDocFromServerMock).toHaveBeenCalledWith('document-ref');
  });

  it('should return null for a missing document', async () => {
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadDocument('unternehmer/unbekannt', 'networkOnly')).resolves.toBeNull();
  });

  it('should read exclusively from cache with cacheOnly', async () => {
    getDocsFromCacheMock.mockResolvedValue({
      docs: [{ id: 'cache-1', data: () => ({ quelle: 'cache' }) }],
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadCollection('unternehmer', 'cacheOnly')).resolves.toEqual([
      { id: 'cache-1', daten: { quelle: 'cache' } },
    ]);
    expect(getDocsFromServerMock).not.toHaveBeenCalled();
  });

  it('should use a populated cache before the server with cacheFirst', async () => {
    getDocFromCacheMock.mockResolvedValue({
      id: 'cache-1',
      exists: () => true,
      data: () => ({ quelle: 'cache' }),
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadDocument('unternehmer/cache-1', 'cacheFirst')).resolves.toEqual({
      id: 'cache-1',
      daten: { quelle: 'cache' },
    });
    expect(getDocFromServerMock).not.toHaveBeenCalled();
  });

  it('should use the server when cacheFirst has no collection data', async () => {
    getDocsFromCacheMock.mockResolvedValue({ docs: [] });
    getDocsFromServerMock.mockResolvedValue({
      docs: [{ id: 'server-1', data: () => ({ quelle: 'server' }) }],
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadCollection('unternehmer', 'cacheFirst')).resolves.toEqual([
      { id: 'server-1', daten: { quelle: 'server' } },
    ]);
    expect(getDocsFromCacheMock).toHaveBeenCalledOnce();
    expect(getDocsFromServerMock).toHaveBeenCalledOnce();
  });

  it('should fall back to cache after a technical networkFirst server error', async () => {
    getDocFromServerMock.mockRejectedValue({ code: 'firestore/unavailable' });
    getDocFromCacheMock.mockResolvedValue({
      id: 'cache-1',
      exists: () => true,
      data: () => ({ quelle: 'cache' }),
    });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadDocument('unternehmer/cache-1', 'networkFirst')).resolves.toEqual({
      id: 'cache-1',
      daten: { quelle: 'cache' },
    });
  });

  it('should preserve a non-technical networkFirst server error without reading cache', async () => {
    const error = { code: 'permission-denied' };
    getDocFromServerMock.mockRejectedValue(error);
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadDocument('unternehmer/verboten', 'networkFirst')).rejects.toBe(error);
    expect(getDocFromCacheMock).not.toHaveBeenCalled();
  });

  it('should preserve a networkOnly server error', async () => {
    const error = { code: 'permission-denied' };
    getDocsFromServerMock.mockRejectedValue(error);
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadCollection('unternehmer', 'networkOnly')).rejects.toBe(error);
    expect(getDocsFromCacheMock).not.toHaveBeenCalled();
  });

  it('should preserve a cacheOnly cache error', async () => {
    const error = { code: 'unavailable' };
    getDocsFromCacheMock.mockRejectedValue(error);
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadCollection('unternehmer', 'cacheOnly')).rejects.toBe(error);
    expect(getDocsFromServerMock).not.toHaveBeenCalled();
  });

  it('should preserve the server error when cacheFirst cannot load data', async () => {
    const error = { code: 'permission-denied' };
    getDocsFromCacheMock.mockRejectedValue({ code: 'unavailable' });
    getDocsFromServerMock.mockRejectedValue(error);
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadCollection('unternehmer', 'cacheFirst')).rejects.toBe(error);
  });

  it('should preserve the server error when the networkFirst cache fallback fails', async () => {
    const error = { code: 'firestore/unavailable' };
    getDocFromServerMock.mockRejectedValue(error);
    getDocFromCacheMock.mockRejectedValue({ code: 'unavailable' });
    const service = TestBed.inject(FirestoreDbService);

    await expect(service.loadDocument('unternehmer/cache-fehlt', 'networkFirst')).rejects.toBe(
      error,
    );
  });

  it('should not share parallel requests with different reading strategies', async () => {
    getDocsFromCacheMock.mockResolvedValue({ docs: [] });
    const service = TestBed.inject(FirestoreDbService);

    await Promise.all([
      service.loadCollection('unternehmer', 'networkOnly'),
      service.loadCollection('unternehmer', 'cacheOnly'),
    ]);

    expect(trackLoadMock).toHaveBeenCalledTimes(2);
    expect(getDocsFromServerMock).toHaveBeenCalledOnce();
    expect(getDocsFromCacheMock).toHaveBeenCalledOnce();
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
    getDocFromServerMock.mockReturnValue(
      new Promise<{ exists: () => false }>((resolve) => {
        resolveSnapshot = resolve;
      }),
    );
    const service = TestBed.inject(FirestoreDbService);

    const ersterAuftrag = service.loadDocument('unternehmer/dokument-1', 'networkOnly');
    const zweiterAuftrag = service.loadDocument('unternehmer/dokument-1', 'networkOnly');

    expect(ersterAuftrag).toBe(zweiterAuftrag);
    expect(trackLoadMock).toHaveBeenCalledOnce();
    expect(getDocFromServerMock).toHaveBeenCalledOnce();

    resolveSnapshot({ exists: () => false });
    await Promise.all([ersterAuftrag, zweiterAuftrag]);

    expect(trackLoadMock).toHaveBeenCalledOnce();
    expect(getDocFromServerMock).toHaveBeenCalledOnce();
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
