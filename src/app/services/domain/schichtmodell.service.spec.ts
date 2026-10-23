// pur-system/src/app/services/domain/schichtmodell.service.spec.ts

import { TestBed } from '@angular/core/testing';

import {
  IModellschichtDokument,
  ISchichtrastermodellAnlage,
  ISchichtrastermodellDokument,
} from '../../commons/models/domain/schichtmodell';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { SchichtmodellService } from './schichtmodell.service';

describe('SchichtmodellService', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const anlage: ISchichtrastermodellAnlage = {
    bezeichnung: ' Sommer ',
    modellschichten: [
      {
        bezeichnung: ' Früh ',
        reihenfolge: 0,
        ende: { lokalzeit: '16:00', tag: 'starttag' },
        mehrfachbelegungErlaubt: false,
        vorbereitungsminuten: 30,
      },
      {
        bezeichnung: 'Spät',
        reihenfolge: 1,
        beginn: { lokalzeit: '16:00', tag: 'starttag' },
        mehrfachbelegungErlaubt: true,
        nachbereitungsminuten: 15,
      },
    ],
  };
  const loadCollection = vi.fn();
  const createDocumentId = vi.fn();
  const createServerTimestamp = vi.fn();
  const updateDocumentsAtomically = vi.fn();
  const updateDocument = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    loadCollection.mockResolvedValue([]);
    createDocumentId
      .mockReturnValueOnce('modell-1')
      .mockReturnValueOnce('schicht-1')
      .mockReturnValueOnce('schicht-2');
    createServerTimestamp.mockReturnValue('server-zeit');
    updateDocumentsAtomically.mockResolvedValue(undefined);
    updateDocument.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        SchichtmodellService,
        {
          provide: FirestoreDbService,
          useValue: {
            loadCollection,
            createDocumentId,
            createServerTimestamp,
            updateDocumentsAtomically,
            updateDocument,
          },
        },
      ],
    });
  });

  it('should load branch models with their stored model shift order', async () => {
    loadCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath.endsWith('/schichtmodell')) {
        return Promise.resolve([
          { id: 'winter', daten: createSchichtmodellDokument('Winter') },
          { id: 'sommer', daten: createSchichtmodellDokument('Sommer') },
        ]);
      }
      const daten: IModellschichtDokument[] = [
        createModellschichtDokument('Spät', 1),
        createModellschichtDokument('Früh', 0),
      ];
      return Promise.resolve(daten.map((wert, index) => ({ id: `s-${index}`, daten: wert })));
    });
    const service = TestBed.inject(SchichtmodellService);

    const ergebnis = await service.loadSchichtmodelle(pfad);

    expect(ergebnis.map((bestand) => bestand.schichtmodell.id)).toEqual(['sommer', 'winter']);
    expect(ergebnis[0].modellschichten.map((schicht) => schicht.bezeichnung)).toEqual([
      'Früh',
      'Spät',
    ]);
    expect(ergebnis[0].modellschichten[0].reihenfolge).toBe(0);
    expect(loadCollection).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/schichtmodell/sommer/modellschicht',
      'networkOnly',
    );
  });

  it('should reject a model with an unsupported planning type', async () => {
    loadCollection.mockResolvedValue([
      {
        id: 'flexibel',
        daten: {
          ...createSchichtmodellDokument('Flexibel'),
          planungsart: 'schichtbausteine',
        },
      },
    ]);
    const service = TestBed.inject(SchichtmodellService);

    await expect(service.loadSchichtmodelle(pfad)).rejects.toThrow(
      'Die Planungsart des Schichtmodells wird noch nicht unterstützt.',
    );
  });

  it('should create a model and its explicitly ordered shifts atomically', async () => {
    const service = TestBed.inject(SchichtmodellService);

    const ergebnis = await service.createSchichtmodell(pfad, anlage, 'uid-1');

    expect(ergebnis.schichtmodell).toEqual(
      expect.objectContaining({
        id: 'modell-1',
        bezeichnung: 'Sommer',
        aktiv: true,
        planungsart: 'schichtraster',
      }),
    );
    expect(ergebnis.modellschichten.map((schicht) => schicht.bezeichnung)).toEqual([
      'Früh',
      'Spät',
    ]);
    expect(ergebnis.modellschichten[0]).toEqual(
      expect.objectContaining({ vorbereitungsminuten: 30, nachbereitungsminuten: 0 }),
    );
    expect(ergebnis.modellschichten[1]).toEqual(
      expect.objectContaining({ vorbereitungsminuten: 0, nachbereitungsminuten: 15 }),
    );
    expect(updateDocumentsAtomically).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/schichtmodell/modell-1',
          daten: expect.objectContaining({ planungsart: 'schichtraster' }),
        }),
        expect.objectContaining({
          documentPath:
            'unternehmer/u-1/firma/f-1/filiale/b-1/schichtmodell/modell-1/modellschicht/schicht-1',
          daten: expect.objectContaining({ bezeichnung: 'Früh' }),
        }),
      ]),
    );
    expect(updateDocumentsAtomically.mock.calls[0][0][1].daten).toEqual(
      expect.objectContaining({ reihenfolge: 0 }),
    );
    expect(updateDocumentsAtomically.mock.calls[0][0][1].daten).not.toHaveProperty('beginn');
    expect(updateDocumentsAtomically.mock.calls[0][0][2].daten).not.toHaveProperty('ende');
  });

  it('should retain known shift ids and delete removed shifts while updating', async () => {
    const service = TestBed.inject(SchichtmodellService);
    const bestand = {
      schichtmodell: {
        ...pfad,
        id: 'modell-1',
        ...createSchichtmodellDokument('Sommer'),
      },
      modellschichten: [
        {
          ...pfad,
          schichtmodellId: 'modell-1',
          id: 'alt-1',
          ...createModellschichtDokument('Früh', 0),
        },
        {
          ...pfad,
          schichtmodellId: 'modell-1',
          id: 'alt-2',
          ...createModellschichtDokument('Spät', 1),
        },
      ],
    };

    await service.updateSchichtmodell(
      pfad,
      bestand,
      {
        bezeichnung: 'Sommer neu',
        aktiv: false,
        modellschichten: [
          {
            ...anlage.modellschichten[0],
            id: 'alt-1',
            ende: undefined,
            nachbereitungsminuten: 15,
          },
        ],
      },
      'uid-2',
    );

    expect(updateDocumentsAtomically).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          documentPath: 'unternehmer/u-1/firma/f-1/filiale/b-1/schichtmodell/modell-1',
          daten: expect.objectContaining({ bezeichnung: 'Sommer neu', aktiv: false }),
        }),
        expect.objectContaining({
          documentPath: expect.stringMatching(/\/alt-1$/),
          daten: expect.objectContaining({ bezeichnung: 'Früh' }),
        }),
        {
          documentPath:
            'unternehmer/u-1/firma/f-1/filiale/b-1/schichtmodell/modell-1/modellschicht/alt-2',
          delete: true,
        },
      ]),
    );
  });

  it('should reject a model without model shifts and deactivate without deleting it', async () => {
    const service = TestBed.inject(SchichtmodellService);

    await expect(
      service.createSchichtmodell(pfad, { bezeichnung: 'Leer', modellschichten: [] }, 'uid-1'),
    ).rejects.toThrow('mindestens eine Modellschicht');
    await service.deactivateSchichtmodell(pfad, 'modell-1', 'uid-2');

    expect(updateDocument).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/schichtmodell/modell-1',
      expect.objectContaining({ aktiv: false, aktualisiertVonUid: 'uid-2' }),
    );
  });

  it('should reject an empty shift label', async () => {
    const service = TestBed.inject(SchichtmodellService);

    await expect(
      service.createSchichtmodell(
        pfad,
        {
          bezeichnung: 'Ungültig',
          modellschichten: [{ ...anlage.modellschichten[0], bezeichnung: ' ' }],
        },
        'uid-1',
      ),
    ).rejects.toThrow('gültige Bezeichnung');
  });

  it('should reject invalid model shift structures before writing', async () => {
    const service = TestBed.inject(SchichtmodellService);
    const ungueltigeAnlage: ISchichtrastermodellAnlage = {
      ...anlage,
      modellschichten: [
        { ...anlage.modellschichten[0], id: 'doppelt' },
        { ...anlage.modellschichten[1], id: 'doppelt', reihenfolge: 2 },
      ],
    };

    await expect(service.createSchichtmodell(pfad, ungueltigeAnlage, 'uid-1')).rejects.toThrow(
      'Reihenfolge',
    );
    expect(updateDocumentsAtomically).not.toHaveBeenCalled();
  });

  it('should reject preparation or follow-up values above three digits', async () => {
    const service = TestBed.inject(SchichtmodellService);
    const ungueltigeAnlage: ISchichtrastermodellAnlage = {
      ...anlage,
      modellschichten: [
        { ...anlage.modellschichten[0], vorbereitungsminuten: 1000 },
        anlage.modellschichten[1],
      ],
    };

    await expect(service.createSchichtmodell(pfad, ungueltigeAnlage, 'uid-1')).rejects.toThrow(
      '0 bis 999',
    );
    expect(updateDocumentsAtomically).not.toHaveBeenCalled();
  });
});

function createSchichtmodellDokument(bezeichnung: string): ISchichtrastermodellDokument {
  return {
    bezeichnung,
    aktiv: true,
    planungsart: 'schichtraster',
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}

function createModellschichtDokument(
  bezeichnung: string,
  reihenfolge: number,
): IModellschichtDokument {
  return {
    bezeichnung,
    reihenfolge,
    mehrfachbelegungErlaubt: false,
  };
}
