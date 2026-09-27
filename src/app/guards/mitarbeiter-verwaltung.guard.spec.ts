// pur-system/src/app/guards/mitarbeiter-verwaltung.guard.spec.ts

import { User } from '@angular/fire/auth';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';

import { IBenutzerProfilDokument } from '../commons/models/domain/benutzer';
import { AuthService } from '../services/firebase/auth.service';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { mitarbeiterVerwaltungGuard } from './mitarbeiter-verwaltung.guard';

describe('mitarbeiterVerwaltungGuard', () => {
  let profil: IBenutzerProfilDokument;
  let authServiceMock: { getAuthState: ReturnType<typeof vi.fn> };
  let benutzerStoreMock: { loadBenutzerProfil: ReturnType<typeof vi.fn> };
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
    authServiceMock = {
      getAuthState: vi.fn().mockReturnValue(of({ uid: 'office-1' } as User)),
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

  it.each(['office', 'filiale'] as const)(
    'should allow an assigned active %s user',
    async (userRole) => {
      benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({ ...profil, userRole });

      const result = await TestBed.runInInjectionContext(() => {
        return mitarbeiterVerwaltungGuard({} as never, {} as never);
      });

      expect(result).toBe(true);
    },
  );

  it('should allow an active master with the assigned app area', async () => {
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({
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
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({ ...profil, userRole: 'mitarbeiter' });
    routerMock.createUrlTree.mockReturnValue(dashboardUrlTree);

    const result = await TestBed.runInInjectionContext(() => {
      return mitarbeiterVerwaltungGuard({} as never, {} as never);
    });

    expect(result).toBe(dashboardUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should reject an incomplete data scope without redirecting back to employees', async () => {
    const loginUrlTree = {} as UrlTree;
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValue({
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
    authServiceMock.getAuthState.mockReturnValueOnce(of(null));

    const unauthenticatedResult = await TestBed.runInInjectionContext(() => {
      return mitarbeiterVerwaltungGuard({} as never, {} as never);
    });

    authServiceMock.getAuthState.mockReturnValueOnce(of({ uid: 'office-1' } as User));
    benutzerStoreMock.loadBenutzerProfil.mockResolvedValueOnce({ ...profil, aktiv: false });
    const inactiveResult = await TestBed.runInInjectionContext(() => {
      return mitarbeiterVerwaltungGuard({} as never, {} as never);
    });

    expect(unauthenticatedResult).toBe(loginUrlTree);
    expect(inactiveResult).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
