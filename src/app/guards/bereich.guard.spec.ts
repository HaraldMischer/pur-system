// pur-system/src/app/guards/bereich.guard.spec.ts

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

import { IBenutzerProfilDokument } from '../commons/models/domain/benutzer';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { bereichGuard } from './bereich.guard';

describe('bereichGuard', () => {
  let benutzerProfil: WritableSignal<IBenutzerProfilDokument | null>;
  let benutzerStoreMock: {
    benutzerProfil: WritableSignal<IBenutzerProfilDokument | null>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    benutzerProfil = signal({
      email: 'test@example.com',
      anzeigename: 'Test',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard'],
      zugriffe: {},
    });
    benutzerStoreMock = {
      benutzerProfil,
    };
    routerMock = {
      createUrlTree: vi.fn().mockReturnValue({} as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: BenutzerStore, useValue: benutzerStoreMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow access to an area listed in the user profile', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      bereichGuard(
        { data: { bereich: 'dashboard' } } as unknown as ActivatedRouteSnapshot,
        {} as never,
      ),
    );

    expect(result).toBe(true);
  });

  it('should use the profile already loaded by the initialization', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      bereichGuard(
        { data: { bereich: 'dashboard' } } as unknown as ActivatedRouteSnapshot,
        {} as never,
      ),
    );

    expect(result).toBe(true);
  });

  it('should redirect to dashboard when the area is not listed in the user profile', async () => {
    const dashboardUrlTree = {} as UrlTree;
    benutzerProfil.set({
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
    benutzerProfil.set({
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
    benutzerProfil.set(null);
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
    benutzerProfil.set({
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
