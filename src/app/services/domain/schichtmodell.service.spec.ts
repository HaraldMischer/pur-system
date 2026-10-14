// pur-system/src/app/services/domain/schichtmodell.service.spec.ts

import { TestBed } from '@angular/core/testing';

import {
  IModellschichtDokument,
  ISchichtmodellAnlage,
  ISchichtmodellDokument,
} from '../../commons/models/domain/schichtmodell';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { SchichtmodellService } from './schichtmodell.service';

describe('SchichtmodellService', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const anlage: ISchichtmodellAnlage = {
    bezeichnung: ' Sommer ',
    modellschichten: [
      {
        bezeichnung: 'Spät',
        beginnLokalzeit: '16:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
        standardpauseMinuten: 30,
      },
      {
        bezeichnung: ' Früh ',
        beginnLokalzeit: '07:00',
        endeLokalzeit: '12:00',
        endetAmFolgetag: false,
        standardpauseMinuten: 0,
      },
    ],
  };
  const loadCollection = vi.fn();
  const createDocumentId = vi.fn();
  const createDeleteField = vi.fn();
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
    createDeleteField.mockReturnValue('feld-loeschen');
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
            createDeleteField,
            createServerTimestamp,
            updateDocumentsAtomically,
            updateDocument,
          },
        },
      ],
    });
  });

  it('should load branch models with chronologically ordered model shifts', async () => {
    loadCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath.endsWith('/schichtmodell')) {
        return Promise.resolve([
          { id: 'winter', daten: createSchichtmodellDokument('Winter') },
          { id: 'sommer', daten: createSchichtmodellDokument('Sommer') },
        ]);
      }
      const daten: IModellschichtDokument[] = [
        createModellschichtDokument('Spät', '16:00', '01:00'),
        createModellschichtDokument('Früh', '07:00', '12:00'),
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
    expect(ergebnis[0].modellschichten[0]).not.toHaveProperty('reihenfolge');
    expect(loadCollection).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/schichtmodell/sommer/modellschicht',
      'networkOnly',
    );
  });

  it('should create a model and its normalized chronologically ordered shifts atomically', async () => {
    const service = TestBed.inject(SchichtmodellService);

    const ergebnis = await service.createSchichtmodell(pfad, anlage, 'uid-1');

    expect(ergebnis.schichtmodell).toEqual(
      expect.objectContaining({ id: 'modell-1', bezeichnung: 'Sommer', aktiv: true }),
    );
    expect(ergebnis.modellschichten.map((schicht) => schicht.bezeichnung)).toEqual([
      'Früh',
      'Spät',
    ]);
    expect(updateDocumentsAtomically).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          documentPath:
            'unternehmer/u-1/firma/f-1/filiale/b-1/schichtmodell/modell-1/modellschicht/schicht-2',
          daten: expect.objectContaining({ bezeichnung: 'Früh' }),
        }),
      ]),
    );
    expect(updateDocumentsAtomically.mock.calls[0][0][1].daten).not.toHaveProperty('reihenfolge');
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
          ...createModellschichtDokument('Früh', '07:00', '12:00'),
        },
        {
          ...pfad,
          schichtmodellId: 'modell-1',
          id: 'alt-2',
          ...createModellschichtDokument('Spät', '16:00', '01:00'),
        },
      ],
    };

    await service.updateSchichtmodell(
      pfad,
      bestand,
      {
        bezeichnung: 'Sommer neu',
        aktiv: false,
        modellschichten: [{ ...anlage.modellschichten[0], id: 'alt-1' }],
      },
      'uid-2',
    );

    expect(updateDocumentsAtomically).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          documentPath: expect.stringMatching(/\/alt-1$/),
          daten: expect.objectContaining({ reihenfolge: 'feld-loeschen' }),
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

  it('should reject invalid local times and calculate the standard break itself', async () => {
    const service = TestBed.inject(SchichtmodellService);

    await expect(
      service.createSchichtmodell(
        pfad,
        {
          bezeichnung: 'Ungültig',
          modellschichten: [
            { ...anlage.modellschichten[0], beginnLokalzeit: '08:00', endeLokalzeit: '08:00' },
          ],
        },
        'uid-1',
      ),
    ).rejects.toThrow('gültige Bezeichnung oder Zeitfolge');

    await service.createSchichtmodell(
      pfad,
      {
        bezeichnung: 'Sommer',
        modellschichten: [
          {
            ...anlage.modellschichten[0],
            beginnLokalzeit: '08:00',
            endeLokalzeit: '17:01',
            standardpauseMinuten: 0,
          },
        ],
      },
      'uid-1',
    );
    expect(updateDocumentsAtomically).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ daten: expect.objectContaining({ standardpauseMinuten: 45 }) }),
      ]),
    );
  });
});

function createSchichtmodellDokument(bezeichnung: string): ISchichtmodellDokument {
  return {
    bezeichnung,
    aktiv: true,
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}

function createModellschichtDokument(
  bezeichnung: string,
  beginnLokalzeit: string,
  endeLokalzeit: string,
): IModellschichtDokument {
  return {
    bezeichnung,
    beginnLokalzeit,
    endeLokalzeit,
    endetAmFolgetag: endeLokalzeit < beginnLokalzeit,
    standardpauseMinuten: beginnLokalzeit === '07:00' ? 0 : 30,
  };
}
