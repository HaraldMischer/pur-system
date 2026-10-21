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
  const createDocumentIdMock = vi.fn();
  const createServerTimestampMock = vi.fn();
  const updateDocumentsAtomicallyMock = vi.fn();
  const executeDocumentTransactionMock = vi.fn();
  const loadFilialeinstellungMock = vi.fn();
  const firestoreDbServiceMock = {
    loadDocument: loadDocumentMock,
    loadCollection: loadCollectionMock,
    createDocumentId: createDocumentIdMock,
    createServerTimestamp: createServerTimestampMock,
    updateDocumentsAtomically: updateDocumentsAtomicallyMock,
    executeDocumentTransaction: executeDocumentTransactionMock,
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
    createDocumentIdMock.mockReturnValue('neu-1');
    createServerTimestampMock.mockReturnValue('server-zeitstempel');
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
        daten: expect.objectContaining({
          datum: '2026-10-05',
          modellschichtId: 'frueh',
          beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
          ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
        }),
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
      beginnLokalzeit: '07:00',
      endeLokalzeit: '12:00',
      endetAmFolgetag: false,
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
        besondereRasterzeiten: [],
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
