// pur-system/src/app/guards/verwaltung.guard.spec.ts

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { IBenutzerProfilDokument } from '../commons/models/domain/benutzer';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { verwaltungGuard } from './verwaltung.guard';

describe('verwaltungGuard', () => {
  let benutzerProfil: WritableSignal<IBenutzerProfilDokument | null>;
  let benutzerStoreMock: {
    benutzerProfil: WritableSignal<IBenutzerProfilDokument | null>;
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

  it.each(['office', 'master'] as const)('should allow an active %s user', async (userRole) => {
    benutzerProfil.set({ ...profil, userRole });

    const result = await TestBed.runInInjectionContext(() =>
      verwaltungGuard({} as never, {} as never),
    );

    expect(result).toBe(true);
  });

  it('should redirect a branch user to dashboard', async () => {
    const dashboardUrlTree = {} as UrlTree;
    benutzerProfil.set({
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

  it('should redirect to login when no user is signed in', async () => {
    const loginUrlTree = {} as UrlTree;
    benutzerProfil.set(null);
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      verwaltungGuard({} as never, {} as never),
    );

    expect(result).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect an inactive user to login', async () => {
    const loginUrlTree = {} as UrlTree;
    benutzerProfil.set({ ...profil, aktiv: false });
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      verwaltungGuard({} as never, {} as never),
    );

    expect(result).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
