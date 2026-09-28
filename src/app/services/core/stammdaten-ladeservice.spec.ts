// pur-system/src/app/services/core/stammdaten-ladeservice.spec.ts

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IBenutzerProfilDokument } from '../../commons/models/domain/benutzer';
import { IUnternehmerEintrag } from '../../commons/models/domain/unternehmer';
import { StammdatenStore } from '../../stores/app/stammdaten.store';
import { MitarbeiterStore } from '../../stores/domain/mitarbeiter.store';
import { StammdatenLadeservice } from './stammdaten-ladeservice';

describe('StammdatenLadeservice', () => {
  let unternehmer: WritableSignal<readonly IUnternehmerEintrag[]>;
  let stammdatenStoreMock: {
    unternehmer: WritableSignal<readonly IUnternehmerEintrag[]>;
    getFirmen: ReturnType<typeof vi.fn>;
    loadStammdaten: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let mitarbeiterStoreMock: {
    loadMitarbeiter: ReturnType<typeof vi.fn>;
    resetMitarbeiter: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    unternehmer = signal([{ id: 'u-1', nummer: 1, anzeigename: 'Unternehmer 1' }]);
    stammdatenStoreMock = {
      unternehmer,
      getFirmen: vi.fn().mockReturnValue([
        { id: 'f-1', nummer: 1, anzeigename: 'Firma 1' },
        { id: 'f-2', nummer: 2, anzeigename: 'Firma 2' },
      ]),
      loadStammdaten: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
    };
    mitarbeiterStoreMock = {
      loadMitarbeiter: vi.fn().mockResolvedValue(undefined),
      resetMitarbeiter: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        StammdatenLadeservice,
        { provide: StammdatenStore, useValue: stammdatenStoreMock },
        { provide: MitarbeiterStore, useValue: mitarbeiterStoreMock },
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
    const service = TestBed.inject(StammdatenLadeservice);

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
  });

  it('should load assigned structure and all company employees for an office in parallel', async () => {
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
    const service = TestBed.inject(StammdatenLadeservice);

    const pending = service.loadStammdaten('office-1', createProfil('office', zugriffe));

    expect(stammdatenStoreMock.loadStammdaten).toHaveBeenCalledWith('office-1', {
      alleStrukturdaten: false,
      zugriffe,
      benutzerprofile: false,
      lesestrategie: 'networkOnly',
    });
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

    resolveStammdaten();
    await pending;
  });

  it('should load only branch employees for a branch profile', async () => {
    const zugriffe = { 'u-1': { 'f-1': ['b-1'] } };
    const service = TestBed.inject(StammdatenLadeservice);

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
  });

  it('should load all company employees for an employee profile', async () => {
    const zugriffe = { 'u-1': { 'f-1': [] } };
    const service = TestBed.inject(StammdatenLadeservice);

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
    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledOnce();
    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      undefined,
      'networkOnly',
    );
  });

  it('should pass an explicitly selected strategy to every required store', async () => {
    const zugriffe = { 'u-1': { 'f-1': ['b-1'] } };
    const service = TestBed.inject(StammdatenLadeservice);

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
    const service = TestBed.inject(StammdatenLadeservice);

    await expect(service.loadStammdaten('benutzer-1', profil)).rejects.toEqual({
      code: 'app/invalid-user-profile',
    });

    expect(stammdatenStoreMock.loadStammdaten).not.toHaveBeenCalled();
    expect(mitarbeiterStoreMock.loadMitarbeiter).not.toHaveBeenCalled();
  });

  it('should propagate a required employee loading error', async () => {
    mitarbeiterStoreMock.loadMitarbeiter.mockRejectedValue({ code: 'unavailable' });
    const service = TestBed.inject(StammdatenLadeservice);

    await expect(
      service.loadStammdaten('office-1', createProfil('office', { 'u-1': { 'f-1': ['b-1'] } })),
    ).rejects.toEqual({ code: 'unavailable' });
  });

  it('should reset all stores managed by the loading service', () => {
    const service = TestBed.inject(StammdatenLadeservice);

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
