// pur-system/src/app/services/domain/schichtvorlage.service.spec.ts

import { TestBed } from '@angular/core/testing';

import {
  ISchichtvorlageAnlage,
  ISchichtvorlageDokument,
} from '../../commons/models/domain/schichtvorlage';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { SchichtvorlageService } from './schichtvorlage.service';

describe('SchichtvorlageService', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const anlage: ISchichtvorlageAnlage = {
    bezeichnung: ' Frühschicht ',
    beginnLokalzeit: '08:00',
    endeLokalzeit: '16:30',
    endetAmFolgetag: false,
    standardpauseMinuten: 30,
  };
  const loadCollectionMock = vi.fn();
  const createDocumentMock = vi.fn();
  const updateDocumentMock = vi.fn();
  const createServerTimestampMock = vi.fn();
  const firestoreDbServiceMock = {
    loadCollection: loadCollectionMock,
    createDocument: createDocumentMock,
    updateDocument: updateDocumentMock,
    createServerTimestamp: createServerTimestampMock,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    loadCollectionMock.mockResolvedValue([]);
    createDocumentMock.mockResolvedValue('vorlage-1');
    updateDocumentMock.mockResolvedValue(undefined);
    createServerTimestampMock.mockReturnValue('server-zeitstempel');

    TestBed.configureTestingModule({
      providers: [
        SchichtvorlageService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
      ],
    });
  });

  it('should load and sort every shift template of a branch', async () => {
    loadCollectionMock.mockResolvedValue([
      {
        id: 'spaet',
        daten: createDokument({ bezeichnung: 'Spätschicht', beginnLokalzeit: '16:30' }),
      },
      { id: 'frueh-b', daten: createDokument({ bezeichnung: 'Frühschicht B' }) },
      { id: 'frueh-a', daten: createDokument({ bezeichnung: 'Frühschicht A' }) },
    ]);
    const service = TestBed.inject(SchichtvorlageService);

    const vorlagen = await service.loadSchichtvorlagen(pfad);

    expect(vorlagen.map((vorlage) => vorlage.id)).toEqual(['frueh-a', 'frueh-b', 'spaet']);
    expect(vorlagen[0]).toEqual(expect.objectContaining({ ...pfad, aktiv: true }));
    expect(loadCollectionMock).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/schichtvorlage',
      'networkOnly',
    );
  });

  it('should create an active normalized shift template with audit metadata', async () => {
    const service = TestBed.inject(SchichtvorlageService);

    const ergebnis = await service.createSchichtvorlage(pfad, anlage, 'uid-1');

    expect(ergebnis).toEqual({
      ...pfad,
      id: 'vorlage-1',
      bezeichnung: 'Frühschicht',
      beginnLokalzeit: '08:00',
      endeLokalzeit: '16:30',
      endetAmFolgetag: false,
      standardpauseMinuten: 30,
      aktiv: true,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    });
    expect(createDocumentMock).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/schichtvorlage',
      {
        bezeichnung: 'Frühschicht',
        beginnLokalzeit: '08:00',
        endeLokalzeit: '16:30',
        endetAmFolgetag: false,
        standardpauseMinuten: 30,
        aktiv: true,
        erstelltAm: 'server-zeitstempel',
        erstelltVonUid: 'uid-1',
        aktualisiertAm: 'server-zeitstempel',
        aktualisiertVonUid: 'uid-1',
      },
    );
  });

  it('should update the complete editable shift template data', async () => {
    const service = TestBed.inject(SchichtvorlageService);

    await service.updateSchichtvorlage(
      pfad,
      'vorlage-1',
      { ...anlage, bezeichnung: ' Frühschicht Werktag ', aktiv: false },
      'uid-2',
    );

    expect(updateDocumentMock).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/schichtvorlage/vorlage-1',
      {
        bezeichnung: 'Frühschicht Werktag',
        beginnLokalzeit: '08:00',
        endeLokalzeit: '16:30',
        endetAmFolgetag: false,
        standardpauseMinuten: 30,
        aktiv: false,
        aktualisiertAm: 'server-zeitstempel',
        aktualisiertVonUid: 'uid-2',
      },
    );
  });

  it('should deactivate a shift template without deleting it', async () => {
    const service = TestBed.inject(SchichtvorlageService);

    await service.deactivateSchichtvorlage(pfad, 'vorlage-1', 'uid-2');

    expect(updateDocumentMock).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/filiale/b-1/schichtvorlage/vorlage-1',
      {
        aktiv: false,
        aktualisiertAm: 'server-zeitstempel',
        aktualisiertVonUid: 'uid-2',
      },
    );
  });

  it('should reset a removed standard break to zero minutes when updating', async () => {
    const service = TestBed.inject(SchichtvorlageService);

    await service.updateSchichtvorlage(
      pfad,
      'vorlage-1',
      { ...anlage, standardpauseMinuten: undefined, aktiv: true },
      'uid-2',
    );

    expect(updateDocumentMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ standardpauseMinuten: 0 }),
    );
  });

  it('should omit a missing optional standard break when creating', async () => {
    const service = TestBed.inject(SchichtvorlageService);

    await service.createSchichtvorlage(
      pfad,
      { ...anlage, standardpauseMinuten: undefined },
      'uid-1',
    );

    expect(createDocumentMock.mock.calls[0][1]).not.toHaveProperty('standardpauseMinuten');
  });

  it('should propagate Firestore errors', async () => {
    const error = { code: 'permission-denied' };
    createDocumentMock.mockRejectedValue(error);
    const service = TestBed.inject(SchichtvorlageService);

    await expect(service.createSchichtvorlage(pfad, anlage, 'uid-1')).rejects.toBe(error);
  });
});

function createDokument(overrides: Partial<ISchichtvorlageDokument> = {}): ISchichtvorlageDokument {
  return {
    bezeichnung: 'Frühschicht',
    beginnLokalzeit: '08:00',
    endeLokalzeit: '16:30',
    endetAmFolgetag: false,
    standardpauseMinuten: 30,
    aktiv: true,
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
    ...overrides,
  };
}
