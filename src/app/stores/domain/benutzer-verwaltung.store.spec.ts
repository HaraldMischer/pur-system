// pur-system/src/app/stores/domain/benutzer-verwaltung.store.spec.ts

import { TestBed } from '@angular/core/testing';

import { IBenutzerAnlage } from '../../commons/models/domain/benutzer';
import { DatenzugriffService } from '../../services/domain/datenzugriff.service';
import { AuthService } from '../../services/firebase/auth.service';
import { BenutzerVerwaltungService } from '../../services/firebase/benutzer-verwaltung.service';
import { BenutzerStore } from '../app/benutzer.store';
import { StammdatenStore } from '../app/stammdaten.store';
import { BenutzerVerwaltungStore } from './benutzer-verwaltung.store';

describe('BenutzerVerwaltungStore', () => {
  const anlage: IBenutzerAnlage = {
    namensbestandteil: 'testbenutzer',
    anzeigename: 'Test Benutzer',
    userRole: 'office',
    erlaubteBereiche: ['dashboard'],
    zugriffe: {},
    passwort: 'SicheresPasswort123!',
  };
  let serviceMock: {
    loadMitarbeiterAuswahl: ReturnType<typeof vi.fn>;
    createBenutzer: ReturnType<typeof vi.fn>;
    updateBenutzerProfil: ReturnType<typeof vi.fn>;
    updateDatenzuordnung: ReturnType<typeof vi.fn>;
    updateMitarbeiterZuordnung: ReturnType<typeof vi.fn>;
    deleteBenutzer: ReturnType<typeof vi.fn>;
  };
  let authServiceMock: { getAktuelleBenutzerId: ReturnType<typeof vi.fn> };
  let benutzerStoreMock: { setBenutzerProfil: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    serviceMock = {
      loadMitarbeiterAuswahl: vi
        .fn()
        .mockResolvedValue([{ id: 'm-1', anzeigename: 'Muster, Mia' }]),
      createBenutzer: vi.fn().mockResolvedValue({
        uid: 'neu-123',
        anmeldename: 'testbenutzer-office',
        email: 'testbenutzer-office@pur-system.invalid',
      }),
      updateBenutzerProfil: vi.fn().mockResolvedValue(undefined),
      updateDatenzuordnung: vi.fn().mockResolvedValue(undefined),
      updateMitarbeiterZuordnung: vi.fn().mockResolvedValue(undefined),
      deleteBenutzer: vi.fn().mockResolvedValue(undefined),
    };
    authServiceMock = {
      getAktuelleBenutzerId: vi.fn().mockReturnValue('master-1'),
    };
    benutzerStoreMock = {
      setBenutzerProfil: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DatenzugriffService,
          useValue: {
            loadUnternehmer: vi.fn().mockResolvedValue([]),
            loadFirmen: vi.fn().mockResolvedValue([]),
            loadFilialen: vi.fn().mockResolvedValue([]),
          },
        },
        { provide: AuthService, useValue: authServiceMock },
        { provide: BenutzerStore, useValue: benutzerStoreMock },
        { provide: BenutzerVerwaltungService, useValue: serviceMock },
      ],
    });
  });

  it('should provide a complete initial snapshot', () => {
    const store = TestBed.inject(BenutzerVerwaltungStore);

    expect(store.snapshot()).toEqual({
      listen: {},
      unternehmerIds: [],
      firmaIds: [],
      filialen: {},
      mitarbeiterAuswahl: [],
      mitarbeiterAuswahlKontext: null,
      mitarbeiterAuswahlDownload: false,
      mitarbeiterAuswahlIsLoaded: false,
      mitarbeiterAuswahlError: null,
      selectedMitarbeiterId: null,
      inProgress: false,
      error: null,
      createdBenutzer: null,
      selectedBenutzerUid: null,
      updateError: null,
      updateSuccess: null,
    });
  });

  it('should create a user and expose the result', async () => {
    const store = TestBed.inject(BenutzerVerwaltungStore);

    await expect(store.createBenutzer(anlage)).resolves.toEqual({
      uid: 'neu-123',
      anmeldename: 'testbenutzer-office',
      email: 'testbenutzer-office@pur-system.invalid',
    });
    expect(serviceMock.createBenutzer).toHaveBeenCalledWith(anlage);
    expect(store.createdBenutzer()).toEqual({
      uid: 'neu-123',
      anmeldename: 'testbenutzer-office',
      email: 'testbenutzer-office@pur-system.invalid',
    });
    expect(TestBed.inject(StammdatenStore).benutzerprofile()).toContainEqual({
      uid: 'neu-123',
      anmeldename: 'testbenutzer-office',
      email: 'testbenutzer-office@pur-system.invalid',
      anzeigename: anlage.anzeigename,
      userRole: anlage.userRole,
      erlaubteBereiche: anlage.erlaubteBereiche,
      zugriffe: anlage.zugriffe,
      aktiv: true,
    });
    expect(store.inProgress()).toBe(false);
  });

  it('should preserve the company employee reference in the local profile', async () => {
    const store = TestBed.inject(BenutzerVerwaltungStore);
    const mitarbeiterAnlage: IBenutzerAnlage = {
      ...anlage,
      userRole: 'mitarbeiter',
      zugriffe: { u: { f: [] } },
      firmaMitarbeiterId: 'm-1',
    };

    await store.createBenutzer(mitarbeiterAnlage);

    expect(TestBed.inject(StammdatenStore).benutzerprofile()).toContainEqual(
      expect.objectContaining({
        userRole: 'mitarbeiter',
        zugriffe: { u: { f: [] } },
        firmaMitarbeiterId: 'm-1',
      }),
    );
  });

  it('should expose a friendly callable error', async () => {
    const error = { code: 'functions/already-exists' };
    serviceMock.createBenutzer.mockRejectedValue(error);
    const store = TestBed.inject(BenutzerVerwaltungStore);

    await expect(store.createBenutzer(anlage)).rejects.toBe(error);
    expect(store.error()).toBe(
      'Dieser Anmeldename wird bereits verwendet. Bitte einen anderen Namensbestandteil wählen.',
    );
    expect(store.createdBenutzer()).toBeNull();
    expect(store.inProgress()).toBe(false);
  });

  it('should select and update a profile without reloading the list', async () => {
    const store = TestBed.inject(BenutzerVerwaltungStore);
    const stammdatenStore = TestBed.inject(StammdatenStore);
    stammdatenStore.upsertBenutzerprofil({
      uid: 'office-1',
      email: 'office@example.com',
      anzeigename: 'Office Alt',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard'],
      zugriffe: { u: { f: ['b'] } },
    });
    store.selectBenutzer('office-1');

    const result = await store.updateBenutzerProfil({
      anzeigename: 'Office Neu',
      aktiv: true,
      erlaubteBereiche: ['dashboard', 'verwaltung'],
    });

    expect(serviceMock.updateBenutzerProfil).toHaveBeenCalledWith(
      'office-1',
      expect.objectContaining({ anzeigename: 'Office Neu' }),
    );
    expect(result.anzeigename).toBe('Office Neu');
    expect(store.selectedBenutzer()?.anzeigename).toBe('Office Neu');
    expect(store.updateSuccess()).toContain('office@example.com');
  });

  it('should clear feedback from the previous user action when a new action starts', async () => {
    const store = TestBed.inject(BenutzerVerwaltungStore);
    const stammdatenStore = TestBed.inject(StammdatenStore);
    stammdatenStore.upsertBenutzerprofil({
      uid: 'office-1',
      email: 'office@example.com',
      anzeigename: 'Office Alt',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard'],
      zugriffe: { u: { f: ['b'] } },
    });
    store.selectBenutzer('office-1');

    await store.createBenutzer(anlage);
    expect(store.createdBenutzer()).not.toBeNull();

    await store.updateBenutzerProfil({
      anzeigename: 'Office Neu',
      aktiv: true,
      erlaubteBereiche: ['dashboard'],
    });
    expect(store.createdBenutzer()).toBeNull();
    expect(store.updateSuccess()).not.toBeNull();

    await store.createBenutzer(anlage);
    expect(store.updateSuccess()).toBeNull();
  });

  it('should protect the own master profile from deactivation', async () => {
    authServiceMock.getAktuelleBenutzerId.mockReturnValue('master-1');
    const store = TestBed.inject(BenutzerVerwaltungStore);
    const stammdatenStore = TestBed.inject(StammdatenStore);
    stammdatenStore.upsertBenutzerprofil({
      uid: 'master-1',
      email: 'master@example.com',
      anzeigename: 'Master',
      aktiv: true,
      userRole: 'master',
      erlaubteBereiche: ['systemverwaltung'],
      zugriffe: {},
    });
    store.selectBenutzer('master-1');

    await expect(
      store.updateBenutzerProfil({
        anzeigename: 'Master',
        aktiv: false,
        erlaubteBereiche: ['systemverwaltung'],
      }),
    ).rejects.toThrow('Ungültige Änderung');
    expect(serviceMock.updateBenutzerProfil).not.toHaveBeenCalled();
    expect(store.updateError()).toContain('nicht deaktiviert');
  });

  it('should reassign a selected office account without reloading profiles', async () => {
    const store = TestBed.inject(BenutzerVerwaltungStore);
    const stammdatenStore = TestBed.inject(StammdatenStore);
    stammdatenStore.upsertBenutzerprofil({
      uid: 'office-1',
      email: 'office@example.com',
      anzeigename: 'Office',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard'],
      zugriffe: { 'u-alt': { 'f-alt': ['b-alt'] } },
    });
    store.selectBenutzer('office-1');

    const result = await store.updateDatenzuordnung({
      zugriffe: { 'u-neu': { 'f-neu': ['b-neu'] } },
    });

    expect(serviceMock.updateDatenzuordnung).toHaveBeenCalledWith('office-1', {
      zugriffe: { 'u-neu': { 'f-neu': ['b-neu'] } },
    });
    expect(result.zugriffe).toEqual({ 'u-neu': { 'f-neu': ['b-neu'] } });
    expect(store.updateSuccess()).toContain('neu zugeordnet');
  });

  it('should reassign a selected employee account without reloading profiles', async () => {
    const store = TestBed.inject(BenutzerVerwaltungStore);
    const stammdatenStore = TestBed.inject(StammdatenStore);
    stammdatenStore.upsertBenutzerprofil({
      uid: 'mitarbeiter-1',
      email: 'mitarbeiter@example.com',
      anzeigename: 'Mitarbeiter',
      aktiv: true,
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['dashboard'],
      zugriffe: { 'u-alt': { 'f-alt': [] } },
      firmaMitarbeiterId: 'm-alt',
    });
    store.selectBenutzer('mitarbeiter-1');

    const result = await store.updateMitarbeiterZuordnung({
      unternehmerId: 'u-neu',
      firmaId: 'f-neu',
      firmaMitarbeiterId: 'm-neu',
    });

    expect(serviceMock.updateMitarbeiterZuordnung).toHaveBeenCalledWith('mitarbeiter-1', {
      unternehmerId: 'u-neu',
      firmaId: 'f-neu',
      firmaMitarbeiterId: 'm-neu',
    });
    expect(result).toMatchObject({
      zugriffe: { 'u-neu': { 'f-neu': [] } },
      firmaMitarbeiterId: 'm-neu',
    });
    expect(store.selectedBenutzer()).toMatchObject({ firmaMitarbeiterId: 'm-neu' });
    expect(store.updateSuccess()).toContain('neu zugeordnet');
  });

  it('should delete a selected employee account from the local profile list', async () => {
    const store = TestBed.inject(BenutzerVerwaltungStore);
    const stammdatenStore = TestBed.inject(StammdatenStore);
    stammdatenStore.upsertBenutzerprofil({
      uid: 'mitarbeiter-1',
      email: 'mitarbeiter@example.com',
      anzeigename: 'Mitarbeiter',
      aktiv: true,
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['dashboard'],
      zugriffe: { u: { f: [] } },
      firmaMitarbeiterId: 'm-1',
    });
    store.selectBenutzer('mitarbeiter-1');

    await store.deleteBenutzer();

    expect(serviceMock.deleteBenutzer).toHaveBeenCalledWith('mitarbeiter-1');
    expect(stammdatenStore.benutzerprofile()).toEqual([]);
    expect(store.selectedBenutzer()).toBeNull();
    expect(store.updateSuccess()).toContain('gelöscht');
  });
  function prepareDaten() {
    const daten = TestBed.inject(DatenzugriffService);
    vi.mocked(daten.loadUnternehmer).mockResolvedValue([
      { id: 'a', anzeigename: 'A' },
      { id: 'b', anzeigename: 'B' },
    ]);
    vi.mocked(daten.loadFirmen).mockResolvedValue([{ id: 'f', anzeigename: 'Firma' }]);
    vi.mocked(daten.loadFilialen).mockResolvedValue([{ id: 'z', anzeigename: 'Filiale' }]);
    return { daten, store: TestBed.inject(BenutzerVerwaltungStore) };
  }

  it('should load dependent lists, cache by full path and prune deselected descendants', async () => {
    const { daten, store } = prepareDaten();
    const a = JSON.stringify(['a', 'f']);
    const b = JSON.stringify(['b', 'f']);
    await store.loadAuswahl();
    expect(daten.loadFirmen).not.toHaveBeenCalled();
    store.selectUnternehmer(['a', 'b']);
    await store.loadAuswahl();
    expect(daten.loadFirmen).toHaveBeenCalledTimes(2);
    expect(daten.loadFilialen).not.toHaveBeenCalled();
    store.selectFirmen([a, b]);
    await store.loadAuswahl();
    expect(daten.loadFilialen).toHaveBeenCalledWith('a', 'f');
    expect(daten.loadFilialen).toHaveBeenCalledWith('b', 'f');
    store.selectFilialen({ [a]: ['z'], [b]: ['z', 'invalid'] });
    store.selectUnternehmer(['b']);
    expect(store.firmaIds()).toEqual([b]);
    expect(store.filialen()).toEqual({ [b]: ['z'] });
    store.selectUnternehmer(['a', 'b']);
    await store.loadAuswahl();
    store.selectFirmen([a, b]);
    await store.loadAuswahl();
    expect(daten.loadUnternehmer).toHaveBeenCalledTimes(1);
    expect(daten.loadFirmen).toHaveBeenCalledTimes(2);
    expect(daten.loadFilialen).toHaveBeenCalledTimes(2);
    expect(store.filialen()).toEqual({ [b]: ['z'] });
  });

  it('should distinguish failed and empty lists and retry without changing creation feedback', async () => {
    const { daten, store } = prepareDaten();
    vi.mocked(daten.loadUnternehmer).mockRejectedValueOnce({ code: 'permission-denied' });
    await store.loadAuswahl();
    expect(store.datenStatus()[0].error).toBeTruthy();
    expect(store.datenStatus()[0].isLoaded).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.inProgress()).toBe(false);
    vi.mocked(daten.loadUnternehmer).mockResolvedValue([]);
    await store.loadAuswahl();
    expect(store.datenStatus()[0]).toMatchObject({
      isLoaded: true,
      download: false,
      error: null,
      daten: [],
    });
    await store.loadAuswahl();
    expect(daten.loadUnternehmer).toHaveBeenCalledTimes(2);
  });

  it('should cache late responses without restoring deselected parents', async () => {
    const { daten, store } = prepareDaten();
    let resolve!: (data: { id: string; anzeigename: string }[]) => void;
    vi.mocked(daten.loadFirmen).mockImplementation((id) =>
      id === 'a'
        ? new Promise((done) => {
            resolve = done;
          })
        : Promise.resolve([]),
    );
    await store.loadAuswahl();
    store.selectUnternehmer(['a']);
    const pending = store.loadAuswahl();
    await Promise.resolve();
    store.selectUnternehmer(['b']);
    await store.loadAuswahl();
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    resolve([{ id: 'f', anzeigename: 'Späte Firma' }]);
    await pending;
    expect(store.unternehmerIds()).toEqual(['b']);
    expect(store.firmaIds()).toEqual([]);
    expect(store.datenStatus().map((s) => s.name)).toEqual(['Unternehmer', 'Firmen von B']);
    store.selectUnternehmer(['a']);
    await store.loadAuswahl();
    expect(daten.loadFirmen).toHaveBeenCalledTimes(2);
  });

  it('should ignore pending data after reset', async () => {
    const { daten, store } = prepareDaten();
    let resolve!: (data: { id: string; anzeigename: string }[]) => void;
    vi.mocked(daten.loadUnternehmer).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = store.loadAuswahl();
    await Promise.resolve();
    expect(store.datenStatus()[0].download).toBe(true);
    store.reset();
    resolve([{ id: 'old', anzeigename: 'Alt' }]);
    await pending;
    expect(store.unternehmer()).toEqual([]);
    expect(store.listen()).toEqual({});
  });
  it('should build scoped access payloads and require branches for every selected company', async () => {
    const { store } = prepareDaten();
    const a = JSON.stringify(['a', 'f']);
    const b = JSON.stringify(['b', 'f']);
    await store.loadAuswahl();
    expect(store.datenAuswahlGueltig()).toBe(true);
    expect(store.zugriffe()).toEqual({});
    store.selectUnternehmer(['a', 'b']);
    await store.loadAuswahl();
    expect(store.datenAuswahlGueltig()).toBe(false);
    store.selectFirmen([a, b]);
    await store.loadAuswahl();
    store.selectFilialen({ [a]: ['z'] });
    expect(store.datenAuswahlGueltig()).toBe(false);
    store.selectFilialen({ [a]: ['z'], [b]: ['z'] });
    expect(store.datenAuswahlGueltig()).toBe(true);
    expect(store.zugriffe()).toEqual({ a: { f: ['z'] }, b: { f: ['z'] } });
    store.selectUnternehmer(['b']);
    await store.loadAuswahl();
    expect(store.zugriffe()).toEqual({ b: { f: ['z'] } });
  });

  it('should load and select reduced employees for the uniquely selected company', async () => {
    const { store } = prepareDaten();
    const firmaKey = JSON.stringify(['a', 'f']);
    await store.loadAuswahl();
    store.selectUnternehmer(['a']);
    await store.loadAuswahl();
    store.selectFirmen([firmaKey]);

    await store.loadMitarbeiterAuswahl();

    expect(serviceMock.loadMitarbeiterAuswahl).toHaveBeenCalledWith({
      unternehmerId: 'a',
      firmaId: 'f',
    });
    expect(store.mitarbeiterAuswahl()).toEqual([{ id: 'm-1', anzeigename: 'Muster, Mia' }]);
    expect(store.mitarbeiterAuswahlIsLoaded()).toBe(true);
    expect(store.mitarbeiterAuswahlDownload()).toBe(false);
    store.selectMitarbeiter('m-1');
    expect(store.selectedMitarbeiter()).toEqual({ id: 'm-1', anzeigename: 'Muster, Mia' });
  });

  it('should reset employees and ignore a late response after the company changes', async () => {
    const { store } = prepareDaten();
    const firmaAKey = JSON.stringify(['a', 'f']);
    let resolve!: (data: { id: string; anzeigename: string }[]) => void;
    serviceMock.loadMitarbeiterAuswahl.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await store.loadAuswahl();
    store.selectUnternehmer(['a']);
    await store.loadAuswahl();
    store.selectFirmen([firmaAKey]);
    const pending = store.loadMitarbeiterAuswahl();
    await Promise.resolve();

    store.selectUnternehmer(['b']);
    expect(store.mitarbeiterAuswahl()).toEqual([]);
    expect(store.selectedMitarbeiterId()).toBeNull();
    resolve([{ id: 'm-alt', anzeigename: 'Alt, Anton' }]);
    await pending;
    expect(store.mitarbeiterAuswahl()).toEqual([]);
    expect(store.mitarbeiterAuswahlIsLoaded()).toBe(false);
  });

  it('should expose employee selection loading errors separately', async () => {
    const { store } = prepareDaten();
    const firmaKey = JSON.stringify(['a', 'f']);
    serviceMock.loadMitarbeiterAuswahl.mockRejectedValue({ code: 'functions/unavailable' });
    await store.loadAuswahl();
    store.selectUnternehmer(['a']);
    await store.loadAuswahl();
    store.selectFirmen([firmaKey]);

    await store.loadMitarbeiterAuswahl();

    expect(store.mitarbeiterAuswahl()).toEqual([]);
    expect(store.mitarbeiterAuswahlIsLoaded()).toBe(false);
    expect(store.mitarbeiterAuswahlError()).toBeTruthy();
    expect(store.error()).toBeNull();
  });
});
