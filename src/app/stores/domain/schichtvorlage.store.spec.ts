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
  const andereVorlage = createSchichtvorlage('andere', anlage, true, andererPfad);
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
    loadSchichtvorlagenMock.mockImplementation((ladePfad) => {
      return Promise.resolve(
        ladePfad.filialeId === 'b-1' ? [fruehschicht, inaktiveSchicht] : [andereVorlage],
      );
    });
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

  it('should retain independently loaded shift-template contexts for multiple branches', async () => {
    const store = TestBed.inject(SchichtvorlageStore);

    await Promise.all([store.loadSchichtvorlagen(pfad), store.loadSchichtvorlagen(andererPfad)]);

    expect(loadSchichtvorlagenMock).toHaveBeenCalledWith(pfad, 'networkOnly');
    expect(loadSchichtvorlagenMock).toHaveBeenCalledWith(andererPfad, 'networkOnly');
    expect(store.getSchichtvorlageKontext(pfad)?.schichtvorlagen).toEqual([
      fruehschicht,
      inaktiveSchicht,
    ]);
    expect(store.getSchichtvorlageKontext(andererPfad)?.schichtvorlagen).toEqual([andereVorlage]);
  });

  it('should reuse an active and a completely loaded branch request', async () => {
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
    await store.loadSchichtvorlagen(pfad);

    expect(loadSchichtvorlagenMock).toHaveBeenCalledTimes(1);
  });

  it('should create a shift template only in its branch context', async () => {
    const store = TestBed.inject(SchichtvorlageStore);
    await Promise.all([store.loadSchichtvorlagen(pfad), store.loadSchichtvorlagen(andererPfad)]);

    await store.createSchichtvorlage(pfad, anlage);

    expect(createSchichtvorlageMock).toHaveBeenCalledWith(pfad, anlage, 'uid-1');
    expect(
      store.getSchichtvorlageKontext(pfad)?.schichtvorlagen.map((vorlage) => vorlage.id),
    ).toContain('spaet');
    expect(store.getSchichtvorlageKontext(andererPfad)?.schichtvorlagen).toEqual([andereVorlage]);
  });

  it('should update and deactivate a shift template in its branch context', async () => {
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
    expect(store.getSchichtvorlageKontext(pfad)?.schichtvorlagen[0]).toEqual(
      expect.objectContaining({ bezeichnung: 'Frühschicht Werktag' }),
    );

    await store.deactivateSchichtvorlage(pfad, 'frueh');
    expect(deactivateSchichtvorlageMock).toHaveBeenCalledWith(pfad, 'frueh', 'uid-1');
    expect(
      store
        .getSchichtvorlageKontext(pfad)
        ?.schichtvorlagen.find((vorlage) => vorlage.id === 'frueh')?.aktiv,
    ).toBe(false);
  });

  it('should expose a load error only in the affected branch and allow retrying', async () => {
    loadSchichtvorlagenMock.mockRejectedValueOnce({ code: 'unavailable' });
    const store = TestBed.inject(SchichtvorlageStore);

    await expect(store.loadSchichtvorlagen(pfad)).rejects.toEqual({ code: 'unavailable' });
    expect(store.getSchichtvorlageKontext(pfad)?.error).toBe(
      'Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.',
    );

    await store.loadSchichtvorlagen(andererPfad);
    expect(store.getSchichtvorlageKontext(andererPfad)?.error).toBeNull();
    await store.loadSchichtvorlagen(pfad);
    expect(store.getSchichtvorlageKontext(pfad)?.isLoaded).toBe(true);
  });

  it('should expose write errors and require a loaded branch and authenticated user', async () => {
    createSchichtvorlageMock.mockRejectedValue({ code: 'permission-denied' });
    const store = TestBed.inject(SchichtvorlageStore);

    await expect(store.createSchichtvorlage(pfad, anlage)).rejects.toThrow(
      'Die Schichtvorlagen der Filiale müssen vor dem Schreiben geladen werden.',
    );
    await store.loadSchichtvorlagen(pfad);
    await expect(store.createSchichtvorlage(pfad, anlage)).rejects.toEqual({
      code: 'permission-denied',
    });
    expect(store.error()).toBe('Du hast keine Berechtigung für diese Aktion.');
    expect(store.inProgress()).toBe(false);

    benutzerId.set(null);
    await expect(store.deactivateSchichtvorlage(pfad, 'frueh')).rejects.toThrow(
      'Für den Schreibvorgang fehlt die Benutzeridentität.',
    );
  });

  it('should discard all branch contexts on reset', async () => {
    const store = TestBed.inject(SchichtvorlageStore);
    await Promise.all([store.loadSchichtvorlagen(pfad), store.loadSchichtvorlagen(andererPfad)]);

    store.resetSchichtvorlagen();

    expect(store.snapshot()).toEqual({
      kontexte: {},
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
