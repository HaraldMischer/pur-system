// pur-system/src/app/services/domain/dienstplan.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { IDienstplanVersionDokument } from '../../commons/models/domain/dienstplan';
import { ISchichtAnlage, ISchichtEintrag } from '../../commons/models/domain/schicht';
import { ISchichtmodellBestand } from '../../commons/models/domain/schichtmodell';
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
    loadDocumentMock.mockImplementation(async (path: string) => {
      return path.endsWith('/modellschicht/frueh')
        ? { id: 'frueh', daten: createModellschichtDaten() }
        : null;
    });
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
      modellschichten: [],
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
    loadCollectionMock.mockImplementation(async (path: string) => {
      return path.endsWith('/modellschicht')
        ? [{ id: 'frueh', daten: createModellschichtDaten() }]
        : [{ id: 's-1', daten: createSchichtDokument('2026-10-05T08:00') }];
    });
    const service = TestBed.inject(DienstplanService);

    const bestand = await service.loadDienstplanMonat(monatsPfad, true);

    expect(bestand.versionen).toEqual([
      expect.objectContaining({ id: 'v-1', status: 'veroeffentlicht' }),
    ]);
    expect(bestand.schichten).toEqual([expect.objectContaining({ id: 's-1', versionId: 'v-1' })]);
    expect(bestand.schichten[0]).not.toHaveProperty('mitarbeiterAnzeigename');
    expect(bestand.modellschichten).toEqual([
      expect.objectContaining({ id: 'frueh', dienstplanId: '2026-10' }),
    ]);
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
      if (path.endsWith('/modellschicht')) {
        return [{ id: 'frueh', daten: createModellschichtDaten() }];
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
    expect(bestand.modellschichten).toHaveLength(2);
    expect(loadCollectionMock).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan',
      'networkFirst',
    );
  });

  it('should create an initial monthly plan and draft atomically', async () => {
    const service = TestBed.inject(DienstplanService);

    const ergebnis = await service.createDienstplan(
      pfad,
      '2024-02',
      createSchichtmodell(),
      'uid-1',
    );

    expect(ergebnis.dienstplan).toEqual(
      expect.objectContaining({
        id: '2024-02',
        zeitraumStart: '2024-02-01',
        zeitraumEnde: '2024-02-29',
        entwurfVersionId: 'neu-1',
        schichtmodellId: 'modell-1',
        schichtmodellBezeichnung: 'Sommer',
      }),
    );
    expect(ergebnis.version).toEqual(
      expect.objectContaining({ id: 'neu-1', nummer: 1, revision: 0, status: 'entwurf' }),
    );
    expect(updateDocumentsAtomicallyMock).toHaveBeenCalledOnce();
    expect(ergebnis.modellschichten).toEqual([
      expect.objectContaining({ id: 'frueh', dienstplanId: '2024-02' }),
    ]);
    expect(updateDocumentsAtomicallyMock.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2024-02',
      }),
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2024-02/version/neu-1',
      }),
      expect.objectContaining({
        documentPath:
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2024-02/modellschicht/frueh',
        daten: createModellschichtDaten(),
      }),
    ]);
  });

  it('should reject inactive, empty and foreign models before writing', async () => {
    const service = TestBed.inject(DienstplanService);
    const schichtmodell = createSchichtmodell();

    await expect(
      service.createDienstplan(
        pfad,
        '2026-10',
        {
          ...schichtmodell,
          schichtmodell: { ...schichtmodell.schichtmodell, aktiv: false },
        },
        'uid-1',
      ),
    ).rejects.toThrow('Für einen neuen Dienstplan muss das Schichtmodell aktiv sein.');
    await expect(
      service.createDienstplan(pfad, '2026-10', { ...schichtmodell, modellschichten: [] }, 'uid-1'),
    ).rejects.toThrow('Das Schichtmodell enthält keine Schichten.');
    await expect(
      service.createDienstplan(
        pfad,
        '2026-10',
        {
          ...schichtmodell,
          schichtmodell: { ...schichtmodell.schichtmodell, filialeId: 'b-2' },
        },
        'uid-1',
      ),
    ).rejects.toThrow('Das Schichtmodell gehört nicht zu dieser Filiale.');
    expect(updateDocumentsAtomicallyMock).not.toHaveBeenCalled();
  });

  it('should delete an empty never-published plan with its draft and model snapshot', async () => {
    loadDocumentMock.mockResolvedValue({
      id: '2026-10',
      daten: createDienstplanDokument({ entwurfVersionId: 'v-1' }),
    });
    loadCollectionMock.mockImplementation(async (path: string) => {
      return path.endsWith('/modellschicht')
        ? [{ id: 'frueh', daten: createModellschichtDaten() }]
        : [];
    });
    const service = TestBed.inject(DienstplanService);

    await service.deleteDienstplan(versionsPfad, 2);

    const transaktion = executeDocumentTransactionMock.mock.calls[0];
    expect(transaktion[0]).toBe(
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
    );
    expect(transaktion[1]({ id: 'v-1', daten: createVersionDokument() }).operationen).toEqual([
      {
        documentPath:
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/modellschicht/frueh',
        delete: true,
      },
      {
        documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
        delete: true,
      },
      {
        documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10',
        delete: true,
      },
    ]);
  });

  it('should reject deleting a plan when the server draft contains a shift', async () => {
    loadDocumentMock.mockResolvedValue({
      id: '2026-10',
      daten: createDienstplanDokument({ entwurfVersionId: 'v-1' }),
    });
    loadCollectionMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/schicht')) {
        return [{ id: 's-1', daten: createSchichtDokument('2026-10-05T08:00') }];
      }
      return [{ id: 'frueh', daten: createModellschichtDaten() }];
    });
    const service = TestBed.inject(DienstplanService);

    await expect(service.deleteDienstplan(versionsPfad, 2)).rejects.toThrow(
      'Lösche zuerst alle Schichten des Entwurfs.',
    );
    expect(executeDocumentTransactionMock).not.toHaveBeenCalled();
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

  it('should reject another employee in a model shift without multiple occupancy', async () => {
    loadCollectionMock.mockResolvedValue([
      { id: 's-1', daten: createSchichtDokument('2026-10-05T08:00') },
    ]);
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createSchicht(
        versionsPfad,
        2,
        { ...createSchichtAnlage(), mitarbeiterId: 'm-2' },
        'uid-1',
      ),
    ).rejects.toThrow('Diese Schicht ist bereits belegt.');
    expect(executeDocumentTransactionMock).not.toHaveBeenCalled();
  });

  it('should allow another employee when the model shift permits multiple occupancy', async () => {
    loadDocumentMock.mockResolvedValue({
      id: 'frueh',
      daten: { ...createModellschichtDaten(), mehrfachbelegungErlaubt: true },
    });
    loadCollectionMock.mockResolvedValue([
      { id: 's-1', daten: createSchichtDokument('2026-10-05T08:00') },
    ]);
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createSchicht(
        versionsPfad,
        2,
        { ...createSchichtAnlage(), mitarbeiterId: 'm-2' },
        'uid-1',
      ),
    ).resolves.toEqual(expect.objectContaining({ versionRevision: 3 }));
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
      schichtmodellId: 'modell-1',
      schichtmodellBezeichnung: 'Sommer',
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
      modellschichtId: 'frueh',
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

  function createModellschichtDaten() {
    return {
      bezeichnung: 'Früh',
      beginnLokalzeit: '07:00',
      endeLokalzeit: '12:00',
      endetAmFolgetag: false,
      standardpauseMinuten: 0,
      mehrfachbelegungErlaubt: false,
    };
  }

  function createSchichtmodell(
    id = 'modell-1',
    bezeichnung = 'Sommer',
    modellschichtId = 'frueh',
  ): ISchichtmodellBestand {
    return {
      schichtmodell: {
        ...pfad,
        id,
        bezeichnung,
        aktiv: true,
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      modellschichten: [
        {
          ...pfad,
          id: modellschichtId,
          schichtmodellId: id,
          ...createModellschichtDaten(),
        },
      ],
    };
  }
});
