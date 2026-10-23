// pur-system/src/app/stores/domain/dienstplan.store.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { IDienstplanBestand } from '../../commons/models/domain/dienstplan';
import { ISchichtAnlage } from '../../commons/models/domain/schicht';
import { ISchichtrastermodellBestand } from '../../commons/models/domain/schichtmodell';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { DebugLogService } from '../../services/core/debug-log.service';
import { DienstplanFachfehler, DienstplanService } from '../../services/domain/dienstplan.service';
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
  const deleteDienstplanMock = vi.fn();
  const publishDienstplanMock = vi.fn();
  const createEntwurfAusVeroeffentlichungMock = vi.fn();
  const createSchichtMock = vi.fn();
  const updateSchichtMock = vi.fn();
  const deleteSchichtMock = vi.fn();
  const loadMitarbeiterNachIdsMock = vi.fn();
  const dienstplanServiceMock = {
    loadDienstplanMonat: loadDienstplanMonatMock,
    loadDienstplanBestand: loadDienstplanBestandMock,
    createDienstplan: createDienstplanMock,
    deleteDienstplan: deleteDienstplanMock,
    publishDienstplan: publishDienstplanMock,
    createEntwurfAusVeroeffentlichung: createEntwurfAusVeroeffentlichungMock,
    createSchicht: createSchichtMock,
    updateSchicht: updateSchichtMock,
    deleteSchicht: deleteSchichtMock,
  };
  const debugLogServiceMock = {
    log: vi.fn(),
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
      modellschichten: createBestand().modellschichten,
    });
    deleteDienstplanMock.mockResolvedValue(undefined);
    publishDienstplanMock.mockImplementation(async () => {
      const bestand = createBestand();
      const entwurf = bestand.versionen[0];
      return {
        dienstplan: {
          ...bestand.dienstplaene[0],
          entwurfVersionId: undefined,
          veroeffentlichteVersionId: entwurf.id,
        },
        veroeffentlichteVersion: {
          ...entwurf,
          status: 'veroeffentlicht',
          revision: entwurf.revision + 1,
        },
      };
    });
    createEntwurfAusVeroeffentlichungMock.mockResolvedValue(undefined);
    createSchichtMock.mockResolvedValue({
      schicht: createBestand().schichten[0],
      versionRevision: 3,
    });
    updateSchichtMock.mockImplementation(async (_pfad, schicht) => {
      return {
        schicht: { ...schicht, aktualisiertVonUid: 'uid-1' },
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
    expect(store.selectedKalendertage()).toEqual([
      expect.objectContaining({ datum: '2026-10-05', wochentag: 'montag' }),
    ]);
    expect(store.getDienstplanKalendertag(pfad, '2026-10', '2026-10-05')).toEqual(
      expect.objectContaining({
        oeffnungsregelQuelle: 'wochentag',
        rasterzeiten: [expect.objectContaining({ modellschichtId: 'frueh' })],
      }),
    );
    expect(store.isLoaded()).toBe(true);
    expect(store.download()).toBe(false);
    expect(debugLogServiceMock.logDatenflussTitel).toHaveBeenCalledWith('3. FILIALDATEN ');
    expect(debugLogServiceMock.logDatenGeladen.mock.calls).toEqual([['Dienstpläne | Halle 1', 1]]);
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
      modellschichten: [],
    });
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    const schichtmodell = createSchichtmodell();
    await store.createDienstplan(pfad, '2026-10', schichtmodell);

    expect(createDienstplanMock).toHaveBeenCalledWith(pfad, '2026-10', schichtmodell, 'uid-1');
    expect(store.getDienstplanKontext(pfad)?.dienstplaene).toEqual([
      expect.objectContaining({ id: '2026-10' }),
    ]);
    expect(store.inProgress()).toBe(false);
    expect(store.getDienstplanKontext(pfad)?.modellschichten).toEqual(
      createBestand().modellschichten,
    );
  });

  it('should expose a known plan creation error unchanged', async () => {
    const fehlermeldung =
      'Der Dienstplan konnte nicht angelegt werden. Die Öffnungszeiten der Filiale müssen zuerst initialisiert werden.';
    loadDienstplanMonatMock.mockResolvedValueOnce({
      dienstplaene: [],
      versionen: [],
      schichten: [],
      modellschichten: [],
    });
    createDienstplanMock.mockRejectedValueOnce(new DienstplanFachfehler(fehlermeldung));
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    await expect(store.createDienstplan(pfad, '2026-10', createSchichtmodell())).rejects.toThrow(
      fehlermeldung,
    );

    expect(store.error()).toBe(fehlermeldung);
    expect(debugLogServiceMock.log).not.toHaveBeenCalled();
  });

  it('should expose a stale inactive model as a known plan creation error', async () => {
    const fehlermeldung =
      'Der Dienstplan konnte nicht angelegt werden. Das gewählte Schichtmodell ist nicht mehr aktiv.';
    loadDienstplanMonatMock.mockResolvedValueOnce({
      dienstplaene: [],
      versionen: [],
      schichten: [],
      modellschichten: [],
    });
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);
    const schichtmodell = createSchichtmodell();

    await expect(
      store.createDienstplan(pfad, '2026-10', {
        ...schichtmodell,
        schichtmodell: { ...schichtmodell.schichtmodell, aktiv: false },
      }),
    ).rejects.toThrow(fehlermeldung);

    expect(store.error()).toBe(fehlermeldung);
    expect(store.inProgress()).toBe(false);
    expect(createDienstplanMock).not.toHaveBeenCalled();
  });

  it('should create, update and delete shifts while advancing the local revision', async () => {
    const store = TestBed.inject(DienstplanStore);
    const anlage = createSchichtAnlage();
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    await store.createSchicht(versionsPfad, anlage);
    expect(createSchichtMock).toHaveBeenCalledWith(versionsPfad, 2, anlage, 'uid-1');
    expect(store.getDienstplanKontext(pfad)?.versionen[0].revision).toBe(3);

    const aktualisierung = { ...anlage, mitarbeiterId: 'm-2' };
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

  it('should apply returned paid-break updates to already loaded shifts', async () => {
    createSchichtMock.mockResolvedValueOnce({
      schicht: {
        ...createBestand().schichten[0],
        id: 's-2',
        mitarbeiterId: 'm-2',
        pauseMinuten: 0,
      },
      versionRevision: 3,
      pauseAktualisierungen: [
        { ...versionsPfad, schichtId: 's-1', pauseMinuten: 30 },
        { ...versionsPfad, schichtId: 's-2', pauseMinuten: 0 },
      ],
    });
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    await store.createSchicht(versionsPfad, createSchichtAnlage());

    expect(
      store
        .getDienstplanKontext(pfad)
        ?.schichten.map((schicht) => ({ id: schicht.id, pauseMinuten: schicht.pauseMinuten })),
    ).toEqual([
      { id: 's-1', pauseMinuten: 30 },
      { id: 's-2', pauseMinuten: 0 },
    ]);
  });

  it('should delete an empty never-published plan from the loaded month', async () => {
    loadDienstplanMonatMock.mockResolvedValueOnce({ ...createBestand(), schichten: [] });
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    await store.deleteDienstplan(versionsPfad);

    expect(deleteDienstplanMock).toHaveBeenCalledWith(versionsPfad, 2);
    expect(store.getDienstplanKontext(pfad)).toEqual(
      expect.objectContaining({
        dienstplaene: [],
        versionen: [],
        schichten: [],
        modellschichten: [],
        monatsmodi: { '2026-10': 'vollstaendig' },
      }),
    );
  });

  it('should reject deleting a plan while its draft contains a shift', async () => {
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    await expect(store.deleteDienstplan(versionsPfad)).rejects.toThrow(
      'Lösche zuerst alle Schichten des Entwurfs.',
    );
    expect(deleteDienstplanMock).not.toHaveBeenCalled();
  });

  it('should replace the local draft with the published service result', async () => {
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    await store.publishDienstplan(versionsPfad);

    expect(publishDienstplanMock).toHaveBeenCalledWith(versionsPfad, 2, 'uid-1');
    expect(store.selectedDienstplan()).toBeNull();
    expect(store.getDienstplanKontext(pfad)?.dienstplaene[0]).toEqual(
      expect.objectContaining({ veroeffentlichteVersionId: 'v-1' }),
    );
    expect(store.getDienstplanKontext(pfad)?.versionen[0]).toEqual(
      expect.objectContaining({ status: 'veroeffentlicht', revision: 3 }),
    );
  });

  it('should add a copied draft returned by the service', async () => {
    const bestand = createBestand();
    const veroeffentlichteVersion = {
      ...bestand.versionen[0],
      status: 'veroeffentlicht' as const,
      revision: 3,
    };
    const veroeffentlichterBestand: IDienstplanBestand = {
      ...bestand,
      dienstplaene: [
        {
          ...bestand.dienstplaene[0],
          entwurfVersionId: undefined,
          veroeffentlichteVersionId: 'v-1',
          naechsteVersionsnummer: 2,
        },
      ],
      versionen: [veroeffentlichteVersion],
      schichten: bestand.schichten.map((schicht) => {
        return { ...schicht, versionId: 'v-1' };
      }),
    };
    loadDienstplanMonatMock.mockResolvedValueOnce(veroeffentlichterBestand);
    createEntwurfAusVeroeffentlichungMock.mockResolvedValueOnce({
      dienstplan: {
        ...veroeffentlichterBestand.dienstplaene[0],
        entwurfVersionId: 'v-2',
        naechsteVersionsnummer: 3,
      },
      version: { ...veroeffentlichteVersion, id: 'v-2', nummer: 2, revision: 0, status: 'entwurf' },
      schichten: veroeffentlichterBestand.schichten.map((schicht) => {
        return { ...schicht, versionId: 'v-2' };
      }),
    });
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);

    await store.createEntwurfAusVeroeffentlichung({ ...pfad, dienstplanId: '2026-10' });

    expect(createEntwurfAusVeroeffentlichungMock).toHaveBeenCalledWith(
      { ...pfad, dienstplanId: '2026-10' },
      3,
      'uid-1',
    );
    expect(store.getDienstplanKontext(pfad)?.versionen).toEqual([
      expect.objectContaining({ id: 'v-1', status: 'veroeffentlicht' }),
      expect.objectContaining({ id: 'v-2', status: 'entwurf' }),
    ]);
    expect(store.getDienstplanKontext(pfad)?.schichten).toHaveLength(2);
  });

  it('should preserve the loaded plan after a failed shift move', async () => {
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);
    const vorher = store.getDienstplanKontext(pfad);
    updateSchichtMock.mockRejectedValueOnce(
      new DienstplanFachfehler('Der Mitarbeiter ist in diesem Zeitraum bereits eingeplant.'),
    );

    await expect(
      store.updateSchicht(versionsPfad, 's-1', {
        ...createSchichtAnlage(),
        datum: '2026-10-06',
      }),
    ).rejects.toThrow('bereits eingeplant');

    expect(store.getDienstplanKontext(pfad)).toEqual(vorher);
    expect(store.getDienstplanKontext(pfad)?.versionen[0].revision).toBe(2);
    expect(store.getDienstplanKontext(pfad)?.schichten[0]).toEqual(
      expect.objectContaining({ id: 's-1', datum: '2026-10-05', mitarbeiterId: 'm-1' }),
    );
  });

  it('should preserve the draft after a failed publication', async () => {
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);
    const vorher = store.getDienstplanKontext(pfad);
    publishDienstplanMock.mockRejectedValueOnce(
      new DienstplanFachfehler(
        'Der Dienstplan konnte nicht veröffentlicht werden. Der Dienstplan wurde zwischenzeitlich geändert.',
      ),
    );

    await expect(store.publishDienstplan(versionsPfad)).rejects.toThrow(
      'zwischenzeitlich geändert',
    );

    expect(store.getDienstplanKontext(pfad)).toEqual(vorher);
    expect(store.getDienstplanKontext(pfad)?.dienstplaene[0].entwurfVersionId).toBe('v-1');
    expect(store.getDienstplanKontext(pfad)?.versionen[0]).toEqual(
      expect.objectContaining({ status: 'entwurf', revision: 2 }),
    );
  });

  it('should require a fully loaded planning month and an authenticated user for writes', async () => {
    const store = TestBed.inject(DienstplanStore);

    await expect(store.createDienstplan(pfad, '2026-10', createSchichtmodell())).rejects.toThrow(
      'Der Dienstplan konnte nicht angelegt werden. Der vollständige Dienstplanmonat muss vor dem Schreiben geladen werden.',
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

  it('should expose a general message and log an unknown writing error', async () => {
    const technischerFehler = new Error('Interne Ursache');
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);
    createSchichtMock.mockRejectedValueOnce(technischerFehler);

    await expect(store.createSchicht(versionsPfad, createSchichtAnlage())).rejects.toBe(
      technischerFehler,
    );

    expect(store.error()).toBe('Die Aktion konnte nicht ausgeführt werden.');
    expect(debugLogServiceMock.log).toHaveBeenCalledWith(
      'Store',
      'Dienstplan-Schreibvorgang fehlgeschlagen.',
      technischerFehler,
    );
  });

  function createBestand(): IDienstplanBestand {
    return {
      dienstplaene: [
        {
          ...pfad,
          kalendertage: [
            {
              datum: '2026-10-05',
              wochentag: 'montag',
              istSonntag: false,
              aktiveSondertage: [],
              oeffnungsregelQuelle: 'wochentag',
              oeffnungsregel: {
                geoeffnet: true,
                beginnLokalzeit: '07:00',
                endeLokalzeit: '18:00',
                endetAmFolgetag: false,
              },
              rasterzeiten: [
                {
                  modellschichtId: 'frueh',
                  beginnLokalzeit: '07:00',
                  endeLokalzeit: '12:00',
                  beginntAmFolgetag: false,
                  endetAmFolgetag: false,
                },
              ],
            },
          ],
          id: '2026-10',
          zeitraumStart: '2026-10-01',
          zeitraumEnde: '2026-10-31',
          zeitzone: 'Europe/Berlin',
          schichtmodellId: 'modell-1',
          schichtmodellBezeichnung: 'Sommer',
          planungsart: 'schichtraster',
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
          beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
          ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
          id: 's-1',
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      ],
      modellschichten: [
        {
          ...pfad,
          dienstplanId: '2026-10',
          id: 'frueh',
          bezeichnung: 'Früh',
          reihenfolge: 0,
          mehrfachbelegungErlaubt: false,
        },
      ],
    };
  }

  function createSchichtmodell(
    id = 'modell-1',
    bezeichnung = 'Sommer',
  ): ISchichtrastermodellBestand {
    return {
      schichtmodell: {
        ...pfad,
        id,
        bezeichnung,
        aktiv: true,
        planungsart: 'schichtraster',
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      modellschichten: [
        {
          ...pfad,
          id: 'frueh',
          schichtmodellId: id,
          bezeichnung: 'Früh',
          reihenfolge: 0,
          mehrfachbelegungErlaubt: false,
        },
      ],
    };
  }

  function createSchichtAnlage(): ISchichtAnlage {
    return {
      datum: '2026-10-05',
      mitarbeiterId: 'm-1',
      modellschichtId: 'frueh',
    };
  }
});
