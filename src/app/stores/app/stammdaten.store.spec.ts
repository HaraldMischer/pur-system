// pur-system/src/app/stores/app/stammdaten.store.spec.ts

import { TestBed } from '@angular/core/testing';

import { IBenutzerProfilDokument } from '../../commons/models/domain/benutzer';
import { DebugLogService } from '../../services/core/debug-log.service';
import { BenutzerService } from '../../services/domain/benutzer.service';
import { FilialeService } from '../../services/domain/filiale.service';
import { FirmaService } from '../../services/domain/firma.service';
import { UnternehmerService } from '../../services/domain/unternehmer.service';
import { StammdatenStore } from './stammdaten.store';

describe('StammdatenStore', () => {
  const masterProfil: IBenutzerProfilDokument = {
    email: 'master@example.com',
    anzeigename: 'Master',
    aktiv: true,
    userRole: 'master',
    erlaubteBereiche: ['dashboard', 'systemverwaltung'],
    zugriffe: {},
  };
  let benutzerServiceMock: { loadBenutzerProfile: ReturnType<typeof vi.fn> };
  let unternehmerServiceMock: {
    loadUnternehmer: ReturnType<typeof vi.fn>;
    loadUnternehmerEintrag: ReturnType<typeof vi.fn>;
  };
  let firmaServiceMock: {
    loadFirmen: ReturnType<typeof vi.fn>;
    loadFirmaEintrag: ReturnType<typeof vi.fn>;
  };
  let filialeServiceMock: {
    loadFilialen: ReturnType<typeof vi.fn>;
    loadFilialeEintrag: ReturnType<typeof vi.fn>;
  };
  let debugLogServiceMock: {
    logDatenflussTitel: ReturnType<typeof vi.fn>;
    logDatenGeladen: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    benutzerServiceMock = {
      loadBenutzerProfile: vi.fn().mockResolvedValue([
        {
          uid: 'profil-1',
          email: 'office@example.com',
          anzeigename: 'Office',
          aktiv: true,
          userRole: 'office',
          erlaubteBereiche: ['dashboard'],
          zugriffe: {},
        },
      ]),
    };
    unternehmerServiceMock = {
      loadUnternehmer: vi
        .fn()
        .mockResolvedValue([{ id: 'u-1', nummer: 1, anzeigename: 'Unternehmer' }]),
      loadUnternehmerEintrag: vi.fn().mockImplementation(async (id: string) => {
        return { id, nummer: 1, anzeigename: 'Unternehmer' };
      }),
    };
    firmaServiceMock = {
      loadFirmen: vi.fn().mockResolvedValue([{ id: 'f-1', nummer: 1, anzeigename: 'Firma' }]),
      loadFirmaEintrag: vi.fn().mockImplementation(async (_uid: string, id: string) => {
        return { id, nummer: 1, anzeigename: 'Firma' };
      }),
    };
    filialeServiceMock = {
      loadFilialen: vi.fn().mockResolvedValue([{ id: 'b-1', nummer: 1, anzeigename: 'Filiale' }]),
      loadFilialeEintrag: vi
        .fn()
        .mockImplementation(async (_uid: string, _fid: string, id: string) => {
          return { id, nummer: 1, anzeigename: 'Filiale' };
        }),
    };
    debugLogServiceMock = {
      logDatenflussTitel: vi.fn(),
      logDatenGeladen: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        StammdatenStore,
        { provide: DebugLogService, useValue: debugLogServiceMock },
        { provide: BenutzerService, useValue: benutzerServiceMock },
        { provide: UnternehmerService, useValue: unternehmerServiceMock },
        { provide: FirmaService, useValue: firmaServiceMock },
        { provide: FilialeService, useValue: filialeServiceMock },
      ],
    });
  });

  it('should load all master data once for a master', async () => {
    const store = TestBed.inject(StammdatenStore);

    await Promise.all([
      store.loadStammdaten('master-1', masterProfil),
      store.loadStammdaten('master-1', masterProfil),
    ]);
    await store.loadStammdaten('master-1', masterProfil);

    expect(unternehmerServiceMock.loadUnternehmer).toHaveBeenCalledOnce();
    expect(firmaServiceMock.loadFirmen).toHaveBeenCalledWith('u-1');
    expect(filialeServiceMock.loadFilialen).toHaveBeenCalledWith('u-1', 'f-1');
    expect(benutzerServiceMock.loadBenutzerProfile).toHaveBeenCalledOnce();
    expect(store.getFirmen('u-1')).toHaveLength(1);
    expect(store.getFilialen('u-1', 'f-1')).toHaveLength(1);
    expect(store.benutzerprofile()).toHaveLength(1);
    expect(store.isLoaded()).toBe(true);
    expect(debugLogServiceMock.logDatenflussTitel).toHaveBeenCalledWith('2. STAMMDATEN | MASTER ');
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith(
      'Unternehmer',
      1,
      expect.any(Array),
    );
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith(
      'Benutzerprofile',
      1,
      expect.any(Array),
    );
    expect(debugLogServiceMock.logDatenflussTitel).toHaveBeenCalledWith(
      'STAMMDATEN VOLLSTÄNDIG GELADEN ',
    );
  });

  it('should load only assigned documents for an office profile', async () => {
    const profil: IBenutzerProfilDokument = {
      ...masterProfil,
      userRole: 'office',
      zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
    };
    const store = TestBed.inject(StammdatenStore);

    await store.loadStammdaten('office-1', profil);

    expect(unternehmerServiceMock.loadUnternehmer).not.toHaveBeenCalled();
    expect(unternehmerServiceMock.loadUnternehmerEintrag).toHaveBeenCalledWith('u-1');
    expect(firmaServiceMock.loadFirmaEintrag).toHaveBeenCalledWith('u-1', 'f-1');
    expect(filialeServiceMock.loadFilialeEintrag).toHaveBeenCalledWith('u-1', 'f-1', 'b-1');
    expect(benutzerServiceMock.loadBenutzerProfile).not.toHaveBeenCalled();
    expect(store.benutzerprofile()).toEqual([]);
  });

  it('should update cached entries and clear them on reset', async () => {
    const store = TestBed.inject(StammdatenStore);
    await store.loadStammdaten('master-1', masterProfil);

    store.upsertUnternehmer({ id: 'u-2', nummer: 2, anzeigename: 'Alpha' });
    store.upsertFirma('u-1', {
      id: 'f-2',
      nummer: 2,
      anzeigename: 'Alpha',
      firmenname: 'Alpha GmbH',
      aktiv: true,
      adresse: {
        strasse: 'Hauptstraße',
        hausnummer: '1',
        postleitzahl: '20095',
        ort: 'Hamburg',
      },
      kontakt: {},
    });
    store.upsertFiliale('u-1', 'f-1', {
      id: 'b-2',
      nummer: 2,
      aktiv: true,
      anzeigename: 'Alpha',
      filialname: 'Filiale Alpha',
      adresse: {
        strasse: 'Hauptstraße',
        hausnummer: '1',
        postleitzahl: '20095',
        ort: 'Hamburg',
      },
      kontakt: {},
    });

    expect(store.unternehmer()[0].id).toBe('u-2');
    expect(store.getFirmen('u-1')[0].id).toBe('f-2');
    expect(store.getFilialen('u-1', 'f-1')[0].id).toBe('b-2');

    store.removeFiliale('u-1', 'f-1', 'b-2');
    store.removeFirma('u-1', 'f-2');
    store.removeUnternehmer('u-2');
    expect(store.getFilialen('u-1', 'f-1').map((eintrag) => eintrag.id)).toEqual(['b-1']);
    expect(store.getFirmen('u-1').some((eintrag) => eintrag.id === 'f-2')).toBe(false);
    expect(store.unternehmer().some((eintrag) => eintrag.id === 'u-2')).toBe(false);

    store.reset();
    expect(store.snapshot()).toEqual({
      benutzerId: null,
      unternehmer: [],
      firmenNachUnternehmer: {},
      filialenNachFirma: {},
      benutzerprofile: [],
      download: false,
      isLoaded: false,
      error: null,
    });
  });

  it('should expose a loading error without keeping partial data', async () => {
    unternehmerServiceMock.loadUnternehmer.mockRejectedValue({ code: 'unavailable' });
    const store = TestBed.inject(StammdatenStore);

    await store.loadStammdaten('master-1', masterProfil);

    expect(store.isLoaded()).toBe(false);
    expect(store.download()).toBe(false);
    expect(store.unternehmer()).toEqual([]);
    expect(store.error()).toBe('Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.');
  });
});
