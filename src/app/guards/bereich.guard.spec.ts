// pur-system/src/app/guards/bereich.guard.spec.ts

import { User } from '@angular/fire/auth';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../services/firebase/auth.service';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { bereichGuard } from './bereich.guard';

describe('bereichGuard', () => {
  let authServiceMock: {
    getAuthState: ReturnType<typeof vi.fn>;
  };
  let benutzerStoreMock: {
    loadBenutzerProfil: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      getAuthState: vi.fn(),
    };
    benutzerStoreMock = {
      loadBenutzerProfil: vi.fn(),
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

  it('should allow access to an area listed in the user profile', async () => {
    authServiceMock.getAuthState.mockReturnValue(of({ uid: 'benutzer-123' } as User));
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({
      email: 'test@example.com',
      anzeigename: 'Test',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard'],
      zugriffe: {},
    });

    const result = await TestBed.runInInjectionContext(() =>
      bereichGuard(
        { data: { bereich: 'dashboard' } } as unknown as ActivatedRouteSnapshot,
        {} as never,
      ),
    );

    expect(result).toBe(true);
    expect(benutzerStoreMock.loadBenutzerProfil).toHaveBeenCalledWith('benutzer-123');
  });

  it('should request the profile through the user store', async () => {
    authServiceMock.getAuthState.mockReturnValue(of({ uid: 'benutzer-123' } as User));
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({
      email: 'test@example.com',
      anzeigename: 'Test',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard'],
      zugriffe: {},
    });

    const result = await TestBed.runInInjectionContext(() =>
      bereichGuard(
        { data: { bereich: 'dashboard' } } as unknown as ActivatedRouteSnapshot,
        {} as never,
      ),
    );

    expect(result).toBe(true);
    expect(benutzerStoreMock.loadBenutzerProfil).toHaveBeenCalledOnce();
  });

  it('should redirect to dashboard when the area is not listed in the user profile', async () => {
    const dashboardUrlTree = {} as UrlTree;
    authServiceMock.getAuthState.mockReturnValue(of({ uid: 'benutzer-123' } as User));
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({
      email: 'test@example.com',
      anzeigename: 'Test',
      aktiv: true,
      userRole: 'filiale',
      erlaubteBereiche: ['dashboard'],
      zugriffe: {},
    });
    routerMock.createUrlTree.mockReturnValue(dashboardUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      bereichGuard(
        { data: { bereich: 'mitarbeiter' } } as unknown as ActivatedRouteSnapshot,
        {} as never,
      ),
    );

    expect(result).toBe(dashboardUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should redirect to the first allowed area when dashboard is not allowed', async () => {
    const schichtplanUrlTree = {} as UrlTree;
    authServiceMock.getAuthState.mockReturnValue(of({ uid: 'benutzer-123' } as User));
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({
      email: 'mitarbeiter@example.com',
      anzeigename: 'Mitarbeiter',
      aktiv: true,
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['schichtplan'],
      zugriffe: {},
    });
    routerMock.createUrlTree.mockReturnValue(schichtplanUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      bereichGuard(
        { data: { bereich: 'dashboard' } } as unknown as ActivatedRouteSnapshot,
        {} as never,
      ),
    );

    expect(result).toBe(schichtplanUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/schichtplan']);
  });

  it('should redirect to login when no user is signed in', async () => {
    const loginUrlTree = {} as UrlTree;
    authServiceMock.getAuthState.mockReturnValue(of(null));
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      bereichGuard(
        { data: { bereich: 'dashboard' } } as unknown as ActivatedRouteSnapshot,
        {} as never,
      ),
    );

    expect(result).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect to login when the user profile is inactive', async () => {
    const loginUrlTree = {} as UrlTree;
    authServiceMock.getAuthState.mockReturnValue(of({ uid: 'benutzer-123' } as User));
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({
      email: 'test@example.com',
      anzeigename: 'Test',
      aktiv: false,
      userRole: 'office',
      erlaubteBereiche: [],
      zugriffe: {},
    });
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      bereichGuard(
        { data: { bereich: 'dashboard' } } as unknown as ActivatedRouteSnapshot,
        {} as never,
      ),
    );

    expect(result).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
