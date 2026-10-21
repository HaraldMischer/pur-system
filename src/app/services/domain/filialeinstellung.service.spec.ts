// pur-system/src/app/services/domain/filialeinstellung.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import {
  IFilialeinstellungSondertagEintrag,
  TOeffnungsregel,
  TWochenoeffnungszeiten,
} from '../../commons/models/domain/filialeinstellung';
import { FirestoreDbService, TFirestoreBatchOperation } from '../firebase/firestore-db.service';
import {
  FilialeinstellungFachfehler,
  FilialeinstellungService,
  IFilialeinstellungBestand,
  IFilialeinstellungGrundlagen,
} from './filialeinstellung.service';

describe('FilialeinstellungService', () => {
  const pfad: IFilialPfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const grundlagen = createGrundlagen();
  const firestoreDbServiceMock = {
    loadDocument: vi.fn(),
    loadCollection: vi.fn(),
    createDocumentId: vi.fn(),
    createServerTimestamp: vi.fn(),
    createDeleteField: vi.fn(),
    executeDocumentTransaction: vi.fn(),
    updateDocumentsAtomically: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreDbServiceMock.loadDocument.mockResolvedValue(null);
    firestoreDbServiceMock.loadCollection.mockResolvedValue([]);
    firestoreDbServiceMock.createDocumentId.mockReturnValue('sondertag-neu');
    firestoreDbServiceMock.createServerTimestamp.mockReturnValue('server-zeitstempel');
    firestoreDbServiceMock.createDeleteField.mockReturnValue('feld-loeschen');
    firestoreDbServiceMock.executeDocumentTransaction.mockImplementation(
      async (_documentPath, aktion) => {
        return aktion(null).ergebnis;
      },
    );
    firestoreDbServiceMock.updateDocumentsAtomically.mockResolvedValue(undefined);
    firestoreDbServiceMock.updateDocument.mockResolvedValue(undefined);
    firestoreDbServiceMock.deleteDocument.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        FilialeinstellungService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
      ],
    });
  });

  it('should expose a completely missing configuration as not initialized', async () => {
    const service = TestBed.inject(FilialeinstellungService);

    await expect(service.loadFilialeinstellung(pfad, 'networkOnly')).resolves.toBeNull();
    expect(firestoreDbServiceMock.loadDocument).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/einstellung/allgemein',
      'networkOnly',
    );
  });

  it('should reject a partially initialized configuration', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'allgemein',
        daten: {
          bundesland: 'DE-NW',
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      })
      .mockResolvedValueOnce(null);
    const service = TestBed.inject(FilialeinstellungService);

    const rohdaten = await service.loadFilialeinstellungRohdaten(pfad);

    expect(() => service.validateFilialeinstellungRohdaten(pfad, rohdaten)).toThrow(
      'unvollständig',
    );
  });

  it('should load the complete configuration from all four path areas', async () => {
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'allgemein',
        daten: {
          bundesland: 'DE-NW',
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      })
      .mockResolvedValueOnce({
        id: 'oeffnungszeiten',
        daten: {
          wochenregeln: grundlagen.wochenregeln,
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      });
    firestoreDbServiceMock.loadCollection
      .mockResolvedValueOnce([
        {
          id: 'heiligabend',
          daten: {
            bezeichnung: 'Heiligabend',
            aktiv: true,
            herkunft: 'system',
            datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
            oeffnungsregel: { geoeffnet: false },
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: '2026-12-23',
          daten: {
            datum: '2026-12-23',
            bezeichnung: 'Sonderöffnung',
            oeffnungsregel: {
              geoeffnet: true,
              beginnLokalzeit: '08:00',
              endeLokalzeit: '12:00',
              endetAmFolgetag: false,
            },
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
        },
      ]);
    const service = TestBed.inject(FilialeinstellungService);

    const rohdaten = await service.loadFilialeinstellungRohdaten(pfad);
    const bestand = service.validateFilialeinstellungRohdaten(pfad, rohdaten);

    expect(bestand?.sondertage[0]).toMatchObject({ ...pfad, id: 'heiligabend' });
    expect(bestand?.ausnahmen[0]).toMatchObject({ ...pfad, id: '2026-12-23' });
  });

  it('should accept stored times for a closed weekly opening rule', async () => {
    const wochenregelnMitGeschlossenenZeiten = {
      ...grundlagen.wochenregeln,
      sonntag: {
        geoeffnet: false,
        beginnLokalzeit: '08:00',
        endeLokalzeit: '18:00',
        endetAmFolgetag: false,
      },
    } as TWochenoeffnungszeiten;
    firestoreDbServiceMock.loadDocument
      .mockResolvedValueOnce({
        id: 'allgemein',
        daten: {
          bundesland: 'DE-NW',
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      })
      .mockResolvedValueOnce({
        id: 'oeffnungszeiten',
        daten: {
          wochenregeln: wochenregelnMitGeschlossenenZeiten,
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      });
    const service = TestBed.inject(FilialeinstellungService);

    const rohdaten = await service.loadFilialeinstellungRohdaten(pfad);

    expect(rohdaten.oeffnungszeiten?.daten.wochenregeln.sonntag).toMatchObject({
      geoeffnet: false,
      beginnLokalzeit: '08:00',
      endeLokalzeit: '18:00',
    });
    const bestand = service.validateFilialeinstellungRohdaten(pfad, rohdaten);

    expect(bestand?.oeffnungszeiten.wochenregeln.sonntag).toEqual({
      geoeffnet: false,
      beginnLokalzeit: '08:00',
      endeLokalzeit: '18:00',
      endetAmFolgetag: false,
    });
  });

  it('should reject incomplete stored times for a closed opening rule', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const ungueltigeGrundlagen = {
      ...grundlagen,
      wochenregeln: {
        ...grundlagen.wochenregeln,
        sonntag: { geoeffnet: false, beginnLokalzeit: '08:00' },
      },
    } as IFilialeinstellungGrundlagen;

    await expect(
      service.initializeFilialeinstellung(pfad, ungueltigeGrundlagen, 'uid-1'),
    ).rejects.toThrow('Die Öffnungsregel enthält keine gültige Zeitfolge.');
    expect(firestoreDbServiceMock.executeDocumentTransaction).not.toHaveBeenCalled();
  });

  it('should initialize explicit foundations and the system special days atomically', async () => {
    const service = TestBed.inject(FilialeinstellungService);

    const bestand = await service.initializeFilialeinstellung(pfad, grundlagen, 'uid-1');

    expect(bestand.allgemein.bundesland).toBe('DE-NW');
    expect(bestand.sondertage.some((sondertag) => sondertag.id === 'heiligabend')).toBe(true);
    const transactionCall = firestoreDbServiceMock.executeDocumentTransaction.mock.calls[0];
    expect(transactionCall[0]).toBe('unternehmer/u-1/firma/f-1/filiale/b-1/einstellung/allgemein');
    const operationen: TFirestoreBatchOperation[] = transactionCall[1](null).operationen;
    expect(operationen[0]).toMatchObject({
      daten: {
        bundesland: 'DE-NW',
        erstelltAm: 'server-zeitstempel',
      },
    });
    expect(operationen.some((operation) => operation.documentPath.endsWith('/heiligabend'))).toBe(
      true,
    );
  });

  it('should not initialize an existing configuration', async () => {
    firestoreDbServiceMock.executeDocumentTransaction.mockImplementation(
      async (_documentPath, aktion) => {
        return aktion({ id: 'allgemein', daten: {} }).ergebnis;
      },
    );
    const service = TestBed.inject(FilialeinstellungService);

    await expect(service.initializeFilialeinstellung(pfad, grundlagen, 'uid-1')).rejects.toThrow(
      'bereits initialisiert',
    );
  });

  it('should reconcile system holidays atomically after a federal-state change', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const bestand = createBestand([
      createSondertag('fronleichnam', 'system'),
      createSondertag('allerheiligen', 'system'),
      createSondertag('intern', 'benutzer'),
    ]);

    const aktualisiert = await service.saveGrundlagen(
      pfad,
      bestand,
      { ...grundlagen, bundesland: 'DE-HE' },
      'uid-2',
    );

    expect(aktualisiert.sondertage.some((sondertag) => sondertag.id === 'fronleichnam')).toBe(true);
    expect(aktualisiert.sondertage.some((sondertag) => sondertag.id === 'allerheiligen')).toBe(
      false,
    );
    expect(aktualisiert.sondertage.some((sondertag) => sondertag.id === 'intern')).toBe(true);
    const operationen = firestoreDbServiceMock.updateDocumentsAtomically.mock.calls[0][0];
    expect(operationen[0].daten).toMatchObject({ zeitzone: 'feld-loeschen' });
    expect(operationen).toContainEqual({
      documentPath:
        'unternehmer/u-1/firma/f-1/filiale/b-1/einstellung/oeffnungszeiten/sondertag/allerheiligen',
      delete: true,
    });
  });

  it('should create, update and delete a user-defined special day', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const anlage = {
      bezeichnung: 'Inventur',
      aktiv: true,
      datumsregel: { typ: 'jaehrlichFestesDatum' as const, monat: 2, tag: 15 },
      oeffnungsregel: { geoeffnet: false } as const,
    };

    const sondertag = await service.createSondertag(pfad, anlage, 'uid-1');
    const aktualisiert = await service.updateSondertag(
      pfad,
      sondertag,
      { ...anlage, bezeichnung: ' Inventurtag ' },
      'uid-2',
    );
    await service.deleteSondertag(pfad, aktualisiert);

    expect(sondertag).toMatchObject({ id: 'sondertag-neu', herkunft: 'benutzer' });
    expect(aktualisiert.bezeichnung).toBe('Inventurtag');
    expect(firestoreDbServiceMock.deleteDocument).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/einstellung/oeffnungszeiten/sondertag/sondertag-neu',
    );
  });

  it('should preserve system-defined special-day identity during updates', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const sondertag = createSondertag('heiligabend', 'system');

    const aktualisiert = await service.updateSystemSondertag(
      pfad,
      sondertag,
      {
        aktiv: false,
        oeffnungsregel: {
          geoeffnet: true,
          beginnLokalzeit: '08:00',
          endeLokalzeit: '14:00',
          endetAmFolgetag: false,
        },
      },
      'uid-2',
    );

    expect(aktualisiert).toMatchObject({
      id: 'heiligabend',
      bezeichnung: 'heiligabend',
      herkunft: 'system',
      aktiv: false,
    });
    expect(firestoreDbServiceMock.updateDocument.mock.calls[0][1]).not.toHaveProperty(
      'bezeichnung',
    );
  });

  it('should manage one exception by its ISO date and reject date changes', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const anlage = {
      datum: '2026-12-23',
      bezeichnung: 'Sonderöffnung',
      oeffnungsregel: { geoeffnet: false } as const,
    };
    const ausnahme = await service.createAusnahme(pfad, anlage, 'uid-1');

    await expect(
      service.updateAusnahme(pfad, ausnahme, { ...anlage, datum: '2026-12-24' }, 'uid-2'),
    ).rejects.toThrow('nicht geändert');
    await service.deleteAusnahme(pfad, '2026-12-23');

    expect(ausnahme.id).toBe('2026-12-23');
    expect(firestoreDbServiceMock.deleteDocument).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/einstellung/oeffnungszeiten/ausnahme/2026-12-23',
    );
  });

  it('should reject invalid weekly opening hours before writing', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const ungueltigeGrundlagen = {
      ...grundlagen,
      wochenregeln: {
        ...grundlagen.wochenregeln,
        montag: {
          geoeffnet: true,
          beginnLokalzeit: '07:00',
          endeLokalzeit: '01:00',
          endetAmFolgetag: false,
        },
      },
    } as IFilialeinstellungGrundlagen;

    const fehler = await service
      .initializeFilialeinstellung(pfad, ungueltigeGrundlagen, 'uid-1')
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(fehler).toBeInstanceOf(FilialeinstellungFachfehler);
    expect((fehler as Error).message).toContain('Zeitfolge');
    expect(firestoreDbServiceMock.executeDocumentTransaction).not.toHaveBeenCalled();
  });
});

