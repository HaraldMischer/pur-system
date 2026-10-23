// pur-system/src/app/stores/domain/schichtmodell.store.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ISchichtrastermodellAnlage,
  ISchichtrastermodellBestand,
} from '../../commons/models/domain/schichtmodell';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { SchichtmodellService } from '../../services/domain/schichtmodell.service';
import { BenutzerStore } from '../app/benutzer.store';
import { SchichtmodellStore } from './schichtmodell.store';

describe('SchichtmodellStore', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const andererPfad = { ...pfad, filialeId: 'b-2' };
  const benutzerId = signal<string | null>('uid-1');
  const anlage: ISchichtrastermodellAnlage = {
    bezeichnung: 'Sommer',
    modellschichten: [createModellschicht()],
  };
  const sommer = createBestand('sommer', pfad);
  const winter = createBestand('winter', andererPfad);
  const loadSchichtmodelle = vi.fn();
  const createSchichtmodell = vi.fn();
  const updateSchichtmodell = vi.fn();
  const deactivateSchichtmodell = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    benutzerId.set('uid-1');
    loadSchichtmodelle.mockImplementation((ladePfad) => {
      return Promise.resolve(ladePfad.filialeId === 'b-1' ? [sommer] : [winter]);
    });
    createSchichtmodell.mockResolvedValue(createBestand('neu', pfad));
    updateSchichtmodell.mockImplementation((_pfad, bestand, aktualisierung) => {
      return Promise.resolve({
        ...bestand,
        schichtmodell: { ...bestand.schichtmodell, ...aktualisierung },
      });
    });
    deactivateSchichtmodell.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        SchichtmodellStore,
        {
          provide: SchichtmodellService,
          useValue: {
            loadSchichtmodelle,
            createSchichtmodell,
            updateSchichtmodell,
            deactivateSchichtmodell,
          },
        },
        { provide: BenutzerStore, useValue: { benutzerId } },
        {
          provide: StoreSnapshotService,
          useValue: { registerStoreSnapshot: vi.fn().mockReturnValue(vi.fn()) },
        },
      ],
    });
  });

  it('should retain independently loaded model contexts for multiple branches', async () => {
    const store = TestBed.inject(SchichtmodellStore);

    await Promise.all([store.loadSchichtmodelle(pfad), store.loadSchichtmodelle(andererPfad)]);

    expect(store.getSchichtmodellKontext(pfad)?.schichtmodelle).toEqual([sommer]);
    expect(store.getSchichtmodellKontext(andererPfad)?.schichtmodelle).toEqual([winter]);
  });

  it('should create, update and deactivate only inside the loaded branch context', async () => {
    const store = TestBed.inject(SchichtmodellStore);
    await Promise.all([store.loadSchichtmodelle(pfad), store.loadSchichtmodelle(andererPfad)]);

    await store.createSchichtmodell(pfad, anlage);
    expect(createSchichtmodell).toHaveBeenCalledWith(pfad, anlage, 'uid-1');
    expect(store.getSchichtmodellKontext(pfad)?.schichtmodelle).toHaveLength(2);
    expect(store.getSchichtmodellKontext(andererPfad)?.schichtmodelle).toEqual([winter]);

    await store.updateSchichtmodell(pfad, 'sommer', { ...anlage, aktiv: true });
    expect(updateSchichtmodell).toHaveBeenCalledWith(
      pfad,
      sommer,
      { ...anlage, aktiv: true },
      'uid-1',
    );
    await store.deactivateSchichtmodell(pfad, 'sommer');
    expect(
      store
        .getSchichtmodellKontext(pfad)
        ?.schichtmodelle.find((bestand) => bestand.schichtmodell.id === 'sommer')?.schichtmodell
        .aktiv,
    ).toBe(false);
  });

  it('should require a loaded branch and an authenticated user for writes', async () => {
    const store = TestBed.inject(SchichtmodellStore);

    await expect(store.createSchichtmodell(pfad, anlage)).rejects.toThrow(
      'Schichtmodelle der Filiale müssen vor dem Schreiben geladen werden',
    );
    await store.loadSchichtmodelle(pfad);
    benutzerId.set(null);
    await expect(store.deactivateSchichtmodell(pfad, 'sommer')).rejects.toThrow(
      'Benutzeridentität',
    );
  });
});

function createModellschicht() {
  return {
    bezeichnung: 'Früh',
    reihenfolge: 0,
    mehrfachbelegungErlaubt: false,
  };
}

function createBestand(
  id: string,
  pfad: { unternehmerId: string; firmaId: string; filialeId: string },
): ISchichtrastermodellBestand {
  return {
    schichtmodell: {
      ...pfad,
      id,
      bezeichnung: id === 'sommer' ? 'Sommer' : 'Winter',
      aktiv: true,
      planungsart: 'schichtraster',
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    modellschichten: [
      { ...pfad, ...createModellschicht(), id: `${id}-frueh`, schichtmodellId: id },
    ],
  };
}
