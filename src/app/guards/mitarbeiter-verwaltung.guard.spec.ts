// pur-system/src/app/guards/mitarbeiter-verwaltung.guard.spec.ts

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { IBenutzerProfilDokument } from '../commons/models/domain/benutzer';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { mitarbeiterVerwaltungGuard } from './mitarbeiter-verwaltung.guard';

describe('mitarbeiterVerwaltungGuard', () => {
  let profil: IBenutzerProfilDokument;
  let benutzerProfil: WritableSignal<IBenutzerProfilDokument | null>;
  let benutzerStoreMock: { benutzerProfil: WritableSignal<IBenutzerProfilDokument | null> };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    profil = {
      email: 'office@example.com',
      anzeigename: 'Office',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard', 'mitarbeiter'],
      zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
    };
    benutzerProfil = signal(profil);
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

  it.each(['office', 'filiale'] as const)(
    'should allow an assigned active %s user',
    async (userRole) => {
      benutzerProfil.set({ ...profil, userRole });

      const result = await TestBed.runInInjectionContext(() => {
        return mitarbeiterVerwaltungGuard({} as never, {} as never);
      });

      expect(result).toBe(true);
    },
  );

  it('should allow an active master with the assigned app area', async () => {
    benutzerProfil.set({
      ...profil,
      userRole: 'master',
      zugriffe: {},
    });

    const result = await TestBed.runInInjectionContext(() => {
      return mitarbeiterVerwaltungGuard({} as never, {} as never);
    });

    expect(result).toBe(true);
  });

  it('should redirect the employee role to dashboard', async () => {
    const dashboardUrlTree = {} as UrlTree;
    benutzerProfil.set({ ...profil, userRole: 'mitarbeiter' });
    routerMock.createUrlTree.mockReturnValue(dashboardUrlTree);

    const result = await TestBed.runInInjectionContext(() => {
      return mitarbeiterVerwaltungGuard({} as never, {} as never);
    });

    expect(result).toBe(dashboardUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should reject an incomplete data scope without redirecting back to employees', async () => {
    const loginUrlTree = {} as UrlTree;
    benutzerProfil.set({
      ...profil,
      erlaubteBereiche: ['mitarbeiter'],
      zugriffe: { 'u-1': { 'f-1': [] } },
    });
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    const result = await TestBed.runInInjectionContext(() => {
      return mitarbeiterVerwaltungGuard({} as never, {} as never);
    });

    expect(result).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect unauthenticated and inactive users to login', async () => {
    const loginUrlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);
    benutzerProfil.set(null);

    const unauthenticatedResult = await TestBed.runInInjectionContext(() => {
      return mitarbeiterVerwaltungGuard({} as never, {} as never);
    });

    benutzerProfil.set({ ...profil, aktiv: false });
    const inactiveResult = await TestBed.runInInjectionContext(() => {
      return mitarbeiterVerwaltungGuard({} as never, {} as never);
    });

    expect(unauthenticatedResult).toBe(loginUrlTree);
    expect(inactiveResult).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
