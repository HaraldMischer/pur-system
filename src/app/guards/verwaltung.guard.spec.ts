// pur-system/src/app/guards/verwaltung.guard.spec.ts

import { User } from '@angular/fire/auth';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';

import { IBenutzerProfilDokument } from '../commons/models/domain/benutzer';
import { AuthService } from '../services/firebase/auth.service';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { verwaltungGuard } from './verwaltung.guard';

describe('verwaltungGuard', () => {
  let authServiceMock: {
    getAuthState: ReturnType<typeof vi.fn>;
  };
  let benutzerStoreMock: {
    loadBenutzerProfil: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };
  let profil: IBenutzerProfilDokument;

  beforeEach(() => {
    profil = {
      email: 'test@example.com',
      anzeigename: 'Test',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['verwaltung'],
      zugriffe: {},
    };
    authServiceMock = {
      getAuthState: vi.fn().mockReturnValue(of({ uid: 'benutzer-123' } as User)),
    };
    benutzerStoreMock = {
      loadBenutzerProfil: vi.fn().mockResolvedValue(profil),
    };
    routerMock = {
      createUrlTree: vi.fn().mockReturnValue({} as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: BenutzerStore, useValue: benutzerStoreMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it.each(['office', 'master'] as const)('should allow an active %s user', async (userRole) => {
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({ ...profil, userRole });

    const result = await TestBed.runInInjectionContext(() =>
      verwaltungGuard({} as never, {} as never),
    );

    expect(result).toBe(true);
  });

  it('should redirect a branch user to dashboard', async () => {
    const dashboardUrlTree = {} as UrlTree;
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({
      ...profil,
      userRole: 'filiale',
      erlaubteBereiche: ['dashboard', 'verwaltung'],
    });
    routerMock.createUrlTree.mockReturnValue(dashboardUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      verwaltungGuard({} as never, {} as never),
    );

    expect(result).toBe(dashboardUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should redirect a branch user without dashboard to an allowed area', async () => {
    const schichtplanUrlTree = {} as UrlTree;
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({
      ...profil,
      userRole: 'filiale',
      erlaubteBereiche: ['verwaltung', 'schichtplan'],
    });
    routerMock.createUrlTree.mockReturnValue(schichtplanUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      verwaltungGuard({} as never, {} as never),
    );

    expect(result).toBe(schichtplanUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/schichtplan']);
  });

  it('should redirect to login when no user is signed in', async () => {
    const loginUrlTree = {} as UrlTree;
    authServiceMock.getAuthState.mockReturnValue(of(null));
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      verwaltungGuard({} as never, {} as never),
    );

    expect(result).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect an inactive user to login', async () => {
    const loginUrlTree = {} as UrlTree;
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({ ...profil, aktiv: false });
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      verwaltungGuard({} as never, {} as never),
    );

    expect(result).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
