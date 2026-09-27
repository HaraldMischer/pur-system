// pur-system/src/app/stores/domain/unternehmer.store.spec.ts

import { TestBed } from '@angular/core/testing';

import { IUnternehmerAnlage } from '../../commons/models/domain/unternehmer';
import { UnternehmerService } from '../../services/domain/unternehmer.service';
import { UnternehmerStore } from './unternehmer.store';

describe('UnternehmerStore', () => {
  const anlage: IUnternehmerAnlage = {
    anzeigename: 'Unternehmer Nord',
    person: {
      vorname: 'Max',
      nachname: 'Mustermann',
      adresse: {
        strasse: 'Hauptstraße',
        hausnummer: '1',
        postleitzahl: '20095',
        ort: 'Hamburg',
      },
      kontakt: {
        email: 'info@example.com',
        telefon: '040 123456',
      },
    },
  };
  let unternehmerServiceMock: {
    loadUnternehmer: ReturnType<typeof vi.fn>;
    createUnternehmer: ReturnType<typeof vi.fn>;
    deleteUnternehmer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    unternehmerServiceMock = {
      loadUnternehmer: vi.fn().mockResolvedValue([
        { id: 'z', anzeigename: 'Zulu', nummer: 4 },
        { id: 'a', anzeigename: 'Alpha', nummer: 2 },
      ]),
      createUnternehmer: vi.fn().mockResolvedValue({
        id: 'n',
        nummer: 5,
        anzeigename: anlage.anzeigename,
      }),
      deleteUnternehmer: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        UnternehmerStore,
        { provide: UnternehmerService, useValue: unternehmerServiceMock },
      ],
    });
  });

  it('should load and sort entrepreneurs', async () => {
    const store = TestBed.inject(UnternehmerStore);

    await store.loadUnternehmer();

    expect(store.unternehmer()).toEqual([
      { id: 'a', anzeigename: 'Alpha', nummer: 2 },
      { id: 'z', anzeigename: 'Zulu', nummer: 4 },
    ]);
    expect(store.download()).toBe(false);
    expect(store.isLoaded()).toBe(true);
    expect(store.error()).toBeNull();
  });

  it('should provide complete snapshots before and after loading', async () => {
    const store = TestBed.inject(UnternehmerStore);

    expect(store.snapshot()).toEqual({
      unternehmer: [],
      download: false,
      isLoaded: false,
      inProgress: false,
      error: null,
    });

    await store.loadUnternehmer();

    expect(store.snapshot()).toEqual({
      unternehmer: [
        { id: 'a', anzeigename: 'Alpha', nummer: 2 },
        { id: 'z', anzeigename: 'Zulu', nummer: 4 },
      ],
      download: false,
      isLoaded: true,
      inProgress: false,
      error: null,
    });
  });

  it('should create an entrepreneur and add it to the sorted list', async () => {
    const store = TestBed.inject(UnternehmerStore);
    await store.loadUnternehmer();

    await expect(store.createUnternehmer(anlage)).resolves.toEqual({
      id: 'n',
      nummer: 5,
      anzeigename: 'Unternehmer Nord',
    });
    expect(unternehmerServiceMock.createUnternehmer).toHaveBeenCalledWith(anlage, 5);
    expect(store.unternehmer()).toEqual([
      { id: 'a', anzeigename: 'Alpha', nummer: 2 },
      { id: 'n', anzeigename: 'Unternehmer Nord', nummer: 5 },
      { id: 'z', anzeigename: 'Zulu', nummer: 4 },
    ]);
    expect(store.inProgress()).toBe(false);
  });

  it('should delete an entrepreneur from the loaded list', async () => {
    const store = TestBed.inject(UnternehmerStore);
    await store.loadUnternehmer();

    await store.deleteUnternehmer('a');

    expect(unternehmerServiceMock.deleteUnternehmer).toHaveBeenCalledWith('a');
    expect(store.unternehmer()).toEqual([{ id: 'z', anzeigename: 'Zulu', nummer: 4 }]);
  });

  it('should expose friendly load and creation errors', async () => {
    const store = TestBed.inject(UnternehmerStore);
    unternehmerServiceMock.loadUnternehmer.mockRejectedValue({ code: 'unavailable' });

    await expect(store.loadUnternehmer()).rejects.toEqual({ code: 'unavailable' });
    expect(store.error()).toBe('Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.');
    expect(store.download()).toBe(false);
    expect(store.isLoaded()).toBe(false);

    unternehmerServiceMock.loadUnternehmer.mockResolvedValue([]);
    await store.loadUnternehmer();
    unternehmerServiceMock.createUnternehmer.mockRejectedValue({ code: 'permission-denied' });
    await expect(store.createUnternehmer(anlage)).rejects.toEqual({
      code: 'permission-denied',
    });
    expect(store.error()).toBe('Du hast keine Berechtigung für diese Aktion.');
    expect(store.inProgress()).toBe(false);

    store.clearError();
    expect(store.error()).toBeNull();
  });

  it('should require a completely loaded entrepreneur list before creation', async () => {
    const store = TestBed.inject(UnternehmerStore);

    await expect(store.createUnternehmer(anlage)).rejects.toThrow(
      'Die Unternehmer müssen vor der Anlage vollständig geladen werden.',
    );
    expect(unternehmerServiceMock.createUnternehmer).not.toHaveBeenCalled();
  });
});
