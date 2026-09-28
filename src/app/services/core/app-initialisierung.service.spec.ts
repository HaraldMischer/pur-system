// pur-system/src/app/services/core/app-initialisierung.service.spec.ts

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IBenutzerProfilDokument } from '../../commons/models/domain/benutzer';
import { BenutzerStore } from '../../stores/app/benutzer.store';
import { AppInitialisierungService } from './app-initialisierung.service';
import { StammdatenLadeservice } from './stammdaten-ladeservice';

describe('AppInitialisierungService', () => {
  let benutzerId: WritableSignal<string | null>;
  let isAuthenticated: WritableSignal<boolean>;
  let benutzerProfil: WritableSignal<IBenutzerProfilDokument | null>;
  let profilDownload: WritableSignal<boolean>;
  let profilError: WritableSignal<string | null>;
  let benutzerStoreMock: {
    benutzerId: WritableSignal<string | null>;
    isAuthenticated: WritableSignal<boolean>;
    benutzerProfil: WritableSignal<IBenutzerProfilDokument | null>;
    inProgress: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    initAuthState: ReturnType<typeof vi.fn>;
    loadBenutzerProfil: ReturnType<typeof vi.fn>;
  };
  let stammdatenLadeserviceMock: {
    loadStammdaten: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let profil: IBenutzerProfilDokument;

  beforeEach(() => {
    profil = {
      anzeigename: 'Test Office',
      email: 'test-office@pur-system.invalid',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard'],
      zugriffe: { 'u-1': { 'firma-1': ['filiale-1'] } },
    };
    benutzerId = signal(null);
    isAuthenticated = signal(false);
    benutzerProfil = signal(null);
    profilDownload = signal(false);
    profilError = signal(null);
    benutzerStoreMock = {
      benutzerId,
      isAuthenticated,
      benutzerProfil,
      inProgress: profilDownload,
      error: profilError,
      initAuthState: vi.fn(),
      loadBenutzerProfil: vi.fn(),
    };
    stammdatenLadeserviceMock = {
      loadStammdaten: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AppInitialisierungService,
        { provide: BenutzerStore, useValue: benutzerStoreMock },
        { provide: StammdatenLadeservice, useValue: stammdatenLadeserviceMock },
      ],
    });
  });

  it('should start the auth observation only once', () => {
    const service = TestBed.inject(AppInitialisierungService);

    service.init();
    service.init();
    TestBed.tick();

    expect(benutzerStoreMock.initAuthState).toHaveBeenCalledOnce();
    expect(service.status()).toBe('idle');
    expect(service.error()).toBeNull();
    expect(stammdatenLadeserviceMock.reset).toHaveBeenCalled();
  });

  it('should expose loading while the user profile is loading', () => {
    const service = TestBed.inject(AppInitialisierungService);
    benutzerId.set('benutzer-1');
    isAuthenticated.set(true);
    profilDownload.set(true);

    service.init();
    TestBed.tick();

    expect(service.status()).toBe('loading');
    expect(stammdatenLadeserviceMock.loadStammdaten).not.toHaveBeenCalled();
  });

  it('should not initialize cached profile data before profile loading has finished', () => {
    const service = TestBed.inject(AppInitialisierungService);
    setAktivesProfil();
    profilDownload.set(true);

    service.init();
    TestBed.tick();

    expect(service.status()).toBe('loading');
    expect(stammdatenLadeserviceMock.loadStammdaten).not.toHaveBeenCalled();
  });

  it('should load the required data for an active profile', async () => {
    const service = TestBed.inject(AppInitialisierungService);
    setAktivesProfil();

    service.init();
    TestBed.tick();

    await vi.waitFor(() => {
      expect(service.status()).toBe('ready');
    });
    expect(stammdatenLadeserviceMock.loadStammdaten).toHaveBeenCalledWith('benutzer-1', profil);
    expect(service.error()).toBeNull();
  });

  it('should keep an inactive profile idle without loading data', () => {
    const service = TestBed.inject(AppInitialisierungService);
    setAktivesProfil({ ...profil, aktiv: false });

    service.init();
    TestBed.tick();

    expect(service.status()).toBe('idle');
    expect(stammdatenLadeserviceMock.reset).toHaveBeenCalled();
    expect(stammdatenLadeserviceMock.loadStammdaten).not.toHaveBeenCalled();
  });

  it('should expose a profile loading error', () => {
    const service = TestBed.inject(AppInitialisierungService);
    benutzerId.set('benutzer-1');
    isAuthenticated.set(true);
    profilError.set('Das Benutzerprofil konnte nicht geladen werden.');

    service.init();
    TestBed.tick();

    expect(service.status()).toBe('error');
    expect(service.error()).toBe('Das Benutzerprofil konnte nicht geladen werden.');
  });

  it('should expose a data loading error', async () => {
    const service = TestBed.inject(AppInitialisierungService);
    setAktivesProfil();
    stammdatenLadeserviceMock.loadStammdaten.mockRejectedValue({ code: 'unavailable' });

    service.init();
    TestBed.tick();

    await vi.waitFor(() => {
      expect(service.status()).toBe('error');
    });
    expect(service.error()).toBe(
      'Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.',
    );
  });

  it('should retry a failed data initialization', async () => {
    const service = TestBed.inject(AppInitialisierungService);
    setAktivesProfil();
    stammdatenLadeserviceMock.loadStammdaten
      .mockRejectedValueOnce({ code: 'unavailable' })
      .mockResolvedValueOnce(undefined);

    service.init();
    TestBed.tick();
    await vi.waitFor(() => {
      expect(service.status()).toBe('error');
    });

    await service.retry();

    expect(service.status()).toBe('ready');
    expect(service.error()).toBeNull();
    expect(stammdatenLadeserviceMock.loadStammdaten).toHaveBeenCalledTimes(2);
    expect(stammdatenLadeserviceMock.loadStammdaten).toHaveBeenLastCalledWith(
      'benutzer-1',
      profil,
      'networkOnly',
    );
  });

  it('should retry a failed profile initialization', async () => {
    const service = TestBed.inject(AppInitialisierungService);
    benutzerId.set('benutzer-1');
    isAuthenticated.set(true);
    profilError.set('Das Benutzerprofil konnte nicht geladen werden.');
    benutzerStoreMock.loadBenutzerProfil.mockImplementation(async () => {
      profilError.set(null);
      benutzerProfil.set(profil);
      return profil;
    });
    service.init();
    TestBed.tick();
    expect(service.status()).toBe('error');

    await service.retry();

    expect(benutzerStoreMock.loadBenutzerProfil).toHaveBeenCalledWith(
      'benutzer-1',
      'networkOnly',
      true,
    );
    expect(service.status()).toBe('ready');
    expect(service.error()).toBeNull();
  });

  it('should reload data when role or access changes', async () => {
    const service = TestBed.inject(AppInitialisierungService);
    setAktivesProfil();
    service.init();
    TestBed.tick();
    await vi.waitFor(() => {
      expect(service.status()).toBe('ready');
    });
    stammdatenLadeserviceMock.loadStammdaten.mockClear();

    const geaendertesProfil: IBenutzerProfilDokument = {
      ...profil,
      zugriffe: { 'u-1': { 'firma-2': [] } },
    };
    benutzerProfil.set(geaendertesProfil);
    TestBed.tick();

    await vi.waitFor(() => {
      expect(stammdatenLadeserviceMock.loadStammdaten).toHaveBeenCalledWith(
        'benutzer-1',
        geaendertesProfil,
      );
      expect(service.status()).toBe('ready');
    });
  });

  it('should reload data when the assigned employee changes', async () => {
    const service = TestBed.inject(AppInitialisierungService);
    setAktivesProfil({ ...profil, userRole: 'mitarbeiter', firmaMitarbeiterId: 'm-1' });
    service.init();
    TestBed.tick();
    await vi.waitFor(() => {
      expect(service.status()).toBe('ready');
    });
    stammdatenLadeserviceMock.loadStammdaten.mockClear();

    const geaendertesProfil: IBenutzerProfilDokument = {
      ...profil,
      userRole: 'mitarbeiter',
      firmaMitarbeiterId: 'm-2',
    };
    benutzerProfil.set(geaendertesProfil);
    TestBed.tick();

    await vi.waitFor(() => {
      expect(stammdatenLadeserviceMock.loadStammdaten).toHaveBeenCalledWith(
        'benutzer-1',
        geaendertesProfil,
      );
      expect(service.status()).toBe('ready');
    });
  });

  it('should ignore a stale result after logout', async () => {
    let resolveLoad!: () => void;
    stammdatenLadeserviceMock.loadStammdaten.mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolveLoad = () => {
          resolve();
        };
      });
    });
    const service = TestBed.inject(AppInitialisierungService);
    setAktivesProfil();
    service.init();
    TestBed.tick();
    expect(service.status()).toBe('loading');

    benutzerId.set(null);
    isAuthenticated.set(false);
    benutzerProfil.set(null);
    TestBed.tick();
    resolveLoad();
    await Promise.resolve();

    expect(service.status()).toBe('idle');
    expect(service.error()).toBeNull();
  });

  it('should reset session data before loading another user', async () => {
    const service = TestBed.inject(AppInitialisierungService);
    setAktivesProfil();
    service.init();
    TestBed.tick();
    await vi.waitFor(() => {
      expect(service.status()).toBe('ready');
    });
    stammdatenLadeserviceMock.loadStammdaten.mockClear();
    stammdatenLadeserviceMock.reset.mockClear();

    const zweitesProfil = { ...profil, anzeigename: 'Zweiter Benutzer' };
    benutzerId.set('benutzer-2');
    benutzerProfil.set(zweitesProfil);
    TestBed.tick();

    await vi.waitFor(() => {
      expect(stammdatenLadeserviceMock.loadStammdaten).toHaveBeenCalledWith(
        'benutzer-2',
        zweitesProfil,
      );
      expect(service.status()).toBe('ready');
    });
    expect(stammdatenLadeserviceMock.reset).toHaveBeenCalled();
  });

  function setAktivesProfil(wert: IBenutzerProfilDokument = profil): void {
    benutzerId.set('benutzer-1');
    isAuthenticated.set(true);
    benutzerProfil.set(wert);
  }
});
