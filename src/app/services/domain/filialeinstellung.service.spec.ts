// pur-system/src/app/services/domain/filialeinstellung.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import {
  IGeoeffneteOeffnungsregel,
  IFilialeinstellungSondertagEintrag,
  TWochenregeln,
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

  it('should load the complete configuration from all three path areas', async () => {
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
          standardoeffnungsregel: grundlagen.standardoeffnungsregel,
          wochenregeln: grundlagen.wochenregeln,
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      });
    firestoreDbServiceMock.loadCollection.mockResolvedValueOnce([
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
    ]);
    const service = TestBed.inject(FilialeinstellungService);

    const rohdaten = await service.loadFilialeinstellungRohdaten(pfad);
    const bestand = service.validateFilialeinstellungRohdaten(pfad, rohdaten);

    expect(bestand?.sondertage[0]).toMatchObject({ ...pfad, id: 'heiligabend' });
  });

  it('should reject incomplete stored times for an overriding opening rule', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const ungueltigeGrundlagen = {
      ...grundlagen,
      wochenregeln: {
        ...grundlagen.wochenregeln,
        sonntag: {
          modus: 'abweichend',
          oeffnungsregel: { geoeffnet: true, beginnLokalzeit: '08:00' },
        },
      },
    } as unknown as IFilialeinstellungGrundlagen;

    await expect(
      service.initializeFilialeinstellung(pfad, ungueltigeGrundlagen, 'uid-1'),
    ).rejects.toThrow('Die Öffnungsregel enthält keine gültige Zeitfolge.');
    expect(firestoreDbServiceMock.executeDocumentTransaction).not.toHaveBeenCalled();
  });

  it('should reject an individual opening rule in standard mode', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const ungueltigeGrundlagen = {
      ...grundlagen,
      wochenregeln: {
        ...grundlagen.wochenregeln,
        montag: {
          modus: 'standard',
          oeffnungsregel: grundlagen.standardoeffnungsregel,
        },
      },
    } as unknown as IFilialeinstellungGrundlagen;

    await expect(
      service.initializeFilialeinstellung(pfad, ungueltigeGrundlagen, 'uid-1'),
    ).rejects.toThrow('darf keine eigene Öffnungsregel enthalten');
    expect(firestoreDbServiceMock.executeDocumentTransaction).not.toHaveBeenCalled();
  });

  it('should initialize explicit foundations and the system special days atomically', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const bestand = await service.initializeFilialeinstellung(pfad, grundlagen, 'uid-1');

    expect(bestand.allgemein.bundesland).toBe('DE-NW');
    expect(bestand.sondertage.some((sondertag) => sondertag.id === 'heiligabend')).toBe(true);
    expect(
      bestand.sondertage
        .filter((sondertag) => {
          return (
            sondertag.datumsregel.typ === 'gesetzlicherFeiertag' &&
            sondertag.id !== 'karfreitag' &&
            sondertag.id !== 'allerheiligen'
          );
        })
        .every((sondertag) => {
          return sondertag.aktiv && sondertag.modus === 'wieSonntag';
        }),
    ).toBe(true);
    expect(
      bestand.sondertage.find((sondertag) => {
        return sondertag.id === 'volkstrauertag';
      }),
    ).toMatchObject({
      aktiv: true,
      modus: 'abweichend',
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '13:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
    expect(
      bestand.sondertage.find((sondertag) => {
        return sondertag.id === 'totensonntag';
      }),
    ).toMatchObject({
      aktiv: true,
      modus: 'abweichend',
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '18:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
    const transactionCall = firestoreDbServiceMock.executeDocumentTransaction.mock.calls[0];
    expect(transactionCall[0]).toBe('unternehmer/u-1/firma/f-1/filiale/b-1/einstellung/allgemein');
    const operationen: TFirestoreBatchOperation[] = transactionCall[1](null).operationen;
    expect(operationen[0]).toMatchObject({
      daten: {
        bundesland: 'DE-NW',
        erstelltAm: 'server-zeitstempel',
      },
    });
    expect(
      operationen.find((operation) => operation.documentPath.endsWith('/heiligabend')),
    ).toMatchObject({
      daten: {
        aktiv: true,
        modus: 'abweichend',
        oeffnungsregel: {
          geoeffnet: true,
          beginnLokalzeit: '07:00',
          endeLokalzeit: '16:00',
          endetAmFolgetag: false,
        },
      },
    });
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

  it('should add missing calculated North Rhine-Westphalia special days atomically', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const bestand = createBestand([createSondertag('intern', 'benutzer')]);

    const aktualisiert = await service.saveGrundlagen(pfad, bestand, grundlagen, 'uid-2');

    expect(
      aktualisiert.sondertage.find((sondertag) => {
        return sondertag.id === 'volkstrauertag';
      }),
    ).toMatchObject({
      aktiv: true,
      modus: 'abweichend',
      datumsregel: {
        typ: 'berechneterSondertag',
        sondertagSchluessel: 'volkstrauertag',
      },
    });
    expect(firestoreDbServiceMock.updateDocumentsAtomically.mock.calls[0][0]).toContainEqual(
      expect.objectContaining({
        documentPath:
          'unternehmer/u-1/firma/f-1/filiale/b-1/einstellung/oeffnungszeiten/sondertag/volkstrauertag',
        daten: expect.objectContaining({ aktiv: true, modus: 'abweichend' }),
      }),
    );
  });

  it('should create, update and delete a user-defined special day', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const anlage = {
      bezeichnung: 'Inventur',
      aktiv: true,
      datumsregel: { typ: 'jaehrlichFestesDatum' as const, monat: 2, tag: 15 },
      oeffnungsregel: { geoeffnet: false } as const,
    };

    const sondertag = await service.createSondertag(pfad, anlage, [], 'uid-1');
    const aktualisiert = await service.updateSondertag(
      pfad,
      sondertag,
      { ...anlage, bezeichnung: ' Inventurtag ' },
      [sondertag],
      'uid-2',
    );
    await service.deleteSondertag(pfad, aktualisiert);

    expect(sondertag).toMatchObject({ id: 'sondertag-neu', herkunft: 'benutzer' });
    expect(aktualisiert.bezeichnung).toBe('Inventurtag');
    expect(firestoreDbServiceMock.deleteDocument).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/einstellung/oeffnungszeiten/sondertag/sondertag-neu',
    );
  });

  it('should reject an active annual date collision before writing', async () => {
    const service = TestBed.inject(FilialeinstellungService);

    await expect(
      service.createSondertag(
        pfad,
        {
          bezeichnung: 'Betriebsruhe',
          aktiv: true,
          datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
          oeffnungsregel: { geoeffnet: false },
        },
        [createSondertag('betriebsruhe-vorhanden', 'benutzer')],
        'uid-1',
      ),
    ).rejects.toThrow('Betriebsruhe');

    expect(firestoreDbServiceMock.updateDocument).not.toHaveBeenCalled();
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
      [sondertag],
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

  it('should reject deleting a calculated system special day', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const volkstrauertag = {
      ...createSondertag('volkstrauertag', 'system'),
      bezeichnung: 'Volkstrauertag',
      datumsregel: {
        typ: 'berechneterSondertag' as const,
        sondertagSchluessel: 'volkstrauertag' as const,
      },
    };

    await expect(service.deleteSondertag(pfad, volkstrauertag)).rejects.toThrow(
      'Systemdefinierte Sondertage können nicht gelöscht werden.',
    );
    expect(firestoreDbServiceMock.deleteDocument).not.toHaveBeenCalled();
  });

  it('should persist Sunday mode only for statutory holidays', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const feiertag = {
      ...createSondertag('neujahr', 'system'),
      datumsregel: {
        typ: 'gesetzlicherFeiertag' as const,
        feiertagSchluessel: 'neujahr' as const,
      },
    };

    await expect(
      service.updateSystemSondertag(
        pfad,
        feiertag,
        {
          aktiv: true,
          modus: 'wieSonntag',
          oeffnungsregel: { geoeffnet: false },
        },
        [feiertag],
        'uid-2',
      ),
    ).resolves.toMatchObject({ aktiv: true, modus: 'wieSonntag' });
    await expect(
      service.updateSystemSondertag(
        pfad,
        createSondertag('heiligabend', 'system'),
        {
          aktiv: true,
          modus: 'wieSonntag',
          oeffnungsregel: { geoeffnet: false },
        },
        [],
        'uid-2',
      ),
    ).rejects.toThrow('kann nicht wie ein Sonntag behandelt werden');
  });

  it('should reject invalid weekly opening hours before writing', async () => {
    const service = TestBed.inject(FilialeinstellungService);
    const ungueltigeGrundlagen = {
      ...grundlagen,
      wochenregeln: {
        ...grundlagen.wochenregeln,
        montag: {
          modus: 'abweichend',
          oeffnungsregel: {
            geoeffnet: true,
            beginnLokalzeit: '07:00',
            endeLokalzeit: '01:00',
            endetAmFolgetag: false,
          },
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
  const standardoeffnungsregel: IGeoeffneteOeffnungsregel = {
    geoeffnet: true,
    beginnLokalzeit: '07:00',
    endeLokalzeit: '01:00',
    endetAmFolgetag: true,
  };
  const wochenregeln: TWochenregeln = {
    montag: { modus: 'standard' },
    dienstag: { modus: 'standard' },
    mittwoch: { modus: 'standard' },
    donnerstag: { modus: 'standard' },
    freitag: { modus: 'standard' },
    samstag: { modus: 'standard' },
    sonntag: { modus: 'geschlossen' },
  };
  return {
    bundesland: 'DE-NW',
    standardoeffnungsregel,
    wochenregeln,
  };
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
      standardoeffnungsregel: grundlagen.standardoeffnungsregel,
      wochenregeln: grundlagen.wochenregeln,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    sondertage,
  };
}
