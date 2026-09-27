// pur-system/src/app/stores/domain/mitarbeiter.store.spec.ts

import { TestBed } from '@angular/core/testing';

import {
  IMitarbeiterAktualisierung,
  IMitarbeiterAnlage,
  IMitarbeiterEintrag,
} from '../../commons/models/domain/mitarbeiter';
import { MitarbeiterService } from '../../services/domain/mitarbeiter.service';
import { MitarbeiterStore } from './mitarbeiter.store';

describe('MitarbeiterStore', () => {
  const anlage: IMitarbeiterAnlage = {
    person: {
      vorname: 'Mia',
      nachname: 'Muster',
      adresse: {
        strasse: 'Musterstraße',
        hausnummer: '1',
        postleitzahl: '12345',
        ort: 'Musterstadt',
      },
      kontakt: {},
    },
    rolle: 'service',
    filialIds: [],
  };
  const alpha: IMitarbeiterEintrag = {
    ...anlage,
    id: 'a',
    person: { ...anlage.person, vorname: 'Anton', nachname: 'Alpha' },
    aktiv: true,
  };
  const zulu: IMitarbeiterEintrag = {
    ...anlage,
    id: 'z',
    person: { ...anlage.person, vorname: 'Zoe', nachname: 'Zulu' },
    aktiv: true,
  };
  let mitarbeiterServiceMock: {
    loadMitarbeiter: ReturnType<typeof vi.fn>;
    createMitarbeiter: ReturnType<typeof vi.fn>;
    updateMitarbeiter: ReturnType<typeof vi.fn>;
    deleteMitarbeiter: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mitarbeiterServiceMock = {
      loadMitarbeiter: vi.fn().mockResolvedValue([zulu, alpha]),
      createMitarbeiter: vi.fn().mockResolvedValue({ id: 'm-neu' }),
      updateMitarbeiter: vi.fn().mockResolvedValue(undefined),
      deleteMitarbeiter: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        MitarbeiterStore,
        { provide: MitarbeiterService, useValue: mitarbeiterServiceMock },
      ],
    });
  });

  it('should provide a complete initial snapshot', () => {
    const store = TestBed.inject(MitarbeiterStore);

    expect(store.snapshot()).toEqual({
      mitarbeiter: [],
      unternehmerId: null,
      firmaId: null,
      filialId: null,
      download: false,
      isLoaded: false,
      inProgress: false,
      error: null,
    });
  });

  it('should load and sort employees for a company', async () => {
    const store = TestBed.inject(MitarbeiterStore);

    await store.loadMitarbeiter('u', 'f');

    expect(mitarbeiterServiceMock.loadMitarbeiter).toHaveBeenCalledWith('u', 'f', undefined);
    expect(store.mitarbeiter()).toEqual([alpha, zulu]);
    expect(store.unternehmerId()).toBe('u');
    expect(store.firmaId()).toBe('f');
    expect(store.isLoaded()).toBe(true);
    expect(store.download()).toBe(false);
  });

  it('should keep the branch filter as part of the loaded context', async () => {
    const store = TestBed.inject(MitarbeiterStore);

    await store.loadMitarbeiter('u', 'f', 'b-1');

    expect(mitarbeiterServiceMock.loadMitarbeiter).toHaveBeenCalledWith('u', 'f', 'b-1');
    expect(store.filialId()).toBe('b-1');
  });

  it('should ignore a pending response after reset', async () => {
    let resolveLoad!: (mitarbeiter: IMitarbeiterEintrag[]) => void;
    mitarbeiterServiceMock.loadMitarbeiter.mockReturnValue(
      new Promise<IMitarbeiterEintrag[]>((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const store = TestBed.inject(MitarbeiterStore);

    const pending = store.loadMitarbeiter('u', 'f');
    store.resetMitarbeiter();
    resolveLoad([alpha]);
    await pending;

    expect(store.snapshot()).toEqual({
      mitarbeiter: [],
      unternehmerId: null,
      firmaId: null,
      filialId: null,
      download: false,
      isLoaded: false,
      inProgress: false,
      error: null,
    });
  });

  it('should create an employee and add it to the sorted list', async () => {
    const store = TestBed.inject(MitarbeiterStore);
    await store.loadMitarbeiter('u', 'f');

    await expect(store.createMitarbeiter('u', 'f', anlage)).resolves.toEqual({ id: 'm-neu' });

    expect(mitarbeiterServiceMock.createMitarbeiter).toHaveBeenCalledWith('u', 'f', anlage);
    expect(store.mitarbeiter()).toEqual([alpha, { ...anlage, id: 'm-neu', aktiv: true }, zulu]);
    expect(store.inProgress()).toBe(false);
  });

  it('should update an employee and preserve the sorted list', async () => {
    const store = TestBed.inject(MitarbeiterStore);
    await store.loadMitarbeiter('u', 'f');
    const aktualisierung: IMitarbeiterAktualisierung = {
      ...anlage,
      person: { ...anlage.person, vorname: 'Berta', nachname: 'Beta' },
      rolle: 'admin',
      filialIds: ['filiale-1'],
      aktiv: false,
    };

    await store.updateMitarbeiter('u', 'f', 'z', aktualisierung);

    expect(mitarbeiterServiceMock.updateMitarbeiter).toHaveBeenCalledWith(
      'u',
      'f',
      'z',
      aktualisierung,
    );
    expect(store.mitarbeiter()).toEqual([alpha, { id: 'z', ...aktualisierung }]);
  });

  it('should require a matching loaded context before writing', async () => {
    const store = TestBed.inject(MitarbeiterStore);

    await expect(store.createMitarbeiter('u', 'f', anlage)).rejects.toThrow(
      'Die Mitarbeiter müssen vor dem Schreiben vollständig geladen werden.',
    );
    expect(mitarbeiterServiceMock.createMitarbeiter).not.toHaveBeenCalled();
  });

  it('should delete an employee and remove it from the loaded list', async () => {
    const store = TestBed.inject(MitarbeiterStore);
    await store.loadMitarbeiter('u', 'f');

    await store.deleteMitarbeiter('u', 'f', 'z');

    expect(mitarbeiterServiceMock.deleteMitarbeiter).toHaveBeenCalledWith('u', 'f', 'z');
    expect(store.mitarbeiter()).toEqual([alpha]);
    expect(store.inProgress()).toBe(false);
  });

  it('should expose loading and writing errors and clear them', async () => {
    const store = TestBed.inject(MitarbeiterStore);
    mitarbeiterServiceMock.loadMitarbeiter.mockRejectedValueOnce({ code: 'unavailable' });

    await expect(store.loadMitarbeiter('u', 'f')).rejects.toEqual({ code: 'unavailable' });
    expect(store.error()).toBe('Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.');
    store.clearError();
    expect(store.error()).toBeNull();

    mitarbeiterServiceMock.loadMitarbeiter.mockResolvedValueOnce([]);
    await store.loadMitarbeiter('u', 'f');
    mitarbeiterServiceMock.createMitarbeiter.mockRejectedValueOnce({ code: 'permission-denied' });
    await expect(store.createMitarbeiter('u', 'f', anlage)).rejects.toEqual({
      code: 'permission-denied',
    });
    expect(store.error()).toBe('Du hast keine Berechtigung für diese Aktion.');
    expect(store.inProgress()).toBe(false);
  });
});
