// pur-system/src/app/stores/domain/dienstplan.store.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { IDienstplanBestand } from '../../commons/models/domain/dienstplan';
import { ISchichtAnlage } from '../../commons/models/domain/schicht';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { DebugLogService } from '../../services/core/debug-log.service';
import { DienstplanService } from '../../services/domain/dienstplan.service';
import { BenutzerStore } from '../app/benutzer.store';
import { StammdatenStore } from '../app/stammdaten.store';
import { DienstplanStore } from './dienstplan.store';
import { MitarbeiterStore } from './mitarbeiter.store';

describe('DienstplanStore', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const versionsPfad = { ...pfad, dienstplanId: '2026-10', versionId: 'v-1' };
  const benutzerId = signal<string | null>('uid-1');
  const loadDienstplanMonatMock = vi.fn();
  const loadDienstplanBestandMock = vi.fn();
  const createDienstplanMock = vi.fn();
  const createSchichtMock = vi.fn();
  const updateSchichtMock = vi.fn();
  const deleteSchichtMock = vi.fn();
  const loadMitarbeiterNachIdsMock = vi.fn();
  const dienstplanServiceMock = {
    loadDienstplanMonat: loadDienstplanMonatMock,
    loadDienstplanBestand: loadDienstplanBestandMock,
    createDienstplan: createDienstplanMock,
    createSchicht: createSchichtMock,
    updateSchicht: updateSchichtMock,
    deleteSchicht: deleteSchichtMock,
  };
  const debugLogServiceMock = {
    logDatenflussTitel: vi.fn(),
    logDatenGeladen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    benutzerId.set('uid-1');
    loadDienstplanMonatMock.mockResolvedValue(createBestand());
    loadDienstplanBestandMock.mockResolvedValue(createBestand());
    createDienstplanMock.mockResolvedValue({
      dienstplan: createBestand().dienstplaene[0],
      version: createBestand().versionen[0],
    });
    createSchichtMock.mockResolvedValue({
      schicht: createBestand().schichten[0],
      versionRevision: 3,
    });
    updateSchichtMock.mockImplementation(async (_pfad, schicht) => {
      return {
        schicht: { ...schicht, pauseMinuten: 45, aktualisiertVonUid: 'uid-1' },
        versionRevision: 3,
      };
    });
    deleteSchichtMock.mockResolvedValue({
      schicht: createBestand().schichten[0],
      versionRevision: 3,
    });
    loadMitarbeiterNachIdsMock.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        DienstplanStore,
        { provide: DienstplanService, useValue: dienstplanServiceMock },
        { provide: BenutzerStore, useValue: { benutzerId } },
        {
          provide: MitarbeiterStore,
          useValue: { loadMitarbeiterNachIds: loadMitarbeiterNachIdsMock },
        },
        {
          provide: StammdatenStore,
          useValue: {
            getFilialen: vi.fn().mockReturnValue([{ id: 'b-1', anzeigename: 'Halle 1' }]),
          },
        },
        { provide: DebugLogService, useValue: debugLogServiceMock },
        {
          provide: StoreSnapshotService,
          useValue: { registerStoreSnapshot: vi.fn().mockReturnValue(vi.fn()) },
        },
      ],
    });
  });

  it('should load and select a complete monthly plan', async () => {
    const store = TestBed.inject(DienstplanStore);
    store.selectDienstplan(pfad, '2026-10');

    await store.loadDienstplanMonat(pfad, '2026-10', false);

    expect(loadDienstplanMonatMock).toHaveBeenCalledWith(
      { ...pfad, dienstplanId: '2026-10' },
      false,
      'networkOnly',
    );
    expect(loadMitarbeiterNachIdsMock).toHaveBeenCalledWith('u-1', 'f-1', ['m-1']);
    expect(store.selectedDienstplan()).toEqual(expect.objectContaining({ id: '2026-10' }));
    expect(store.selectedVersionen()).toEqual([
      expect.objectContaining({ id: 'v-1', status: 'entwurf' }),
    ]);
    expect(store.selectedSchichten()).toEqual([expect.objectContaining({ id: 's-1' })]);
    expect(store.isLoaded()).toBe(true);
    expect(store.download()).toBe(false);
    expect(debugLogServiceMock.logDatenflussTitel).toHaveBeenCalledWith('3. FILIALDATEN ');
    expect(debugLogServiceMock.logDatenGeladen.mock.calls).toEqual([
      ['Dienstpläne | Halle 1', 1],
      ['Versionen | Halle 1', 1],
      ['Schichten | Halle 1', 1],
    ]);
  });

  it('should log the branch data header only once per session', async () => {
    const store = TestBed.inject(DienstplanStore);

    await store.loadDienstplanMonat(pfad, '2026-10', false);
    await store.loadDienstplanMonat(pfad, '2026-11', false);

    expect(debugLogServiceMock.logDatenflussTitel).toHaveBeenCalledOnce();

    store.resetDienstplaene();
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    expect(debugLogServiceMock.logDatenflussTitel).toHaveBeenCalledTimes(2);
  });

  it('should upgrade a published monthly load to the complete planning view', async () => {
    const store = TestBed.inject(DienstplanStore);

    await store.loadDienstplanMonat(pfad, '2026-10', true);
    await store.loadDienstplanMonat(pfad, '2026-10', false);
    await store.loadDienstplanMonat(pfad, '2026-10', true);

    expect(loadDienstplanMonatMock).toHaveBeenCalledTimes(2);
    expect(loadDienstplanMonatMock).toHaveBeenNthCalledWith(
      1,
      { ...pfad, dienstplanId: '2026-10' },
      true,
      'networkOnly',
    );
    expect(loadDienstplanMonatMock).toHaveBeenNthCalledWith(
      2,
      { ...pfad, dienstplanId: '2026-10' },
      false,
      'networkOnly',
    );
  });

  it('should load and reuse the complete branch inventory', async () => {
    const store = TestBed.inject(DienstplanStore);

    await store.loadDienstplanBestand(pfad, 'networkFirst');
    await store.loadDienstplanBestand(pfad, 'networkFirst');

    expect(loadDienstplanBestandMock).toHaveBeenCalledOnce();
    expect(loadDienstplanBestandMock).toHaveBeenCalledWith(pfad, 'networkFirst');
    expect(store.getDienstplanKontext(pfad)).toEqual(
      expect.objectContaining({ vollstaendigGeladen: true, isLoaded: true }),
    );
  });

  it('should keep the complete state and loading indicator across parallel loads', async () => {
    let resolveBestand!: (bestand: IDienstplanBestand) => void;
    let resolveMonat!: (bestand: IDienstplanBestand) => void;
    loadDienstplanBestandMock.mockReturnValueOnce(
      new Promise<IDienstplanBestand>((resolve) => {
        resolveBestand = resolve;
      }),
    );
    loadDienstplanMonatMock.mockReturnValueOnce(
      new Promise<IDienstplanBestand>((resolve) => {
        resolveMonat = resolve;
      }),
    );
    const store = TestBed.inject(DienstplanStore);

    const bestandPending = store.loadDienstplanBestand(pfad);
    const monatPending = store.loadDienstplanMonat(pfad, '2026-10', false);
    resolveBestand(createBestand());
    await bestandPending;

    expect(store.getDienstplanKontext(pfad)).toEqual(
      expect.objectContaining({ vollstaendigGeladen: true, download: true }),
    );

    resolveMonat(createBestand());
    await monatPending;
    expect(store.getDienstplanKontext(pfad)).toEqual(
      expect.objectContaining({ vollstaendigGeladen: true, download: false }),
    );
  });

  it('should ignore a pending result after a session reset', async () => {
    let resolveLoad!: (bestand: IDienstplanBestand) => void;
    loadDienstplanBestandMock.mockReturnValue(
      new Promise<IDienstplanBestand>((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const store = TestBed.inject(DienstplanStore);

    const pending = store.loadDienstplanBestand(pfad);
    store.resetDienstplaene();
    resolveLoad(createBestand());
    await pending;

    expect(store.snapshot()).toEqual({
      kontexte: {},
      selectedUnternehmerId: null,
      selectedFirmaId: null,
      selectedFilialeId: null,
      selectedMonat: null,
      inProgress: false,
      error: null,
    });
  });

  it('should add an initial plan to a loaded empty month', async () => {
    loadDienstplanMonatMock.mockResolvedValueOnce({
      dienstplaene: [],
      versionen: [],
      schichten: [],
    });
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    await store.createDienstplan(pfad, '2026-10');

    expect(createDienstplanMock).toHaveBeenCalledWith(pfad, '2026-10', 'uid-1');
    expect(store.getDienstplanKontext(pfad)?.dienstplaene).toEqual([
      expect.objectContaining({ id: '2026-10' }),
    ]);
    expect(store.inProgress()).toBe(false);
  });

  it('should create, update and delete shifts while advancing the local revision', async () => {
    const store = TestBed.inject(DienstplanStore);
    const anlage = createSchichtAnlage();
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    await store.createSchicht(versionsPfad, anlage);
    expect(createSchichtMock).toHaveBeenCalledWith(versionsPfad, 2, anlage, 'uid-1');
    expect(store.getDienstplanKontext(pfad)?.versionen[0].revision).toBe(3);

    const aktualisierung = { ...anlage, pauseMinuten: 45 };
    await store.updateSchicht(versionsPfad, 's-1', aktualisierung);
    expect(updateSchichtMock).toHaveBeenCalledWith(
      versionsPfad,
      expect.objectContaining({ id: 's-1' }),
      3,
      aktualisierung,
      'uid-1',
    );

    deleteSchichtMock.mockResolvedValueOnce({
      schicht: createBestand().schichten[0],
      versionRevision: 4,
    });
    await store.deleteSchicht(versionsPfad, 's-1');
    expect(store.getDienstplanKontext(pfad)?.schichten).toEqual([]);
    expect(store.getDienstplanKontext(pfad)?.versionen[0].revision).toBe(4);
  });

  it('should require a fully loaded planning month and an authenticated user for writes', async () => {
    const store = TestBed.inject(DienstplanStore);

    await expect(store.createDienstplan(pfad, '2026-10')).rejects.toThrow(
      'Der vollständige Dienstplanmonat muss vor dem Schreiben geladen werden.',
    );
    await store.loadDienstplanMonat(pfad, '2026-10', false);
    benutzerId.set(null);
    await expect(store.createSchicht(versionsPfad, createSchichtAnlage())).rejects.toThrow(
      'Für den Schreibvorgang fehlt die Benutzeridentität.',
    );
  });

  it('should expose loading and writing errors', async () => {
    const store = TestBed.inject(DienstplanStore);
    loadDienstplanBestandMock.mockRejectedValueOnce({ code: 'unavailable' });

    await expect(store.loadDienstplanBestand(pfad)).rejects.toEqual({ code: 'unavailable' });
    expect(store.getDienstplanKontext(pfad)?.error).toBe(
      'Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.',
    );

    loadDienstplanMonatMock.mockResolvedValueOnce(createBestand());
    await store.loadDienstplanMonat(pfad, '2026-10', false);
    createSchichtMock.mockRejectedValueOnce({ code: 'permission-denied' });
    await expect(store.createSchicht(versionsPfad, createSchichtAnlage())).rejects.toEqual({
      code: 'permission-denied',
    });
    expect(store.error()).toBe('Du hast keine Berechtigung für diese Aktion.');
    store.clearError();
    expect(store.error()).toBeNull();
  });

  function createBestand(): IDienstplanBestand {
    return {
      dienstplaene: [
        {
          ...pfad,
          id: '2026-10',
          zeitraumStart: '2026-10-01',
          zeitraumEnde: '2026-10-31',
          zeitzone: 'Europe/Berlin',
          entwurfVersionId: 'v-1',
          naechsteVersionsnummer: 2,
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      ],
      versionen: [
        {
          ...versionsPfad,
          id: 'v-1',
          nummer: 1,
          revision: 2,
          status: 'entwurf',
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      ],
      schichten: [
        {
          ...versionsPfad,
          ...createSchichtAnlage(),
          id: 's-1',
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      ],
    };
  }

  function createSchichtAnlage(): ISchichtAnlage {
    return {
      mitarbeiterId: 'm-1',
      schichtvorlageId: 'sv-1',
      schichtvorlageBezeichnung: 'Frühschicht',
      beginn: Timestamp.fromDate(new Date('2026-10-05T08:00:00+02:00')),
      ende: Timestamp.fromDate(new Date('2026-10-05T16:00:00+02:00')),
      pauseMinuten: 30,
    };
  }
});
