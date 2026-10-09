// pur-system/src/app/services/domain/dienstplan.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { IDienstplanVersionDokument } from '../../commons/models/domain/dienstplan';
import { ISchichtAnlage, ISchichtEintrag } from '../../commons/models/domain/schicht';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { DienstplanService } from './dienstplan.service';

describe('DienstplanService', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const monatsPfad = { ...pfad, dienstplanId: '2026-10' };
  const versionsPfad = { ...monatsPfad, versionId: 'v-1' };
  const loadDocumentMock = vi.fn();
  const loadCollectionMock = vi.fn();
  const createDocumentIdMock = vi.fn();
  const createServerTimestampMock = vi.fn();
  const updateDocumentsAtomicallyMock = vi.fn();
  const executeDocumentTransactionMock = vi.fn();
  const firestoreDbServiceMock = {
    loadDocument: loadDocumentMock,
    loadCollection: loadCollectionMock,
    createDocumentId: createDocumentIdMock,
    createServerTimestamp: createServerTimestampMock,
    updateDocumentsAtomically: updateDocumentsAtomicallyMock,
    executeDocumentTransaction: executeDocumentTransactionMock,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    loadDocumentMock.mockResolvedValue(null);
    loadCollectionMock.mockResolvedValue([]);
    createDocumentIdMock.mockReturnValue('neu-1');
    createServerTimestampMock.mockReturnValue('server-zeitstempel');
    updateDocumentsAtomicallyMock.mockResolvedValue(undefined);
    executeDocumentTransactionMock.mockImplementation(
      async (_path: string, aktion: (version: unknown) => unknown) => {
        return (
          aktion({
            id: 'v-1',
            daten: createVersionDokument(),
          }) as { ergebnis: unknown }
        ).ergebnis;
      },
    );

    TestBed.configureTestingModule({
      providers: [
        DienstplanService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
      ],
    });
  });

  it('should return an empty monthly result for a missing service plan', async () => {
    const service = TestBed.inject(DienstplanService);

    await expect(service.loadDienstplanMonat(monatsPfad, false)).resolves.toEqual({
      dienstplaene: [],
      versionen: [],
      schichten: [],
    });
    expect(loadDocumentMock).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10',
      'networkOnly',
    );
  });

  it('should load only the current published version for an employee view', async () => {
    loadDocumentMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/dienstplan/2026-10')) {
        return {
          id: '2026-10',
          daten: createDienstplanDokument({
            entwurfVersionId: 'v-2',
            veroeffentlichteVersionId: 'v-1',
          }),
        };
      }
      return { id: 'v-1', daten: createVersionDokument({ status: 'veroeffentlicht' }) };
    });
    loadCollectionMock.mockResolvedValue([
      { id: 's-1', daten: createSchichtDokument('2026-10-05T08:00') },
    ]);
    const service = TestBed.inject(DienstplanService);

    const bestand = await service.loadDienstplanMonat(monatsPfad, true);

    expect(bestand.versionen).toEqual([
      expect.objectContaining({ id: 'v-1', status: 'veroeffentlicht' }),
    ]);
    expect(bestand.schichten).toEqual([expect.objectContaining({ id: 's-1', versionId: 'v-1' })]);
    expect(loadDocumentMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/version/v-2'),
      expect.anything(),
    );
  });

  it('should load and sort the complete branch inventory', async () => {
    loadCollectionMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/dienstplan')) {
        return [
          { id: '2026-11', daten: createDienstplanDokument() },
          { id: '2026-10', daten: createDienstplanDokument() },
        ];
      }
      if (path.endsWith('/version')) {
        return [
          { id: `${path.includes('2026-10') ? 'v-1' : 'v-2'}`, daten: createVersionDokument() },
        ];
      }
      return [{ id: 's-1', daten: createSchichtDokument('2026-10-05T08:00') }];
    });
    const service = TestBed.inject(DienstplanService);

    const bestand = await service.loadDienstplanBestand(pfad, 'networkFirst');

    expect(bestand.dienstplaene.map((dienstplan) => dienstplan.id)).toEqual(['2026-10', '2026-11']);
    expect(bestand.versionen.map((version) => `${version.dienstplanId}/${version.id}`)).toEqual([
      '2026-10/v-1',
      '2026-11/v-2',
    ]);
    expect(bestand.schichten).toHaveLength(2);
    expect(loadCollectionMock).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan',
      'networkFirst',
    );
  });

  it('should create an initial monthly plan and draft atomically', async () => {
    const service = TestBed.inject(DienstplanService);

    const ergebnis = await service.createDienstplan(pfad, '2024-02', 'uid-1');

    expect(ergebnis.dienstplan).toEqual(
      expect.objectContaining({
        id: '2024-02',
        zeitraumStart: '2024-02-01',
        zeitraumEnde: '2024-02-29',
        entwurfVersionId: 'neu-1',
      }),
    );
    expect(ergebnis.version).toEqual(
      expect.objectContaining({ id: 'neu-1', nummer: 1, revision: 0, status: 'entwurf' }),
    );
    expect(updateDocumentsAtomicallyMock).toHaveBeenCalledOnce();
    expect(updateDocumentsAtomicallyMock.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2024-02',
      }),
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2024-02/version/neu-1',
      }),
    ]);
  });

  it('should create a shift together with the next draft revision', async () => {
    const service = TestBed.inject(DienstplanService);

    const ergebnis = await service.createSchicht(versionsPfad, 2, createSchichtAnlage(), 'uid-1');

    expect(ergebnis).toEqual({
      schicht: expect.objectContaining({ id: 'neu-1', versionId: 'v-1' }),
      versionRevision: 3,
    });
    const transaktion = executeDocumentTransactionMock.mock.calls[0];
    expect(transaktion[0]).toBe(
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
    );
    const operationen = transaktion[1]({ id: 'v-1', daten: createVersionDokument() }).operationen;
    expect(operationen).toEqual([
      expect.objectContaining({ daten: expect.objectContaining({ revision: 3 }) }),
      expect.objectContaining({
        documentPath:
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1/schicht/neu-1',
      }),
    ]);
  });

  it('should reject a stale revision before creating transaction operations', async () => {
    executeDocumentTransactionMock.mockImplementationOnce(
      async (_path: string, aktion: (version: unknown) => unknown) => {
        return aktion({ id: 'v-1', daten: createVersionDokument({ revision: 3 }) });
      },
    );
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createSchicht(versionsPfad, 2, createSchichtAnlage(), 'uid-1'),
    ).rejects.toThrow('Der Dienstplan wurde zwischenzeitlich geändert. Bitte lade ihn erneut.');
  });

  it('should update and delete shifts with their current draft revision', async () => {
    const service = TestBed.inject(DienstplanService);
    const schicht = createSchichtEintrag();

    await expect(
      service.updateSchicht(versionsPfad, schicht, 2, createSchichtAnlage(), 'uid-1'),
    ).resolves.toEqual(expect.objectContaining({ versionRevision: 3 }));
    await expect(service.deleteSchicht(versionsPfad, schicht, 2, 'uid-1')).resolves.toEqual(
      expect.objectContaining({ versionRevision: 3 }),
    );
  });

  function createDienstplanDokument(overrides = {}) {
    return {
      zeitraumStart: '2026-10-01',
      zeitraumEnde: '2026-10-31',
      zeitzone: 'Europe/Berlin',
      naechsteVersionsnummer: 2,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
      ...overrides,
    };
  }

  function createVersionDokument(
    overrides: Partial<IDienstplanVersionDokument> = {},
  ): IDienstplanVersionDokument {
    return {
      nummer: 1,
      revision: 2,
      status: 'entwurf',
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
      ...overrides,
    };
  }

  function createSchichtAnlage(): ISchichtAnlage {
    return {
      mitarbeiterId: 'm-1',
      mitarbeiterAnzeigename: 'Mia Muster',
      schichtvorlageId: 'sv-1',
      schichtvorlageBezeichnung: 'Frühschicht',
      beginn: Timestamp.fromDate(new Date('2026-10-05T08:00:00+02:00')),
      ende: Timestamp.fromDate(new Date('2026-10-05T16:00:00+02:00')),
      pauseMinuten: 30,
    };
  }

  function createSchichtDokument(beginn: string) {
    return {
      ...createSchichtAnlage(),
      beginn: Timestamp.fromDate(new Date(`${beginn}:00+02:00`)),
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
  }

  function createSchichtEintrag(): ISchichtEintrag {
    return {
      ...createSchichtAnlage(),
      ...versionsPfad,
      id: 's-1',
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
  }
});
