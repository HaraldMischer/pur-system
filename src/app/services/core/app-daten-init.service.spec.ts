// pur-system/src/app/services/core/app-daten-init.service.spec.ts

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IBenutzerProfilDokument } from '../../commons/models/domain/benutzer';
import { IUnternehmerEintrag } from '../../commons/models/domain/unternehmer';
import { StammdatenStore } from '../../stores/app/stammdaten.store';
import { MitarbeiterStore } from '../../stores/domain/mitarbeiter.store';
import { MitarbeiterService } from '../domain/mitarbeiter.service';
import { DebugLogService } from './debug-log.service';
import { AppDatenInitService } from './app-daten-init.service';

describe('AppDatenInitService', () => {
  let unternehmer: WritableSignal<readonly IUnternehmerEintrag[]>;
  let stammdatenStoreMock: {
    unternehmer: WritableSignal<readonly IUnternehmerEintrag[]>;
    getFirmen: ReturnType<typeof vi.fn>;
    loadFilialenNachIds: ReturnType<typeof vi.fn>;
    loadStammdaten: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    snapshot: ReturnType<typeof vi.fn>;
  };
  let mitarbeiterStoreMock: {
    getMitarbeiter: ReturnType<typeof vi.fn>;
    getMitarbeiterNachFilialen: ReturnType<typeof vi.fn>;
    loadMitarbeiter: ReturnType<typeof vi.fn>;
    loadMitarbeiterNachFilialen: ReturnType<typeof vi.fn>;
    resetMitarbeiter: ReturnType<typeof vi.fn>;
  };
  let mitarbeiterServiceMock: {
    loadMitarbeiterEintrag: ReturnType<typeof vi.fn>;
  };
  let debugLogServiceMock: {
    logDatenflussTitel: ReturnType<typeof vi.fn>;
    logDatenGeladen: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    unternehmer = signal([{ id: 'u-1', nummer: 1, anzeigename: 'Unternehmer 1' }]);
    stammdatenStoreMock = {
      unternehmer,
      getFirmen: vi.fn().mockReturnValue([
        { id: 'f-2', nummer: 2, anzeigename: 'Firma 2' },
        { id: 'f-1', nummer: 1, anzeigename: 'Firma 1' },
      ]),
      loadFilialenNachIds: vi.fn().mockResolvedValue(undefined),
      loadStammdaten: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
      snapshot: vi.fn().mockReturnValue({
        benutzerId: 'benutzer-1',
        unternehmer: unternehmer(),
        firmenNachUnternehmer: {
          'u-1': [
            { id: 'f-1', nummer: 1, anzeigename: 'Firma 1' },
            { id: 'f-2', nummer: 2, anzeigename: 'Firma 2' },
          ],
        },
        filialenNachFirma: {
          'u-1': {
            'f-1': [{ id: 'b-1', nummer: 1, anzeigename: 'Filiale 1' }],
            'f-2': [{ id: 'b-2', nummer: 2, anzeigename: 'Filiale 2' }],
          },
        },
        benutzerprofile: [{ uid: 'profil-1' }],
        download: false,
        isLoaded: true,
        error: null,
      }),
    };
    mitarbeiterStoreMock = {
      getMitarbeiter: vi.fn().mockReturnValue([]),
      getMitarbeiterNachFilialen: vi.fn().mockReturnValue([{}, {}]),
      loadMitarbeiter: vi.fn().mockResolvedValue(undefined),
      loadMitarbeiterNachFilialen: vi.fn().mockResolvedValue(undefined),
      resetMitarbeiter: vi.fn(),
    };
    mitarbeiterServiceMock = {
      loadMitarbeiterEintrag: vi.fn().mockResolvedValue({
        id: 'mitarbeiter-dokument-1',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        person: {
          vorname: 'Harry',
          nachname: 'Mischer',
          adresse: {
            strasse: 'Musterstraße',
            hausnummer: '1',
            postleitzahl: '12345',
            ort: 'Musterstadt',
          },
          kontakt: {},
        },
        rolle: 'service',
        filialIds: ['b-2', 'b-1'],
        aktiv: true,
      }),
    };
    debugLogServiceMock = {
      logDatenflussTitel: vi.fn(),
      logDatenGeladen: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AppDatenInitService,
        { provide: StammdatenStore, useValue: stammdatenStoreMock },
        { provide: MitarbeiterStore, useValue: mitarbeiterStoreMock },
        { provide: MitarbeiterService, useValue: mitarbeiterServiceMock },
        { provide: DebugLogService, useValue: debugLogServiceMock },
      ],
    });
  });

  it('should load all structure, profiles and employees for a master', async () => {
    let resolveStammdaten!: () => void;
    stammdatenStoreMock.loadStammdaten.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveStammdaten = resolve;
      }),
    );
    const service = TestBed.inject(AppDatenInitService);

    const pending = service.loadStammdaten('master-1', createProfil('master', {}));

    expect(stammdatenStoreMock.loadStammdaten).toHaveBeenCalledWith('master-1', {
      alleStrukturdaten: true,
      zugriffe: {},
      benutzerprofile: true,
      lesestrategie: 'networkOnly',
    });
    expect(mitarbeiterStoreMock.loadMitarbeiter).not.toHaveBeenCalled();

    resolveStammdaten();
    await pending;

    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledTimes(2);
    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      undefined,
      'networkOnly',
    );
    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith(
      'u-1',
      'f-2',
      undefined,
      'networkOnly',
    );
    expect(debugLogServiceMock.logDatenflussTitel.mock.calls).toEqual([
      ['2. STAMMDATEN '],
      ['STAMMDATEN VOLLSTÄNDIG GELADEN '],
    ]);
    expect(debugLogServiceMock.logDatenGeladen.mock.calls).toEqual([
      ['Benutzerprofile', 1],
      ['Unternehmer', 1],
      ['Firmen', 2],
      ['Filialen', 2],
      ['Mitarbeiter | Firma 1', 0],
      ['Mitarbeiter | Firma 2', 0],
    ]);
  });

  it('should load assigned structure before all company employees for an office', async () => {
    let resolveStammdaten!: () => void;
    stammdatenStoreMock.loadStammdaten.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveStammdaten = resolve;
      }),
    );
    const zugriffe = {
      'u-1': {
        'f-1': ['b-1'],
        'f-2': ['b-2', 'b-3'],
      },
    };
    const service = TestBed.inject(AppDatenInitService);

    const pending = service.loadStammdaten('office-1', createProfil('office', zugriffe));

    expect(stammdatenStoreMock.loadStammdaten).toHaveBeenCalledWith('office-1', {
      alleStrukturdaten: false,
      zugriffe,
      benutzerprofile: false,
      lesestrategie: 'networkOnly',
    });
    expect(mitarbeiterStoreMock.loadMitarbeiter).not.toHaveBeenCalled();

    resolveStammdaten();
    await pending;

    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      undefined,
      'networkOnly',
    );
    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith(
      'u-1',
      'f-2',
      undefined,
      'networkOnly',
    );
  });

  it('should load only branch employees for a branch profile', async () => {
    const zugriffe = { 'u-1': { 'f-1': ['b-1'] } };
    const service = TestBed.inject(AppDatenInitService);

    await service.loadStammdaten('filiale-1', createProfil('filiale', zugriffe));

    expect(stammdatenStoreMock.loadStammdaten).toHaveBeenCalledWith('filiale-1', {
      alleStrukturdaten: false,
      zugriffe,
      benutzerprofile: false,
      lesestrategie: 'networkOnly',
    });
    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledOnce();
    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      'b-1',
      'networkOnly',
    );
    expect(stammdatenStoreMock.loadStammdaten.mock.invocationCallOrder[0]).toBeLessThan(
      mitarbeiterStoreMock.loadMitarbeiter.mock.invocationCallOrder[0],
    );
  });

  it('should load only employees of the assigned branches for an employee profile', async () => {
    const zugriffe = { 'u-1': { 'f-1': [] } };
    const service = TestBed.inject(AppDatenInitService);

    await service.loadStammdaten(
      'mitarbeiter-1',
      createProfil('mitarbeiter', zugriffe, 'mitarbeiter-dokument-1'),
    );

    expect(stammdatenStoreMock.loadStammdaten).toHaveBeenCalledWith('mitarbeiter-1', {
      alleStrukturdaten: false,
      zugriffe,
      benutzerprofile: false,
      lesestrategie: 'networkOnly',
    });
    expect(mitarbeiterServiceMock.loadMitarbeiterEintrag).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      'mitarbeiter-dokument-1',
      'networkOnly',
    );
    expect(mitarbeiterStoreMock.loadMitarbeiter).not.toHaveBeenCalled();
    expect(mitarbeiterStoreMock.loadMitarbeiterNachFilialen).toHaveBeenCalledOnce();
    expect(mitarbeiterStoreMock.loadMitarbeiterNachFilialen).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      ['b-2', 'b-1'],
      'networkOnly',
    );
    expect(stammdatenStoreMock.loadFilialenNachIds).toHaveBeenCalledWith(
      'mitarbeiter-1',
      'u-1',
      'f-1',
      ['b-2', 'b-1'],
      'networkOnly',
    );
    expect(stammdatenStoreMock.loadStammdaten.mock.invocationCallOrder[0]).toBeLessThan(
      mitarbeiterServiceMock.loadMitarbeiterEintrag.mock.invocationCallOrder[0],
    );
    expect(mitarbeiterServiceMock.loadMitarbeiterEintrag.mock.invocationCallOrder[0]).toBeLessThan(
      stammdatenStoreMock.loadFilialenNachIds.mock.invocationCallOrder[0],
    );
    expect(stammdatenStoreMock.loadFilialenNachIds.mock.invocationCallOrder[0]).toBeLessThan(
      mitarbeiterStoreMock.loadMitarbeiterNachFilialen.mock.invocationCallOrder[0],
    );
    expect(debugLogServiceMock.logDatenGeladen.mock.calls).toEqual([
      ['Unternehmer', 1],
      ['Firmen', 2],
      ['Filialen', 2],
      ['Mitarbeiter | Firma 1', 2],
    ]);
  });

  it.each([null, { aktiv: false }])(
    'should reject an employee profile without an active employee document',
    async (mitarbeiter) => {
      mitarbeiterServiceMock.loadMitarbeiterEintrag.mockResolvedValue(mitarbeiter);
      const service = TestBed.inject(AppDatenInitService);

      await expect(
        service.loadStammdaten(
          'mitarbeiter-1',
          createProfil('mitarbeiter', { 'u-1': { 'f-1': [] } }, 'mitarbeiter-dokument-1'),
        ),
      ).rejects.toEqual({ code: 'app/invalid-user-profile' });

      expect(stammdatenStoreMock.loadFilialenNachIds).not.toHaveBeenCalled();
      expect(mitarbeiterStoreMock.loadMitarbeiter).not.toHaveBeenCalled();
      expect(mitarbeiterStoreMock.loadMitarbeiterNachFilialen).not.toHaveBeenCalled();
    },
  );

  it('should propagate an error while loading the own employee document', async () => {
    const error = { code: 'unavailable' };
    mitarbeiterServiceMock.loadMitarbeiterEintrag.mockRejectedValue(error);
    const service = TestBed.inject(AppDatenInitService);

    await expect(
      service.loadStammdaten(
        'mitarbeiter-1',
        createProfil('mitarbeiter', { 'u-1': { 'f-1': [] } }, 'mitarbeiter-dokument-1'),
      ),
    ).rejects.toBe(error);

    expect(stammdatenStoreMock.loadFilialenNachIds).not.toHaveBeenCalled();
    expect(mitarbeiterStoreMock.loadMitarbeiter).not.toHaveBeenCalled();
    expect(mitarbeiterStoreMock.loadMitarbeiterNachFilialen).not.toHaveBeenCalled();
  });

  it('should pass an explicitly selected strategy to every required store', async () => {
    const zugriffe = { 'u-1': { 'f-1': ['b-1'] } };
    const service = TestBed.inject(AppDatenInitService);

    await service.loadStammdaten('office-1', createProfil('office', zugriffe), 'cacheOnly');

    expect(stammdatenStoreMock.loadStammdaten).toHaveBeenCalledWith('office-1', {
      alleStrukturdaten: false,
      zugriffe,
      benutzerprofile: false,
      lesestrategie: 'cacheOnly',
    });
    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      undefined,
      'cacheOnly',
    );
  });

  it.each([
    createProfil('office', {}),
    createProfil('office', { 'u-1': {} }),
    createProfil('filiale', { 'u-1': { 'f-1': [] } }),
    createProfil('filiale', {
      'u-1': { 'f-1': ['b-1'] },
      'u-2': {},
    }),
    createProfil('mitarbeiter', { 'u-1': { 'f-1': [] } }),
    createProfil('mitarbeiter', { 'u-1': { 'f-1': ['b-1'] } }, 'm-1'),
    {
      ...createProfil('master', {}),
      userRole: 'unbekannt' as IBenutzerProfilDokument['userRole'],
    },
  ])('should reject invalid profile assignments for $userRole', async (profil) => {
    const service = TestBed.inject(AppDatenInitService);

    await expect(service.loadStammdaten('benutzer-1', profil)).rejects.toEqual({
      code: 'app/invalid-user-profile',
    });

    expect(stammdatenStoreMock.loadStammdaten).not.toHaveBeenCalled();
    expect(mitarbeiterStoreMock.loadMitarbeiter).not.toHaveBeenCalled();
    expect(mitarbeiterStoreMock.loadMitarbeiterNachFilialen).not.toHaveBeenCalled();
  });

  it('should propagate a required employee loading error', async () => {
    mitarbeiterStoreMock.loadMitarbeiter.mockRejectedValue({ code: 'unavailable' });
    const service = TestBed.inject(AppDatenInitService);

    await expect(
      service.loadStammdaten('office-1', createProfil('office', { 'u-1': { 'f-1': ['b-1'] } })),
    ).rejects.toEqual({ code: 'unavailable' });
  });

  it('should reset all stores managed by the loading service', () => {
    const service = TestBed.inject(AppDatenInitService);

    service.reset();

    expect(stammdatenStoreMock.reset).toHaveBeenCalledOnce();
    expect(mitarbeiterStoreMock.resetMitarbeiter).toHaveBeenCalledOnce();
  });

  function createProfil(
    userRole: IBenutzerProfilDokument['userRole'],
    zugriffe: IBenutzerProfilDokument['zugriffe'],
    firmaMitarbeiterId?: string,
  ): IBenutzerProfilDokument {
    return {
      email: `${userRole}@example.com`,
      anzeigename: userRole,
      aktiv: true,
      userRole,
      erlaubteBereiche: ['dashboard'],
      zugriffe,
      ...(firmaMitarbeiterId ? { firmaMitarbeiterId } : {}),
    };
  }
});
