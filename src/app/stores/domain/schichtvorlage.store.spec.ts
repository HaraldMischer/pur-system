// pur-system/src/app/stores/domain/schichtvorlage.store.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ISchichtvorlageAnlage,
  ISchichtvorlageEintrag,
} from '../../commons/models/domain/schichtvorlage';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { SchichtvorlageService } from '../../services/domain/schichtvorlage.service';
import { BenutzerStore } from '../app/benutzer.store';
import { SchichtvorlageStore } from './schichtvorlage.store';

describe('SchichtvorlageStore', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const andererPfad = { ...pfad, filialeId: 'b-2' };
  const benutzerId = signal<string | null>('uid-1');
  const anlage: ISchichtvorlageAnlage = {
    bezeichnung: 'Frühschicht',
    beginnLokalzeit: '08:00',
    endeLokalzeit: '16:30',
    endetAmFolgetag: false,
    standardpauseMinuten: 30,
  };
  const fruehschicht = createSchichtvorlage('frueh', anlage);
  const inaktiveSchicht = createSchichtvorlage(
    'nacht',
    {
      bezeichnung: 'Nachtschicht',
      beginnLokalzeit: '22:00',
      endeLokalzeit: '06:00',
      endetAmFolgetag: true,
    },
    false,
  );
  const loadSchichtvorlagenMock = vi.fn();
  const createSchichtvorlageMock = vi.fn();
  const updateSchichtvorlageMock = vi.fn();
  const deactivateSchichtvorlageMock = vi.fn();
  const schichtvorlageServiceMock = {
    loadSchichtvorlagen: loadSchichtvorlagenMock,
    createSchichtvorlage: createSchichtvorlageMock,
    updateSchichtvorlage: updateSchichtvorlageMock,
    deactivateSchichtvorlage: deactivateSchichtvorlageMock,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    benutzerId.set('uid-1');
    loadSchichtvorlagenMock.mockResolvedValue([fruehschicht, inaktiveSchicht]);
    createSchichtvorlageMock.mockResolvedValue(createSchichtvorlage('spaet', anlage));
    updateSchichtvorlageMock.mockResolvedValue(undefined);
    deactivateSchichtvorlageMock.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        SchichtvorlageStore,
        { provide: SchichtvorlageService, useValue: schichtvorlageServiceMock },
        { provide: BenutzerStore, useValue: { benutzerId } },
        {
          provide: StoreSnapshotService,
          useValue: { registerStoreSnapshot: vi.fn().mockReturnValue(vi.fn()) },
        },
      ],
    });
  });

  it('should load a branch context and derive active shift templates', async () => {
    const store = TestBed.inject(SchichtvorlageStore);

    await store.loadSchichtvorlagen(pfad);

    expect(loadSchichtvorlagenMock).toHaveBeenCalledWith(pfad, 'networkOnly');
    expect(store.schichtvorlagen()).toEqual([fruehschicht, inaktiveSchicht]);
    expect(store.activeSchichtvorlagen()).toEqual([fruehschicht]);
    expect(store.download()).toBe(false);
    expect(store.isLoaded()).toBe(true);
  });

  it('should reuse an active load and replace data when the branch changes', async () => {
    let resolveLoad: ((vorlagen: ISchichtvorlageEintrag[]) => void) | undefined;
    loadSchichtvorlagenMock.mockReturnValueOnce(
      new Promise<ISchichtvorlageEintrag[]>((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const store = TestBed.inject(SchichtvorlageStore);

    const ersterAuftrag = store.loadSchichtvorlagen(pfad);
    const gleicherAuftrag = store.loadSchichtvorlagen(pfad);
    expect(gleicherAuftrag).toBe(ersterAuftrag);
    resolveLoad?.([fruehschicht]);
    await ersterAuftrag;

    const andereVorlage = createSchichtvorlage('andere', anlage, true, andererPfad);
    loadSchichtvorlagenMock.mockResolvedValueOnce([andereVorlage]);
    await store.loadSchichtvorlagen(andererPfad);

    expect(loadSchichtvorlagenMock).toHaveBeenCalledTimes(2);
    expect(store.schichtvorlagen()).toEqual([andereVorlage]);
    expect(store.selectedFilialeId()).toBe('b-2');
  });

  it('should create a shift template and add it to the loaded context', async () => {
    const store = TestBed.inject(SchichtvorlageStore);
    await store.loadSchichtvorlagen(pfad);

    await store.createSchichtvorlage(pfad, anlage);

    expect(createSchichtvorlageMock).toHaveBeenCalledWith(pfad, anlage, 'uid-1');
    expect(store.schichtvorlagen().map((vorlage) => vorlage.id)).toContain('spaet');
    expect(store.inProgress()).toBe(false);
  });

  it('should update and deactivate a loaded shift template', async () => {
    const store = TestBed.inject(SchichtvorlageStore);
    await store.loadSchichtvorlagen(pfad);

    await store.updateSchichtvorlage(pfad, 'frueh', {
      ...anlage,
      bezeichnung: ' Frühschicht Werktag ',
      aktiv: true,
    });
    expect(updateSchichtvorlageMock).toHaveBeenCalledWith(
      pfad,
      'frueh',
      { ...anlage, bezeichnung: ' Frühschicht Werktag ', aktiv: true },
      'uid-1',
    );
    expect(store.schichtvorlagen()[0]).toEqual(
      expect.objectContaining({ bezeichnung: 'Frühschicht Werktag' }),
    );

    await store.deactivateSchichtvorlage(pfad, 'frueh');
    expect(deactivateSchichtvorlageMock).toHaveBeenCalledWith(pfad, 'frueh', 'uid-1');
    expect(store.schichtvorlagen().find((vorlage) => vorlage.id === 'frueh')?.aktiv).toBe(false);
    expect(store.activeSchichtvorlagen()).toEqual([]);
  });

  it('should expose load errors and allow retrying the same branch', async () => {
    loadSchichtvorlagenMock.mockRejectedValueOnce({ code: 'unavailable' });
    const store = TestBed.inject(SchichtvorlageStore);

    await expect(store.loadSchichtvorlagen(pfad)).rejects.toEqual({ code: 'unavailable' });
    expect(store.error()).toBe('Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.');
    expect(store.download()).toBe(false);
    expect(store.isLoaded()).toBe(false);

    await store.loadSchichtvorlagen(pfad);
    expect(loadSchichtvorlagenMock).toHaveBeenCalledTimes(2);
    expect(store.isLoaded()).toBe(true);
  });

  it('should expose write errors and restore the write state', async () => {
    const error = { code: 'permission-denied' };
    createSchichtvorlageMock.mockRejectedValue(error);
    const store = TestBed.inject(SchichtvorlageStore);
    await store.loadSchichtvorlagen(pfad);

    await expect(store.createSchichtvorlage(pfad, anlage)).rejects.toBe(error);
    expect(store.error()).toBe('Du hast keine Berechtigung für diese Aktion.');
    expect(store.inProgress()).toBe(false);
  });

  it('should ignore a completed write after switching to another branch', async () => {
    let resolveCreate: ((vorlage: ISchichtvorlageEintrag) => void) | undefined;
    createSchichtvorlageMock.mockReturnValueOnce(
      new Promise<ISchichtvorlageEintrag>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const store = TestBed.inject(SchichtvorlageStore);
    await store.loadSchichtvorlagen(pfad);

    const schreibauftrag = store.createSchichtvorlage(pfad, anlage);
    const andereVorlage = createSchichtvorlage('andere', anlage, true, andererPfad);
    loadSchichtvorlagenMock.mockResolvedValueOnce([andereVorlage]);
    await store.loadSchichtvorlagen(andererPfad);
    resolveCreate?.(createSchichtvorlage('spaet', anlage));
    await schreibauftrag;

    expect(store.selectedFilialeId()).toBe('b-2');
    expect(store.schichtvorlagen()).toEqual([andereVorlage]);
    expect(store.inProgress()).toBe(false);
  });

  it('should require a loaded matching branch and authenticated user before writing', async () => {
    const store = TestBed.inject(SchichtvorlageStore);

    await expect(store.createSchichtvorlage(pfad, anlage)).rejects.toThrow(
      'Die Schichtvorlagen der Filiale müssen vor dem Schreiben geladen werden.',
    );
    await store.loadSchichtvorlagen(pfad);
    benutzerId.set(null);
    await expect(store.deactivateSchichtvorlage(pfad, 'frueh')).rejects.toThrow(
      'Für den Schreibvorgang fehlt die Benutzeridentität.',
    );
    expect(deactivateSchichtvorlageMock).not.toHaveBeenCalled();
  });

  it('should clear errors and reset the complete branch context', async () => {
    const store = TestBed.inject(SchichtvorlageStore);
    await store.loadSchichtvorlagen(pfad);

    store.clearError();
    store.resetSchichtvorlagen();

    expect(store.snapshot()).toEqual({
      schichtvorlagen: [],
      selectedUnternehmerId: null,
      selectedFirmaId: null,
      selectedFilialeId: null,
      download: false,
      isLoaded: false,
      inProgress: false,
      error: null,
    });
  });
});

function createSchichtvorlage(
  id: string,
  daten: ISchichtvorlageAnlage,
  aktiv = true,
  pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' },
): ISchichtvorlageEintrag {
  return {
    ...daten,
    ...pfad,
    id,
    aktiv,
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}
