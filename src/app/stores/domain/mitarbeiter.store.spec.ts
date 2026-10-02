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
    unternehmerId: 'u',
    firmaId: 'f',
    person: { ...anlage.person, vorname: 'Anton', nachname: 'Alpha' },
    aktiv: true,
  };
  const zulu: IMitarbeiterEintrag = {
    ...anlage,
    id: 'z',
    unternehmerId: 'u',
    firmaId: 'f',
    person: { ...anlage.person, vorname: 'Zoe', nachname: 'Zulu' },
    aktiv: true,
  };
  let mitarbeiterServiceMock: {
    loadMitarbeiter: ReturnType<typeof vi.fn>;
    loadMitarbeiterNachFilialen: ReturnType<typeof vi.fn>;
    createMitarbeiter: ReturnType<typeof vi.fn>;
    updateMitarbeiter: ReturnType<typeof vi.fn>;
    deleteMitarbeiter: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    mitarbeiterServiceMock = {
      loadMitarbeiter: vi.fn().mockResolvedValue([zulu, alpha]),
      loadMitarbeiterNachFilialen: vi.fn().mockResolvedValue([zulu, alpha]),
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
      kontexte: {},
      inProgress: false,
      error: null,
    });
  });

  it('should load and sort employees with their company context', async () => {
    const store = TestBed.inject(MitarbeiterStore);

    await store.loadMitarbeiter('u', 'f');

    expect(mitarbeiterServiceMock.loadMitarbeiter).toHaveBeenCalledWith(
      'u',
      'f',
      undefined,
      'networkOnly',
    );
    expect(store.getMitarbeiter('u', 'f')).toEqual([alpha, zulu]);
    expect(store.isMitarbeiterKontextLoaded('u', 'f')).toBe(true);
    expect(store.isMitarbeiterKontextLoading('u', 'f')).toBe(false);
  });

  it('should retain employees from multiple company contexts', async () => {
    mitarbeiterServiceMock.loadMitarbeiter.mockImplementation(
      async (unternehmerId: string, firmaId: string) => {
        return [{ ...alpha, unternehmerId, firmaId, id: `${unternehmerId}-${firmaId}` }];
      },
    );
    const store = TestBed.inject(MitarbeiterStore);

    await store.loadMitarbeiter('u-1', 'f-1');
    await store.loadMitarbeiter('u-2', 'f-2');

    expect(store.getMitarbeiter('u-1', 'f-1')).toEqual([
      expect.objectContaining({ id: 'u-1-f-1', unternehmerId: 'u-1', firmaId: 'f-1' }),
    ]);
    expect(store.getMitarbeiter('u-2', 'f-2')).toEqual([
      expect.objectContaining({ id: 'u-2-f-2', unternehmerId: 'u-2', firmaId: 'f-2' }),
    ]);
  });

  it('should keep a branch filter as an independent loaded context', async () => {
    const store = TestBed.inject(MitarbeiterStore);

    await store.loadMitarbeiter('u', 'f', 'b-1');

    expect(mitarbeiterServiceMock.loadMitarbeiter).toHaveBeenCalledWith(
      'u',
      'f',
      'b-1',
      'networkOnly',
    );
    expect(store.getMitarbeiter('u', 'f', 'b-1')).toEqual([alpha, zulu]);
    expect(store.isMitarbeiterKontextLoaded('u', 'f', 'b-1')).toBe(true);
    expect(store.isMitarbeiterKontextLoaded('u', 'f')).toBe(false);
  });

  it('should load multiple branches into one shared employee context', async () => {
    const store = TestBed.inject(MitarbeiterStore);

    await store.loadMitarbeiterNachFilialen('u', 'f', ['b-2', 'b-1', 'b-2']);

    expect(mitarbeiterServiceMock.loadMitarbeiterNachFilialen).toHaveBeenCalledOnce();
    expect(mitarbeiterServiceMock.loadMitarbeiterNachFilialen).toHaveBeenCalledWith(
      'u',
      'f',
      ['b-1', 'b-2'],
      'networkOnly',
    );
    expect(store.getMitarbeiterNachFilialen('u', 'f', ['b-2', 'b-1'])).toEqual([alpha, zulu]);
    expect(store.getMitarbeiter('u', 'f')).toEqual([]);
  });

  it('should share a pending load and reuse a fully loaded context', async () => {
    let resolveLoad!: (mitarbeiter: IMitarbeiterEintrag[]) => void;
    mitarbeiterServiceMock.loadMitarbeiter.mockReturnValue(
      new Promise<IMitarbeiterEintrag[]>((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const store = TestBed.inject(MitarbeiterStore);

    const ersterAuftrag = store.loadMitarbeiter('u', 'f');
    const zweiterAuftrag = store.loadMitarbeiter('u', 'f');
    expect(ersterAuftrag).toBe(zweiterAuftrag);
    expect(mitarbeiterServiceMock.loadMitarbeiter).toHaveBeenCalledOnce();

    resolveLoad([]);
    await Promise.all([ersterAuftrag, zweiterAuftrag]);
    await store.loadMitarbeiter('u', 'f');

    expect(mitarbeiterServiceMock.loadMitarbeiter).toHaveBeenCalledOnce();
    expect(store.getMitarbeiter('u', 'f')).toEqual([]);
    expect(store.isMitarbeiterKontextLoaded('u', 'f')).toBe(true);
  });

  it('should ignore all pending responses after a session reset', async () => {
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
      kontexte: {},
      inProgress: false,
      error: null,
    });
  });

  it('should create an employee in the uniquely loaded company context', async () => {
    const store = TestBed.inject(MitarbeiterStore);
    await store.loadMitarbeiter('u', 'f');

    await expect(store.createMitarbeiter('u', 'f', anlage)).resolves.toEqual({ id: 'm-neu' });

    expect(mitarbeiterServiceMock.createMitarbeiter).toHaveBeenCalledWith('u', 'f', anlage);
    expect(store.getMitarbeiter('u', 'f')).toEqual([
      alpha,
      {
        ...anlage,
        id: 'm-neu',
        unternehmerId: 'u',
        firmaId: 'f',
        aktiv: true,
      },
      zulu,
    ]);
    expect(store.inProgress()).toBe(false);
  });

  it('should ignore a pending write result after a session reset', async () => {
    let resolveCreate!: (ergebnis: { id: string }) => void;
    const store = TestBed.inject(MitarbeiterStore);
    await store.loadMitarbeiter('u', 'f');
    mitarbeiterServiceMock.createMitarbeiter.mockReturnValue(
      new Promise<{ id: string }>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const pending = store.createMitarbeiter('u', 'f', anlage);
    store.resetMitarbeiter();
    resolveCreate({ id: 'm-alt' });
    await pending;

    expect(store.snapshot()).toEqual({
      kontexte: {},
      inProgress: false,
      error: null,
    });
  });

  it('should update an employee and preserve its company context', async () => {
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
    expect(store.getMitarbeiter('u', 'f')).toEqual([
      alpha,
      { id: 'z', unternehmerId: 'u', firmaId: 'f', ...aktualisierung },
    ]);
  });

  it('should require one uniquely loaded company context before writing', async () => {
    const store = TestBed.inject(MitarbeiterStore);

    await expect(store.createMitarbeiter('u', 'f', anlage)).rejects.toThrow(
      'Die Mitarbeiter müssen vor dem Schreiben in einem eindeutigen Firmenkontext vollständig geladen werden.',
    );
    await store.loadMitarbeiter('u', 'f');
    await store.loadMitarbeiter('u', 'f', 'b-1');
    await expect(store.createMitarbeiter('u', 'f', anlage)).rejects.toThrow(
      'Die Mitarbeiter müssen vor dem Schreiben in einem eindeutigen Firmenkontext vollständig geladen werden.',
    );
    expect(mitarbeiterServiceMock.createMitarbeiter).not.toHaveBeenCalled();
  });

  it('should delete an employee only from its loaded context', async () => {
    const store = TestBed.inject(MitarbeiterStore);
    await store.loadMitarbeiter('u', 'f');

    await store.deleteMitarbeiter('u', 'f', 'z');

    expect(mitarbeiterServiceMock.deleteMitarbeiter).toHaveBeenCalledWith('u', 'f', 'z');
    expect(store.getMitarbeiter('u', 'f')).toEqual([alpha]);
    expect(store.inProgress()).toBe(false);
  });

  it('should expose a loading error only in its affected context', async () => {
    const store = TestBed.inject(MitarbeiterStore);
    mitarbeiterServiceMock.loadMitarbeiter
      .mockRejectedValueOnce({ code: 'unavailable' })
      .mockResolvedValueOnce([]);

    await expect(store.loadMitarbeiter('u-1', 'f-1')).rejects.toEqual({
      code: 'unavailable',
    });
    await store.loadMitarbeiter('u-2', 'f-2');

    expect(store.getMitarbeiterKontextError('u-1', 'f-1')).toBe(
      'Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.',
    );
    expect(store.getMitarbeiterKontextError('u-2', 'f-2')).toBeNull();
    expect(store.isMitarbeiterKontextLoaded('u-2', 'f-2')).toBe(true);
  });

  it('should expose and clear writing errors', async () => {
    const store = TestBed.inject(MitarbeiterStore);
    mitarbeiterServiceMock.loadMitarbeiter.mockResolvedValueOnce([]);
    await store.loadMitarbeiter('u', 'f');
    mitarbeiterServiceMock.createMitarbeiter.mockRejectedValueOnce({
      code: 'permission-denied',
    });

    await expect(store.createMitarbeiter('u', 'f', anlage)).rejects.toEqual({
      code: 'permission-denied',
    });
    expect(store.error()).toBe('Du hast keine Berechtigung für diese Aktion.');
    store.clearError();
    expect(store.error()).toBeNull();
    expect(store.inProgress()).toBe(false);
  });
});
