// pur-system/src/app/stores/domain/filialeinstellung.store.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import {
  STANDARD_SCHLIESSZEITRAUM,
  TWochenoeffnungszeiten,
} from '../../commons/models/domain/filialeinstellung';
import { SondertagDatumskollisionFehler } from '../../commons/utils/filialeinstellung/sondertag-kollision';
import { DebugLogService } from '../../services/core/debug-log.service';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import {
  FilialeinstellungFachfehler,
  FilialeinstellungService,
  IFilialeinstellungBestand,
  IFilialeinstellungGrundlagen,
  IFilialeinstellungRohdaten,
} from '../../services/domain/filialeinstellung.service';
import { BenutzerStore } from '../app/benutzer.store';
import { StammdatenStore } from '../app/stammdaten.store';
import { FilialeinstellungStore } from './filialeinstellung.store';

describe('FilialeinstellungStore', () => {
  const pfad: IFilialPfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const andererPfad: IFilialPfad = { ...pfad, filialeId: 'b-2' };
  const benutzerId = signal<string | null>('uid-1');
  const grundlagen = createGrundlagen();
  const bestand = createBestand(pfad);
  const andererBestand = createBestand(andererPfad);
  const rohdaten = createRohdaten(bestand);
  const andereRohdaten = createRohdaten(andererBestand);
  const loadFilialeinstellungRohdaten = vi.fn();
  const validateFilialeinstellungRohdaten = vi.fn();
  const initializeFilialeinstellung = vi.fn();
  const saveGrundlagen = vi.fn();
  const createSondertag = vi.fn();
  const updateSondertag = vi.fn();
  const updateSystemSondertag = vi.fn();
  const deleteSondertag = vi.fn();
  const createAusnahme = vi.fn();
  const updateAusnahme = vi.fn();
  const deleteAusnahme = vi.fn();
  const debugLogServiceMock = {
    log: vi.fn(),
    logDatenflussTitel: vi.fn(),
    logDatenGeladen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    benutzerId.set('uid-1');
    loadFilialeinstellungRohdaten.mockImplementation((ladePfad) => {
      return Promise.resolve(ladePfad.filialeId === 'b-1' ? rohdaten : andereRohdaten);
    });
    validateFilialeinstellungRohdaten.mockImplementation((_ladePfad, geladeneRohdaten) => {
      return geladeneRohdaten === rohdaten ? bestand : andererBestand;
    });
    initializeFilialeinstellung.mockResolvedValue(bestand);
    saveGrundlagen.mockResolvedValue(bestand);
    createSondertag.mockResolvedValue({
      ...pfad,
      id: 'inventur',
      bezeichnung: 'Inventur',
      aktiv: true,
      herkunft: 'benutzer',
      datumsregel: { typ: 'jaehrlichFestesDatum', monat: 2, tag: 15 },
      oeffnungsregel: { geoeffnet: false },
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    });
    updateSondertag.mockImplementation((_pfad, sondertag, aktualisierung) => {
      return Promise.resolve({ ...sondertag, ...aktualisierung });
    });
    updateSystemSondertag.mockImplementation((_pfad, sondertag, aktualisierung) => {
      return Promise.resolve({ ...sondertag, ...aktualisierung });
    });
    deleteSondertag.mockResolvedValue(undefined);
    createAusnahme.mockResolvedValue({
      ...pfad,
      id: '2026-12-23',
      datum: '2026-12-23',
      bezeichnung: 'Sonderöffnung',
      oeffnungsregel: { geoeffnet: false },
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    });
    updateAusnahme.mockImplementation((_pfad, ausnahme, aktualisierung) => {
      return Promise.resolve({ ...ausnahme, ...aktualisierung });
    });
    deleteAusnahme.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        FilialeinstellungStore,
        {
          provide: FilialeinstellungService,
          useValue: {
            loadFilialeinstellungRohdaten,
            validateFilialeinstellungRohdaten,
            initializeFilialeinstellung,
            saveGrundlagen,
            createSondertag,
            updateSondertag,
            updateSystemSondertag,
            deleteSondertag,
            createAusnahme,
            updateAusnahme,
            deleteAusnahme,
          },
        },
        { provide: BenutzerStore, useValue: { benutzerId } },
        {
          provide: StammdatenStore,
          useValue: {
            getFilialen: vi.fn(() => [
              { id: 'b-1', anzeigename: 'Testhalle' },
              { id: 'b-2', anzeigename: 'Nebenhalle' },
            ]),
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

  it('should retain independent loading and data contexts for multiple branches', async () => {
    const store = TestBed.inject(FilialeinstellungStore);

    await Promise.all([
      store.loadFilialeinstellung(pfad),
      store.loadFilialeinstellung(andererPfad),
    ]);

    expect(store.getFilialeinstellungKontext(pfad)?.bestand).toEqual(bestand);
    expect(store.getFilialeinstellungKontext(andererPfad)?.bestand).toEqual(andererBestand);
  });

  it('should represent a loaded branch without settings as not initialized', async () => {
    const leereRohdaten = createLeereRohdaten();
    loadFilialeinstellungRohdaten.mockResolvedValueOnce(leereRohdaten);
    validateFilialeinstellungRohdaten.mockReturnValueOnce(null);
    const store = TestBed.inject(FilialeinstellungStore);

    await store.loadFilialeinstellung(pfad);

    expect(store.getFilialeinstellungKontext(pfad)).toMatchObject({
      bestand: null,
      isLoaded: true,
      download: false,
    });
  });

  it('should store the complete raw settings and log the document count before validation', async () => {
    const store = TestBed.inject(FilialeinstellungStore);

    await store.loadFilialeinstellung(pfad);

    expect(store.getFilialeinstellungKontext(pfad)?.rohdaten).toBe(rohdaten);
    expect(debugLogServiceMock.logDatenflussTitel).toHaveBeenCalledWith('3. FILIALDATEN ');
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith(
      'Einstellungen | Testhalle',
      2,
    );
    expect(validateFilialeinstellungRohdaten).toHaveBeenCalledWith(pfad, rohdaten);
  });

  it('should log the original loading error with its branch path', async () => {
    const error = Object.assign(new Error('Firestore-Lesen fehlgeschlagen.'), {
      code: 'permission-denied',
    });
    loadFilialeinstellungRohdaten.mockRejectedValueOnce(error);
    const store = TestBed.inject(FilialeinstellungStore);

    await expect(store.loadFilialeinstellung(pfad)).rejects.toBe(error);

    expect(debugLogServiceMock.log).toHaveBeenCalledWith(
      'Laden',
      'Die Filialeinstellungen konnten nicht geladen werden.',
      { ...pfad, error },
    );
    expect(store.getFilialeinstellungKontext(pfad)?.error).toEqual({
      meldung: 'Die Filialeinstellungen konnten nicht geladen werden.',
      ursache: 'Du hast keine Berechtigung für diese Aktion.',
    });
  });

  it('should expose a domain validation cause separately from the loading action', async () => {
    const error = new FilialeinstellungFachfehler(
      'Die Öffnungsregel enthält keine gültige Zeitfolge.',
    );
    validateFilialeinstellungRohdaten.mockImplementationOnce(() => {
      throw error;
    });
    const store = TestBed.inject(FilialeinstellungStore);

    await expect(store.loadFilialeinstellung(pfad)).rejects.toBe(error);

    expect(store.getFilialeinstellungKontext(pfad)?.error).toEqual({
      meldung: 'Die Filialeinstellungen wurden geladen, sind aber ungültig.',
      ursache: 'Die Öffnungsregel enthält keine gültige Zeitfolge.',
    });
    expect(store.getFilialeinstellungKontext(pfad)?.rohdaten).toBe(rohdaten);
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith(
      'Einstellungen | Testhalle',
      2,
    );
    expect(debugLogServiceMock.log).not.toHaveBeenCalled();
  });

  it('should initialize only a loaded empty context with an authenticated user', async () => {
    loadFilialeinstellungRohdaten.mockResolvedValueOnce(createLeereRohdaten());
    validateFilialeinstellungRohdaten.mockReturnValueOnce(null);
    const store = TestBed.inject(FilialeinstellungStore);
    await store.loadFilialeinstellung(pfad);

    await store.initializeFilialeinstellung(pfad, grundlagen);

    expect(initializeFilialeinstellung).toHaveBeenCalledWith(pfad, grundlagen, 'uid-1');
    expect(store.getFilialeinstellungKontext(pfad)?.bestand).toEqual(bestand);
  });

  it('should manage special days and exceptions only in their branch context', async () => {
    const store = TestBed.inject(FilialeinstellungStore);
    await Promise.all([
      store.loadFilialeinstellung(pfad),
      store.loadFilialeinstellung(andererPfad),
    ]);

    await store.createSondertag(pfad, {
      bezeichnung: 'Inventur',
      aktiv: true,
      datumsregel: { typ: 'jaehrlichFestesDatum', monat: 2, tag: 15 },
      oeffnungsregel: { geoeffnet: false },
    });
    await store.createAusnahme(pfad, {
      datum: '2026-12-23',
      bezeichnung: 'Sonderöffnung',
      oeffnungsregel: { geoeffnet: false },
    });

    expect(createSondertag).toHaveBeenCalledWith(
      pfad,
      expect.objectContaining({ bezeichnung: 'Inventur' }),
      bestand.sondertage,
      bestand.oeffnungszeiten.schliesszeitraum,
      'uid-1',
    );
    expect(createAusnahme).toHaveBeenCalledWith(
      pfad,
      expect.objectContaining({ datum: '2026-12-23' }),
      bestand.oeffnungszeiten.schliesszeitraum,
      'uid-1',
    );
    expect(store.getFilialeinstellungKontext(pfad)?.bestand?.sondertage).toHaveLength(2);
    expect(store.getFilialeinstellungKontext(pfad)?.bestand?.ausnahmen).toHaveLength(1);
    expect(store.getFilialeinstellungKontext(andererPfad)?.bestand).toEqual(andererBestand);
  });

  it('should reject an active annual special day colliding with an existing one', async () => {
    const ursache =
      'Die aktiven Sondertage „Betriebsruhe“ und „Heiligabend“ verwenden beide den 24.12.';
    createSondertag.mockRejectedValueOnce(new SondertagDatumskollisionFehler(ursache));
    const store = TestBed.inject(FilialeinstellungStore);
    await store.loadFilialeinstellung(pfad);

    await expect(
      store.createSondertag(pfad, {
        bezeichnung: 'Betriebsruhe',
        aktiv: true,
        datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
        oeffnungsregel: { geoeffnet: false },
      }),
    ).rejects.toThrow('Betriebsruhe');

    expect(createSondertag).toHaveBeenCalled();
    expect(store.getFilialeinstellungKontext(pfad)?.error).toEqual({
      meldung: 'Der Sondertag konnte nicht angelegt werden.',
      ursache,
    });
  });

  it('should resolve an exception before a system special day and the weekly rule', async () => {
    const bestandMitAusnahme = {
      ...bestand,
      ausnahmen: [
        {
          ...pfad,
          id: '2026-12-24',
          datum: '2026-12-24',
          bezeichnung: 'Sonderöffnung',
          oeffnungsregel: {
            geoeffnet: true,
            beginnLokalzeit: '08:00',
            endeLokalzeit: '14:00',
            endetAmFolgetag: false,
          },
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      ],
    } satisfies IFilialeinstellungBestand;
    const rohdatenMitAusnahme = createRohdaten(bestandMitAusnahme);
    loadFilialeinstellungRohdaten.mockResolvedValueOnce(rohdatenMitAusnahme);
    validateFilialeinstellungRohdaten.mockReturnValueOnce(bestandMitAusnahme);
    const store = TestBed.inject(FilialeinstellungStore);
    await store.loadFilialeinstellung(pfad);

    const ergebnis = store.resolveOeffnungsregelFuerDatum(pfad, '2026-12-24');

    expect(ergebnis).toMatchObject({ quelle: 'ausnahme', ausnahmeId: '2026-12-24' });
  });

  it('should keep writing state and errors isolated by branch', async () => {
    let rejectWrite: ((error: Error) => void) | undefined;
    createSondertag.mockImplementationOnce(() => {
      return new Promise((_resolve, reject) => {
        rejectWrite = reject;
      });
    });
    const store = TestBed.inject(FilialeinstellungStore);
    await Promise.all([
      store.loadFilialeinstellung(pfad),
      store.loadFilialeinstellung(andererPfad),
    ]);
    const promise = store.createSondertag(pfad, {
      bezeichnung: 'Inventur',
      aktiv: true,
      datumsregel: { typ: 'jaehrlichFestesDatum', monat: 2, tag: 15 },
      oeffnungsregel: { geoeffnet: false },
    });

    expect(store.getFilialeinstellungKontext(pfad)?.inProgress).toBe(true);
    expect(store.getFilialeinstellungKontext(andererPfad)?.inProgress).toBe(false);
    rejectWrite?.(new Error('Speichern fehlgeschlagen'));
    await expect(promise).rejects.toThrow('Speichern fehlgeschlagen');
    expect(store.getFilialeinstellungKontext(pfad)?.error).toEqual({
      meldung: 'Der Sondertag konnte nicht angelegt werden.',
      ursache: null,
    });
    expect(debugLogServiceMock.log).toHaveBeenCalledWith(
      'Store',
      'Der Sondertag konnte nicht angelegt werden.',
      expect.objectContaining({ ...pfad, error: expect.any(Error) }),
    );
    expect(store.getFilialeinstellungKontext(andererPfad)?.error).toBeNull();
  });

  it('should require loaded settings and an authenticated user for writes', async () => {
    const store = TestBed.inject(FilialeinstellungStore);

    await expect(store.saveGrundlagen(pfad, grundlagen)).rejects.toThrow('geladen');
    await store.loadFilialeinstellung(pfad);
    benutzerId.set(null);
    await expect(store.saveGrundlagen(pfad, grundlagen)).rejects.toThrow('Benutzeridentität');
  });
});

function createGrundlagen(): IFilialeinstellungGrundlagen {
  const wochenregeln: TWochenoeffnungszeiten = {
    montag: {
      geoeffnet: true,
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    },
    dienstag: { geoeffnet: false },
    mittwoch: { geoeffnet: false },
    donnerstag: { geoeffnet: false },
    freitag: { geoeffnet: false },
    samstag: { geoeffnet: false },
    sonntag: { geoeffnet: false },
  };
  return { bundesland: 'DE-NW', schliesszeitraum: STANDARD_SCHLIESSZEITRAUM, wochenregeln };
}

function createBestand(pfad: IFilialPfad): IFilialeinstellungBestand {
  const grundlagen = createGrundlagen();
  return {
    allgemein: {
      bundesland: grundlagen.bundesland,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    oeffnungszeiten: {
      schliesszeitraum: grundlagen.schliesszeitraum,
      wochenregeln: grundlagen.wochenregeln,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    sondertage: [
      {
        ...pfad,
        id: 'heiligabend',
        bezeichnung: 'Heiligabend',
        aktiv: true,
        herkunft: 'system',
        datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
        oeffnungsregel: { geoeffnet: false },
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    ],
    ausnahmen: [],
  };
}

function createRohdaten(bestand: IFilialeinstellungBestand): IFilialeinstellungRohdaten {
  return {
    allgemein: { id: 'allgemein', daten: bestand.allgemein },
    oeffnungszeiten: { id: 'oeffnungszeiten', daten: bestand.oeffnungszeiten },
    sondertage: bestand.sondertage.map((sondertag) => {
      const { id, ...daten } = sondertag;
      return { id, daten };
    }),
    ausnahmen: bestand.ausnahmen.map((ausnahme) => {
      const { id, ...daten } = ausnahme;
      return { id, daten };
    }),
  };
}

function createLeereRohdaten(): IFilialeinstellungRohdaten {
  return { allgemein: null, oeffnungszeiten: null, sondertage: [], ausnahmen: [] };
}
