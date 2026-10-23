// pur-system/src/app/services/domain/dienstplan.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { IDienstplanVersionDokument } from '../../commons/models/domain/dienstplan';
import { ISchichtAnlage, ISchichtEintrag } from '../../commons/models/domain/schicht';
import { ISchichtrastermodellBestand } from '../../commons/models/domain/schichtmodell';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { DienstplanFachfehler, DienstplanService } from './dienstplan.service';
import {
  FilialeinstellungFachfehler,
  FilialeinstellungService,
  IFilialeinstellungBestand,
} from './filialeinstellung.service';

describe('DienstplanService', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const monatsPfad = { ...pfad, dienstplanId: '2026-10' };
  const versionsPfad = { ...monatsPfad, versionId: 'v-1' };
  const loadDocumentMock = vi.fn();
  const loadCollectionMock = vi.fn();
  const observeCollectionByDocumentIdsMock = vi.fn();
  const createDocumentIdMock = vi.fn();
  const createServerTimestampMock = vi.fn();
  const createDeleteFieldMock = vi.fn();
  const updateDocumentsAtomicallyMock = vi.fn();
  const executeDocumentTransactionMock = vi.fn();
  const executeDocumentsTransactionMock = vi.fn();
  const loadFilialeinstellungMock = vi.fn();
  const firestoreDbServiceMock = {
    loadDocument: loadDocumentMock,
    loadCollection: loadCollectionMock,
    observeCollectionByDocumentIds: observeCollectionByDocumentIdsMock,
    createDocumentId: createDocumentIdMock,
    createServerTimestamp: createServerTimestampMock,
    createDeleteField: createDeleteFieldMock,
    updateDocumentsAtomically: updateDocumentsAtomicallyMock,
    executeDocumentTransaction: executeDocumentTransactionMock,
    executeDocumentsTransaction: executeDocumentsTransactionMock,
  };
  const filialeinstellungServiceMock = {
    loadFilialeinstellung: loadFilialeinstellungMock,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    loadDocumentMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/modellschicht/frueh')) {
        return { id: 'frueh', daten: createModellschichtDaten() };
      }
      if (path.endsWith('/dienstplan/2026-10')) {
        return { id: '2026-10', daten: createDienstplanDokument() };
      }
      return null;
    });
    loadCollectionMock.mockResolvedValue([]);
    observeCollectionByDocumentIdsMock.mockReturnValue(vi.fn());
    createDocumentIdMock.mockReturnValue('neu-1');
    createServerTimestampMock.mockReturnValue('server-zeitstempel');
    createDeleteFieldMock.mockReturnValue('feld-loeschen');
    updateDocumentsAtomicallyMock.mockResolvedValue(undefined);
    executeDocumentTransactionMock.mockImplementation(
      async (path: string, aktion: (version: unknown) => unknown) => {
        if (/\/dienstplan\/\d{4}-\d{2}$/.test(path)) {
          return (aktion(null) as { ergebnis: unknown }).ergebnis;
        }
        return (
          aktion({
            id: 'v-1',
            daten: createVersionDokument(),
          }) as { ergebnis: unknown }
        ).ergebnis;
      },
    );
    executeDocumentsTransactionMock.mockImplementation(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          dokumente.set(
            path,
            path.endsWith('/version/v-1') ? { id: 'v-1', daten: createVersionDokument() } : null,
          );
        });
        return (aktion(dokumente) as { ergebnis: unknown }).ergebnis;
      },
    );
    loadFilialeinstellungMock.mockResolvedValue(createFilialeinstellungen());

    TestBed.configureTestingModule({
      providers: [
        DienstplanService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
        { provide: FilialeinstellungService, useValue: filialeinstellungServiceMock },
      ],
    });
  });

  it('should return an empty monthly result for a missing service plan', async () => {
    loadDocumentMock.mockResolvedValue(null);
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

  it('should observe a bounded group of company-wide employee allocations', () => {
    const next = vi.fn();
    const error = vi.fn();
    const unsubscribe = vi.fn();
    observeCollectionByDocumentIdsMock.mockReturnValue(unsubscribe);
    const service = TestBed.inject(DienstplanService);

    expect(
      service.observeMitarbeiterbelegungen(
        { unternehmerId: 'u-1', firmaId: 'f-1' },
        ['m-1__2026-10-01'],
        next,
        error,
      ),
    ).toBe(unsubscribe);
    expect(observeCollectionByDocumentIdsMock).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung',
      ['m-1__2026-10-01'],
      next,
      error,
    );
  });

  it('should reject a monthly plan with an unsupported planning type', async () => {
    loadDocumentMock.mockResolvedValue({
      id: '2026-10',
      daten: createDienstplanDokument({ planungsart: 'schichtbausteine' }),
    });
    const service = TestBed.inject(DienstplanService);

    await expect(service.loadDienstplanMonat(monatsPfad, false)).rejects.toThrow(
      'Die Planungsart des Dienstplans wird noch nicht unterstützt.',
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
        planungsart: 'schichtraster',
        kalendertage: expect.arrayContaining([
          expect.objectContaining({ datum: '2024-02-01', wochentag: 'donnerstag' }),
        ]),
      }),
    );
    expect(ergebnis.dienstplan.kalendertage).toHaveLength(29);
    expect(ergebnis.dienstplan.kalendertage[0].rasterzeiten).toEqual([
      {
        modellschichtId: 'frueh',
        beginnLokalzeit: '08:00',
        endeLokalzeit: '18:00',
        beginntAmFolgetag: false,
        endetAmFolgetag: false,
      },
    ]);
    expect(loadFilialeinstellungMock).toHaveBeenCalledWith(pfad, 'networkOnly');
    expect(ergebnis.version).toEqual(
      expect.objectContaining({ id: 'neu-1', nummer: 1, revision: 0, status: 'entwurf' }),
    );
    expect(ergebnis.modellschichten).toEqual([
      expect.objectContaining({ id: 'frueh', dienstplanId: '2024-02' }),
    ]);
    const transaktion = executeDocumentTransactionMock.mock.calls[0];
    expect(transaktion[0]).toBe('unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2024-02');
    expect(transaktion[1](null).operationen).toEqual([
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2024-02',
        daten: expect.objectContaining({
          kalendertage: expect.arrayContaining([
            expect.objectContaining({
              datum: '2024-02-01',
              rasterzeiten: [
                {
                  modellschichtId: 'frueh',
                  beginnLokalzeit: '08:00',
                  endeLokalzeit: '18:00',
                  beginntAmFolgetag: false,
                  endetAmFolgetag: false,
                },
              ],
            }),
          ]),
        }),
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

  it('should reject a parallel second monthly plan creation transactionally', async () => {
    executeDocumentTransactionMock.mockImplementationOnce(
      async (_path: string, aktion: (dienstplan: unknown) => unknown) => {
        return aktion({ id: '2026-10', daten: createDienstplanDokument() });
      },
    );
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createDienstplan(pfad, '2026-10', createSchichtmodell(), 'uid-1'),
    ).rejects.toThrow(
      'Der Dienstplan konnte nicht angelegt werden. Für diesen Monat ist bereits ein Dienstplan vorhanden. Bitte lade den Monat erneut.',
    );
  });

  it('should reject plan creation when branch settings are missing', async () => {
    loadFilialeinstellungMock.mockResolvedValue(null);
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createDienstplan(pfad, '2026-10', createSchichtmodell(), 'uid-1'),
    ).rejects.toMatchObject({
      name: DienstplanFachfehler.name,
      message:
        'Der Dienstplan konnte nicht angelegt werden. Die Öffnungszeiten der Filiale müssen zuerst initialisiert werden.',
    });
    expect(updateDocumentsAtomicallyMock).not.toHaveBeenCalled();
  });

  it('should describe invalid branch settings as a plan creation error', async () => {
    loadFilialeinstellungMock.mockRejectedValueOnce(
      new FilialeinstellungFachfehler(
        'Die Filialeinstellungen sind unvollständig und müssen repariert werden.',
      ),
    );
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createDienstplan(pfad, '2026-10', createSchichtmodell(), 'uid-1'),
    ).rejects.toThrow(
      'Der Dienstplan konnte nicht angelegt werden. Die Filialeinstellungen sind unvollständig und müssen repariert werden.',
    );
    expect(updateDocumentsAtomicallyMock).not.toHaveBeenCalled();
  });

  it('should describe conflicting special days as a plan creation error', async () => {
    const filialeinstellungen = createFilialeinstellungen();
    const sondertag = {
      ...pfad,
      aktiv: true,
      herkunft: 'benutzer' as const,
      datumsregel: { typ: 'jaehrlichFestesDatum' as const, monat: 10, tag: 3 },
      oeffnungsregel: { geoeffnet: false as const },
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
    loadFilialeinstellungMock.mockResolvedValueOnce({
      ...filialeinstellungen,
      sondertage: [
        { ...sondertag, id: 'sondertag-1', bezeichnung: 'Sondertag 1' },
        { ...sondertag, id: 'sondertag-2', bezeichnung: 'Sondertag 2' },
      ],
    });
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createDienstplan(pfad, '2026-10', createSchichtmodell(), 'uid-1'),
    ).rejects.toThrow(
      'Der Dienstplan konnte nicht angelegt werden. Für 2026-10-03 sind mehrere aktive Sondertage konfiguriert: Sondertag 1, Sondertag 2.',
    );
    expect(updateDocumentsAtomicallyMock).not.toHaveBeenCalled();
  });

  it('should reject inactive, empty and foreign models before writing', async () => {
    const service = TestBed.inject(DienstplanService);
    const schichtmodell = createSchichtmodell();
    const nichtUnterstuetztesSchichtmodell = {
      ...schichtmodell,
      schichtmodell: {
        ...schichtmodell.schichtmodell,
        planungsart: 'schichtbausteine',
      },
    } as unknown as ISchichtrastermodellBestand;

    await expect(
      service.createDienstplan(pfad, '2026-10', nichtUnterstuetztesSchichtmodell, 'uid-1'),
    ).rejects.toThrow(
      'Der Dienstplan konnte nicht angelegt werden. Die Planungsart des Schichtmodells wird noch nicht unterstützt.',
    );
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
    ).rejects.toThrow(
      'Der Dienstplan konnte nicht angelegt werden. Das gewählte Schichtmodell ist nicht mehr aktiv.',
    );
    await expect(
      service.createDienstplan(pfad, '2026-10', { ...schichtmodell, modellschichten: [] }, 'uid-1'),
    ).rejects.toThrow(
      'Der Dienstplan konnte nicht angelegt werden. Das gewählte Schichtmodell enthält keine Schichten.',
    );
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
    ).rejects.toThrow(
      'Der Dienstplan konnte nicht angelegt werden. Das Schichtmodell gehört nicht zu dieser Filiale.',
    );
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

  it('should publish a current draft and its allocation index atomically', async () => {
    const schicht = createSchichtEintrag();
    const dienstplanDaten = createDienstplanDokument({ entwurfVersionId: 'v-1' });
    loadDocumentMock.mockResolvedValue({ id: '2026-10', daten: dienstplanDaten });
    loadCollectionMock.mockResolvedValue([
      { id: 's-1', daten: { ...createSchichtDokument('2026-10-05T07:00'), pauseMinuten: 0 } },
    ]);
    let operationen: readonly { documentPath: string; daten?: Record<string, unknown> }[] = [];
    executeDocumentsTransactionMock.mockImplementationOnce(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          if (path.endsWith('/dienstplan/2026-10')) {
            dokumente.set(path, { id: '2026-10', daten: dienstplanDaten });
          } else if (path.endsWith('/version/v-1')) {
            dokumente.set(path, { id: 'v-1', daten: createVersionDokument() });
          } else if (path.endsWith('/mitarbeiter/m-1')) {
            dokumente.set(path, { id: 'm-1', daten: { aktiv: true, filialIds: ['b-1'] } });
          } else {
            dokumente.set(path, {
              id: 'm-1__2026-10-05',
              daten: {
                mitarbeiterId: 'm-1',
                datum: '2026-10-05',
                belegungen: [
                  {
                    datum: schicht.datum,
                    mitarbeiterId: schicht.mitarbeiterId,
                    filialeId: 'b-1',
                    dienstplanId: '2026-10',
                    versionId: 'v-1',
                    schichtId: 's-1',
                    status: 'entwurf',
                    beginn: schicht.beginn,
                    ende: schicht.ende,
                    pauseMinuten: 0,
                  },
                ],
                aktualisiertVonUid: 'uid-1',
              },
            });
          }
        });
        const transaktion = aktion(dokumente) as {
          ergebnis: unknown;
          operationen: readonly { documentPath: string; daten?: Record<string, unknown> }[];
        };
        operationen = transaktion.operationen;
        return transaktion.ergebnis;
      },
    );
    const service = TestBed.inject(DienstplanService);

    const ergebnis = await service.publishDienstplan(versionsPfad, 2, 'uid-1');

    expect(ergebnis.dienstplan).toEqual(
      expect.objectContaining({ veroeffentlichteVersionId: 'v-1' }),
    );
    expect(ergebnis.dienstplan).not.toHaveProperty('entwurfVersionId');
    expect(ergebnis.veroeffentlichteVersion).toEqual(
      expect.objectContaining({ status: 'veroeffentlicht', revision: 3 }),
    );
    expect(operationen).toContainEqual(
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10',
        daten: expect.objectContaining({
          veroeffentlichteVersionId: 'v-1',
          entwurfVersionId: 'feld-loeschen',
        }),
      }),
    );
    expect(operationen).toContainEqual(
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
        daten: expect.objectContaining({
          belegungen: [expect.objectContaining({ status: 'veroeffentlicht' })],
        }),
      }),
    );
  });

  it('should reject publishing when a referenced employee is inactive', async () => {
    const dienstplanDaten = createDienstplanDokument({ entwurfVersionId: 'v-1' });
    loadDocumentMock.mockResolvedValue({ id: '2026-10', daten: dienstplanDaten });
    loadCollectionMock.mockResolvedValue([
      { id: 's-1', daten: { ...createSchichtDokument('2026-10-05T07:00'), pauseMinuten: 0 } },
    ]);
    executeDocumentsTransactionMock.mockImplementationOnce(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          if (path.endsWith('/dienstplan/2026-10')) {
            dokumente.set(path, { id: '2026-10', daten: dienstplanDaten });
          } else if (path.endsWith('/version/v-1')) {
            dokumente.set(path, { id: 'v-1', daten: createVersionDokument() });
          } else if (path.endsWith('/mitarbeiter/m-1')) {
            dokumente.set(path, { id: 'm-1', daten: { aktiv: false, filialIds: ['b-1'] } });
          } else {
            dokumente.set(path, null);
          }
        });
        return (aktion(dokumente) as { ergebnis: unknown }).ergebnis;
      },
    );
    const service = TestBed.inject(DienstplanService);

    await expect(service.publishDienstplan(versionsPfad, 2, 'uid-1')).rejects.toThrow(
      'inaktiven oder dieser Filiale nicht mehr zugeordneten Mitarbeiter',
    );
  });

  it('should reject publishing after a concurrent draft revision', async () => {
    const dienstplanDaten = createDienstplanDokument({ entwurfVersionId: 'v-1' });
    loadDocumentMock.mockResolvedValue({ id: '2026-10', daten: dienstplanDaten });
    loadCollectionMock.mockResolvedValue([]);
    executeDocumentsTransactionMock.mockImplementationOnce(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          dokumente.set(
            path,
            path.endsWith('/dienstplan/2026-10')
              ? { id: '2026-10', daten: dienstplanDaten }
              : { id: 'v-1', daten: createVersionDokument({ revision: 3 }) },
          );
        });
        return (aktion(dokumente) as { ergebnis: unknown }).ergebnis;
      },
    );
    const service = TestBed.inject(DienstplanService);

    await expect(service.publishDienstplan(versionsPfad, 2, 'uid-1')).rejects.toThrow(
      'Der Dienstplan konnte nicht veröffentlicht werden. Der Dienstplan wurde zwischenzeitlich geändert.',
    );
  });

  it('should create a new draft by copying the published version and its shifts', async () => {
    const dienstplanDaten = createDienstplanDokument({
      veroeffentlichteVersionId: 'v-1',
      naechsteVersionsnummer: 2,
    });
    const schicht = createSchichtEintrag();
    loadDocumentMock.mockResolvedValue({ id: '2026-10', daten: dienstplanDaten });
    loadCollectionMock.mockResolvedValue([
      { id: 's-1', daten: { ...createSchichtDokument('2026-10-05T07:00'), pauseMinuten: 0 } },
    ]);
    let operationen: readonly { documentPath: string; daten?: Record<string, unknown> }[] = [];
    executeDocumentsTransactionMock.mockImplementationOnce(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          if (path.endsWith('/dienstplan/2026-10')) {
            dokumente.set(path, { id: '2026-10', daten: dienstplanDaten });
          } else if (path.endsWith('/version/v-1')) {
            dokumente.set(path, {
              id: 'v-1',
              daten: createVersionDokument({ status: 'veroeffentlicht', revision: 3 }),
            });
          } else {
            dokumente.set(path, {
              id: 'm-1__2026-10-05',
              daten: {
                mitarbeiterId: 'm-1',
                datum: '2026-10-05',
                belegungen: [
                  {
                    datum: schicht.datum,
                    mitarbeiterId: schicht.mitarbeiterId,
                    filialeId: 'b-1',
                    dienstplanId: '2026-10',
                    versionId: 'v-1',
                    schichtId: 's-1',
                    status: 'veroeffentlicht',
                    beginn: schicht.beginn,
                    ende: schicht.ende,
                    pauseMinuten: 0,
                  },
                ],
                aktualisiertVonUid: 'uid-1',
              },
            });
          }
        });
        const transaktion = aktion(dokumente) as {
          ergebnis: unknown;
          operationen: readonly { documentPath: string; daten?: Record<string, unknown> }[];
        };
        operationen = transaktion.operationen;
        return transaktion.ergebnis;
      },
    );
    const service = TestBed.inject(DienstplanService);

    const ergebnis = await service.createEntwurfAusVeroeffentlichung(monatsPfad, 3, 'uid-1');

    expect(ergebnis.dienstplan).toEqual(
      expect.objectContaining({
        entwurfVersionId: 'neu-1',
        naechsteVersionsnummer: 3,
        schichtmodellId: 'modell-1',
        schichtmodellBezeichnung: 'Sommer',
        planungsart: 'schichtraster',
      }),
    );
    expect(ergebnis.version).toEqual(
      expect.objectContaining({ id: 'neu-1', nummer: 2, revision: 0, status: 'entwurf' }),
    );
    expect(ergebnis.schichten).toEqual([
      expect.objectContaining({ id: 's-1', versionId: 'neu-1', pauseMinuten: 0 }),
    ]);
    expect(operationen).toContainEqual(
      expect.objectContaining({
        documentPath:
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/neu-1/schicht/s-1',
      }),
    );
    expect(operationen).toContainEqual(
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
        daten: expect.objectContaining({
          belegungen: expect.arrayContaining([
            expect.objectContaining({ versionId: 'v-1', status: 'veroeffentlicht' }),
            expect.objectContaining({ versionId: 'neu-1', status: 'entwurf' }),
          ]),
        }),
      }),
    );
    expect(
      operationen.some((operation) => operation.documentPath.includes('/modellschicht/')),
    ).toBe(false);
  });

  it('should create a shift together with the next draft revision', async () => {
    const service = TestBed.inject(DienstplanService);

    const ergebnis = await service.createSchicht(versionsPfad, 2, createSchichtAnlage(), 'uid-1');

    expect(ergebnis).toMatchObject({
      schicht: expect.objectContaining({ id: 'neu-1', versionId: 'v-1' }),
      versionRevision: 3,
    });
    const transaktion = executeDocumentsTransactionMock.mock.calls[0];
    expect(transaktion[0]).toEqual([
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
    ]);
    const operationen = transaktion[1](
      new Map([
        [
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
          { id: 'v-1', daten: createVersionDokument() },
        ],
        ['unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05', null],
      ]),
    ).operationen;
    expect(operationen).toEqual([
      expect.objectContaining({ daten: expect.objectContaining({ revision: 3 }) }),
      expect.objectContaining({
        documentPath:
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1/schicht/neu-1',
        daten: expect.objectContaining({
          datum: '2026-10-05',
          modellschichtId: 'frueh',
          beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
          ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
        }),
      }),
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
        daten: expect.objectContaining({
          mitarbeiterId: 'm-1',
          datum: '2026-10-05',
          belegungen: [
            expect.objectContaining({
              filialeId: 'b-1',
              dienstplanId: '2026-10',
              versionId: 'v-1',
              schichtId: 'neu-1',
              status: 'entwurf',
            }),
          ],
        }),
      }),
    ]);
  });

  it('should reject an overlapping employee allocation from another branch', async () => {
    executeDocumentsTransactionMock.mockImplementationOnce(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          dokumente.set(
            path,
            path.endsWith('/version/v-1')
              ? { id: 'v-1', daten: createVersionDokument() }
              : {
                  id: 'm-1__2026-10-05',
                  daten: {
                    mitarbeiterId: 'm-1',
                    datum: '2026-10-05',
                    belegungen: [
                      {
                        datum: '2026-10-05',
                        mitarbeiterId: 'm-1',
                        filialeId: 'b-2',
                        dienstplanId: '2026-10',
                        versionId: 'v-2',
                        schichtId: 's-2',
                        status: 'entwurf',
                        beginn: Timestamp.fromDate(new Date('2026-10-05T11:00:00+02:00')),
                        ende: Timestamp.fromDate(new Date('2026-10-05T13:00:00+02:00')),
                      },
                    ],
                    aktualisiertVonUid: 'uid-2',
                  },
                },
          );
        });
        return (aktion(dokumente) as { ergebnis: unknown }).ergebnis;
      },
    );
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createSchicht(versionsPfad, 2, createSchichtAnlage(), 'uid-1'),
    ).rejects.toThrow('Der Mitarbeiter ist in diesem Zeitraum bereits eingeplant.');
  });

  it('should allow only one of two competing branch transactions for the same employee period', async () => {
    const zweiterVersionsPfad = {
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-2',
      dienstplanId: '2026-10',
      versionId: 'v-2',
    };
    loadDocumentMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/modellschicht/frueh')) {
        return { id: 'frueh', daten: createModellschichtDaten() };
      }
      if (path.endsWith('/dienstplan/2026-10')) {
        return {
          id: '2026-10',
          daten: createDienstplanDokument({
            entwurfVersionId: path.includes('/filiale/b-2/') ? 'v-2' : 'v-1',
          }),
        };
      }
      return null;
    });
    let gespeicherteBelegungen: readonly Record<string, unknown>[] = [];
    executeDocumentsTransactionMock.mockImplementation(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const versionPath = paths.find((path) => path.includes('/version/'))!;
        const belegungsPath = paths.find((path) => path.includes('/mitarbeiterbelegung/'))!;
        const dokumente = new Map<string, unknown>([
          [
            versionPath,
            {
              id: versionPath.endsWith('/v-2') ? 'v-2' : 'v-1',
              daten: createVersionDokument(),
            },
          ],
          [
            belegungsPath,
            gespeicherteBelegungen.length > 0
              ? {
                  id: 'm-1__2026-10-05',
                  daten: {
                    mitarbeiterId: 'm-1',
                    datum: '2026-10-05',
                    belegungen: gespeicherteBelegungen,
                    aktualisiertVonUid: 'uid-1',
                  },
                }
              : null,
          ],
        ]);
        const transaktion = aktion(dokumente) as {
          ergebnis: unknown;
          operationen: readonly { documentPath: string; daten?: Record<string, unknown> }[];
        };
        const belegungsoperation = transaktion.operationen.find((operation) => {
          return operation.documentPath === belegungsPath;
        });
        gespeicherteBelegungen =
          (belegungsoperation?.daten?.['belegungen'] as readonly Record<string, unknown>[]) ?? [];
        return transaktion.ergebnis;
      },
    );
    const service = TestBed.inject(DienstplanService);

    const ergebnisse = await Promise.allSettled([
      service.createSchicht(versionsPfad, 2, createSchichtAnlage(), 'uid-1'),
      service.createSchicht(zweiterVersionsPfad, 2, createSchichtAnlage(), 'uid-2'),
    ]);

    expect(ergebnisse.filter((ergebnis) => ergebnis.status === 'fulfilled')).toHaveLength(1);
    expect(ergebnisse.filter((ergebnis) => ergebnis.status === 'rejected')).toHaveLength(1);
    expect(gespeicherteBelegungen).toHaveLength(1);
  });

  it('should index every local day touched by a shift over midnight', async () => {
    loadDocumentMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/modellschicht/frueh')) {
        return { id: 'frueh', daten: createModellschichtDaten() };
      }
      if (path.endsWith('/dienstplan/2026-10')) {
        const dienstplan = createDienstplanDokument();
        return {
          id: '2026-10',
          daten: {
            ...dienstplan,
            kalendertage: [
              {
                ...dienstplan.kalendertage[0],
                rasterzeiten: [
                  {
                    modellschichtId: 'frueh',
                    beginnLokalzeit: '23:00',
                    endeLokalzeit: '01:00',
                    beginntAmFolgetag: false,
                    endetAmFolgetag: true,
                  },
                ],
              },
            ],
          },
        };
      }
      return null;
    });
    const service = TestBed.inject(DienstplanService);

    await service.createSchicht(versionsPfad, 2, createSchichtAnlage(), 'uid-1');

    expect(executeDocumentsTransactionMock.mock.calls[0][0]).toEqual([
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-06',
    ]);
  });

  it('should also index the service-plan date when a grid shift begins on the following day', async () => {
    loadDocumentMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/modellschicht/frueh')) {
        return { id: 'frueh', daten: createModellschichtDaten() };
      }
      if (path.endsWith('/dienstplan/2026-10')) {
        const dienstplan = createDienstplanDokument();
        return {
          id: '2026-10',
          daten: {
            ...dienstplan,
            kalendertage: [
              {
                ...dienstplan.kalendertage[0],
                rasterzeiten: [
                  {
                    modellschichtId: 'frueh',
                    beginnLokalzeit: '00:30',
                    endeLokalzeit: '01:00',
                    beginntAmFolgetag: true,
                    endetAmFolgetag: true,
                  },
                ],
              },
            ],
          },
        };
      }
      return null;
    });
    const service = TestBed.inject(DienstplanService);

    await service.createSchicht(versionsPfad, 2, createSchichtAnlage(), 'uid-1');

    expect(executeDocumentsTransactionMock.mock.calls[0][0]).toEqual([
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-06',
    ]);
  });

  it('should update company-wide paid breaks atomically on the last block shift', async () => {
    const bestehendeBelegung = {
      datum: '2026-10-05',
      mitarbeiterId: 'm-1',
      filialeId: 'b-2',
      dienstplanId: '2026-10',
      versionId: 'v-2',
      schichtId: 's-2',
      status: 'entwurf' as const,
      beginn: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
      ende: Timestamp.fromDate(new Date('2026-10-05T15:00:00+02:00')),
    };
    executeDocumentsTransactionMock.mockImplementationOnce(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          dokumente.set(
            path,
            path.endsWith('/version/v-1')
              ? { id: 'v-1', daten: createVersionDokument() }
              : {
                  id: 'm-1__2026-10-05',
                  daten: {
                    mitarbeiterId: 'm-1',
                    datum: '2026-10-05',
                    belegungen: [bestehendeBelegung],
                    aktualisiertVonUid: 'uid-2',
                  },
                },
          );
        });
        return (aktion(dokumente) as { ergebnis: unknown }).ergebnis;
      },
    );
    const service = TestBed.inject(DienstplanService);

    const ergebnis = await service.createSchicht(versionsPfad, 2, createSchichtAnlage(), 'uid-1');

    expect(ergebnis.pauseAktualisierungen).toEqual([
      expect.objectContaining({ filialeId: 'b-1', schichtId: 'neu-1', pauseMinuten: 0 }),
      expect.objectContaining({ filialeId: 'b-2', schichtId: 's-2', pauseMinuten: 30 }),
    ]);
    const operationen = executeDocumentsTransactionMock.mock.calls[0][1](
      new Map([
        [
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
          { id: 'v-1', daten: createVersionDokument() },
        ],
        [
          'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
          {
            id: 'm-1__2026-10-05',
            daten: {
              mitarbeiterId: 'm-1',
              datum: '2026-10-05',
              belegungen: [bestehendeBelegung],
              aktualisiertVonUid: 'uid-2',
            },
          },
        ],
      ]),
    ).operationen;
    expect(operationen).toContainEqual(
      expect.objectContaining({
        documentPath:
          'unternehmer/u-1/firma/f-1/filiale/b-2/dienstplan/2026-10/version/v-2/schicht/s-2',
        daten: expect.objectContaining({ pauseMinuten: 30 }),
      }),
    );
    expect(operationen).toContainEqual(
      expect.objectContaining({
        documentPath: 'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
        daten: expect.objectContaining({
          belegungen: expect.arrayContaining([
            expect.objectContaining({ schichtId: 's-2', pauseMinuten: 30 }),
          ]),
        }),
      }),
    );
  });

  it('should reject creating a shift when its model cell is unavailable on that day', async () => {
    loadDocumentMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/modellschicht/frueh')) {
        return { id: 'frueh', daten: createModellschichtDaten() };
      }
      if (path.endsWith('/dienstplan/2026-10')) {
        const dienstplan = createDienstplanDokument();
        return {
          id: '2026-10',
          daten: {
            ...dienstplan,
            kalendertage: dienstplan.kalendertage.map((kalendertag) => {
              return kalendertag.datum === '2026-10-05'
                ? { ...kalendertag, rasterzeiten: [] }
                : kalendertag;
            }),
          },
        };
      }
      return null;
    });
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createSchicht(versionsPfad, 2, createSchichtAnlage(), 'uid-1'),
    ).rejects.toThrow('Die Modellschicht ist an diesem Kalendertag nicht verfügbar.');
    expect(executeDocumentsTransactionMock).not.toHaveBeenCalled();
  });

  it('should reject a stale revision before creating transaction operations', async () => {
    executeDocumentsTransactionMock.mockImplementationOnce(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          dokumente.set(
            path,
            path.endsWith('/version/v-1')
              ? { id: 'v-1', daten: createVersionDokument({ revision: 3 }) }
              : null,
          );
        });
        return (aktion(dokumente) as { ergebnis: unknown }).ergebnis;
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
    expect(executeDocumentsTransactionMock).not.toHaveBeenCalled();
  });

  it('should allow another employee when the model shift permits multiple occupancy', async () => {
    loadDocumentMock.mockImplementation(async (path: string) => {
      return path.endsWith('/modellschicht/frueh')
        ? {
            id: 'frueh',
            daten: { ...createModellschichtDaten(), mehrfachbelegungErlaubt: true },
          }
        : { id: '2026-10', daten: createDienstplanDokument() };
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

  it('should move a shift with the same id and update old and new allocation days atomically', async () => {
    const dienstplan = createDienstplanDokument();
    loadDocumentMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/modellschicht/frueh')) {
        return { id: 'frueh', daten: createModellschichtDaten() };
      }
      if (path.endsWith('/dienstplan/2026-10')) {
        return {
          id: '2026-10',
          daten: {
            ...dienstplan,
            kalendertage: [
              ...dienstplan.kalendertage,
              { ...dienstplan.kalendertage[0], datum: '2026-10-06', wochentag: 'dienstag' },
            ],
          },
        };
      }
      return null;
    });
    let operationen: readonly { documentPath: string; daten?: Record<string, unknown> }[] = [];
    executeDocumentsTransactionMock.mockImplementationOnce(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          dokumente.set(
            path,
            path.endsWith('/version/v-1') ? { id: 'v-1', daten: createVersionDokument() } : null,
          );
        });
        const transaktion = aktion(dokumente) as {
          ergebnis: unknown;
          operationen: readonly { documentPath: string; daten?: Record<string, unknown> }[];
        };
        operationen = transaktion.operationen;
        return transaktion.ergebnis;
      },
    );
    const service = TestBed.inject(DienstplanService);

    const ergebnis = await service.updateSchicht(
      versionsPfad,
      createSchichtEintrag(),
      2,
      { ...createSchichtAnlage(), datum: '2026-10-06' },
      'uid-1',
    );

    expect(executeDocumentsTransactionMock.mock.calls[0][0]).toEqual([
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-06',
    ]);
    expect(ergebnis).toMatchObject({
      versionRevision: 3,
      schicht: { id: 's-1', datum: '2026-10-06', mitarbeiterId: 'm-1' },
    });
    expect(operationen).toContainEqual(
      expect.objectContaining({
        documentPath:
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1/schicht/s-1',
        daten: expect.objectContaining({ datum: '2026-10-06', mitarbeiterId: 'm-1' }),
      }),
    );
  });

  it('should update every affected allocation day when moving a shift across midnight', async () => {
    const dienstplan = createDienstplanDokument();
    loadDocumentMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/modellschicht/frueh')) {
        return { id: 'frueh', daten: createModellschichtDaten() };
      }
      if (path.endsWith('/dienstplan/2026-10')) {
        return {
          id: '2026-10',
          daten: {
            ...dienstplan,
            kalendertage: [
              ...dienstplan.kalendertage,
              {
                ...dienstplan.kalendertage[0],
                datum: '2026-10-06',
                wochentag: 'dienstag',
                rasterzeiten: [
                  {
                    modellschichtId: 'frueh',
                    beginnLokalzeit: '23:00',
                    endeLokalzeit: '01:00',
                    beginntAmFolgetag: false,
                    endetAmFolgetag: true,
                  },
                ],
              },
            ],
          },
        };
      }
      return null;
    });
    const service = TestBed.inject(DienstplanService);

    const ergebnis = await service.updateSchicht(
      versionsPfad,
      createSchichtEintrag(),
      2,
      { ...createSchichtAnlage(), datum: '2026-10-06' },
      'uid-1',
    );

    expect(executeDocumentsTransactionMock.mock.calls[0][0]).toEqual([
      'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-06',
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-07',
    ]);
    expect(ergebnis.schicht).toEqual(
      expect.objectContaining({
        id: 's-1',
        datum: '2026-10-06',
        mitarbeiterId: 'm-1',
        beginn: Timestamp.fromDate(new Date('2026-10-06T23:00:00+02:00')),
        ende: Timestamp.fromDate(new Date('2026-10-07T01:00:00+02:00')),
      }),
    );
  });

  it('should remove the last indexed employee allocation when deleting a shift', async () => {
    const schicht = createSchichtEintrag();
    executeDocumentsTransactionMock.mockImplementationOnce(
      async (
        paths: readonly string[],
        aktion: (dokumente: ReadonlyMap<string, unknown>) => unknown,
      ) => {
        const dokumente = new Map<string, unknown>();
        paths.forEach((path) => {
          dokumente.set(
            path,
            path.endsWith('/version/v-1')
              ? { id: 'v-1', daten: createVersionDokument() }
              : {
                  id: 'm-1__2026-10-05',
                  daten: {
                    mitarbeiterId: 'm-1',
                    datum: '2026-10-05',
                    belegungen: [
                      {
                        filialeId: 'b-1',
                        dienstplanId: '2026-10',
                        versionId: 'v-1',
                        schichtId: 's-1',
                        status: 'entwurf',
                        beginn: schicht.beginn,
                        ende: schicht.ende,
                      },
                    ],
                    aktualisiertVonUid: 'uid-1',
                  },
                },
          );
        });
        return (aktion(dokumente) as { ergebnis: unknown }).ergebnis;
      },
    );
    const service = TestBed.inject(DienstplanService);

    await service.deleteSchicht(versionsPfad, schicht, 2, 'uid-1');

    const operationen = executeDocumentsTransactionMock.mock.calls[0][1](
      new Map([
        [
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1',
          { id: 'v-1', daten: createVersionDokument() },
        ],
        [
          'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
          {
            id: 'm-1__2026-10-05',
            daten: {
              mitarbeiterId: 'm-1',
              datum: '2026-10-05',
              belegungen: [
                {
                  datum: '2026-10-05',
                  mitarbeiterId: 'm-1',
                  filialeId: 'b-1',
                  dienstplanId: '2026-10',
                  versionId: 'v-1',
                  schichtId: 's-1',
                  status: 'entwurf',
                  beginn: schicht.beginn,
                  ende: schicht.ende,
                },
              ],
              aktualisiertVonUid: 'uid-1',
            },
          },
        ],
      ]),
    ).operationen;
    expect(operationen).toEqual([
      expect.objectContaining({ daten: expect.objectContaining({ revision: 3 }) }),
      {
        documentPath:
          'unternehmer/u-1/firma/f-1/filiale/b-1/dienstplan/2026-10/version/v-1/schicht/s-1',
        delete: true,
      },
      {
        documentPath: 'unternehmer/u-1/firma/f-1/mitarbeiterbelegung/m-1__2026-10-05',
        delete: true,
      },
    ]);
  });

  function createDienstplanDokument(overrides = {}) {
    return {
      zeitraumStart: '2026-10-01',
      zeitraumEnde: '2026-10-31',
      zeitzone: 'Europe/Berlin',
      schichtmodellId: 'modell-1',
      schichtmodellBezeichnung: 'Sommer',
      planungsart: 'schichtraster',
      naechsteVersionsnummer: 2,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
      kalendertage: [
        {
          datum: '2026-10-05',
          wochentag: 'montag',
          istSonntag: false,
          aktiveSondertage: [],
          oeffnungsregelQuelle: 'wochentag',
          oeffnungsregel: {
            geoeffnet: true,
            beginnLokalzeit: '08:00',
            endeLokalzeit: '18:00',
            endetAmFolgetag: false,
          },
          rasterzeiten: [
            {
              modellschichtId: 'frueh',
              beginnLokalzeit: '07:00',
              endeLokalzeit: '12:00',
              beginntAmFolgetag: false,
              endetAmFolgetag: false,
            },
          ],
        },
      ],
      ...overrides,
    };
  }

  function createFilialeinstellungen(): IFilialeinstellungBestand {
    const wochenregel = {
      geoeffnet: true as const,
      beginnLokalzeit: '08:00',
      endeLokalzeit: '18:00',
      endetAmFolgetag: false,
    };
    return {
      allgemein: {
        bundesland: 'DE-NW',
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      oeffnungszeiten: {
        schliesszeitraum: {
          beginnLokalzeit: '01:00',
          endeLokalzeit: '06:00',
          endetAmFolgetag: false,
        },
        wochenregeln: {
          montag: wochenregel,
          dienstag: wochenregel,
          mittwoch: wochenregel,
          donnerstag: wochenregel,
          freitag: wochenregel,
          samstag: wochenregel,
          sonntag: { geoeffnet: false },
        },
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      sondertage: [],
      ausnahmen: [],
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
      datum: '2026-10-05',
      mitarbeiterId: 'm-1',
      modellschichtId: 'frueh',
    };
  }

  function createSchichtDokument(beginn: string) {
    return {
      ...createSchichtAnlage(),
      beginn: Timestamp.fromDate(new Date(`${beginn}:00+02:00`)),
      ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
  }

  function createSchichtEintrag(): ISchichtEintrag {
    return {
      ...createSchichtAnlage(),
      beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
      ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
      ...versionsPfad,
      id: 's-1',
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
  }

  function createModellschichtDaten() {
    return {
      bezeichnung: 'Früh',
      reihenfolge: 0,
      mehrfachbelegungErlaubt: false,
      vorbereitungsminuten: 0,
      nachbereitungsminuten: 0,
    };
  }

  function createSchichtmodell(
    id = 'modell-1',
    bezeichnung = 'Sommer',
    modellschichtId = 'frueh',
  ): ISchichtrastermodellBestand {
    return {
      schichtmodell: {
        ...pfad,
        id,
        bezeichnung,
        aktiv: true,
        planungsart: 'schichtraster',
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