function createGrundlagen(): IFilialeinstellungGrundlagen {
  const geoeffnet: TOeffnungsregel = {
    geoeffnet: true,
    beginnLokalzeit: '07:00',
    endeLokalzeit: '01:00',
    endetAmFolgetag: true,
  };
  const wochenregeln: TWochenoeffnungszeiten = {
    montag: geoeffnet,
    dienstag: geoeffnet,
    mittwoch: geoeffnet,
    donnerstag: geoeffnet,
    freitag: geoeffnet,
    samstag: geoeffnet,
    sonntag: { geoeffnet: false },
  };
  return { bundesland: 'DE-NW', wochenregeln };
}

function createSondertag(
  id: string,
  herkunft: 'system' | 'benutzer',
): IFilialeinstellungSondertagEintrag {
  return {
    id,
    ...{ unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' },
    bezeichnung: id,
    aktiv: true,
    herkunft,
    datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
    oeffnungsregel: { geoeffnet: false },
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}

function createBestand(
  sondertage: readonly IFilialeinstellungSondertagEintrag[],
): IFilialeinstellungBestand {
  const grundlagen = createGrundlagen();
  return {
    allgemein: {
      bundesland: grundlagen.bundesland,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    oeffnungszeiten: {
      wochenregeln: grundlagen.wochenregeln,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    sondertage,
    ausnahmen: [],
  };
}
