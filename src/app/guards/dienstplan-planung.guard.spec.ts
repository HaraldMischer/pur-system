// pur-system/src/app/guards/dienstplan-planung.guard.spec.ts

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { IBenutzerProfilDokument } from '../commons/models/domain/benutzer';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { dienstplanPlanungGuard } from './dienstplan-planung.guard';

describe('dienstplanPlanungGuard', () => {
  let benutzerProfil: WritableSignal<IBenutzerProfilDokument | null>;
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };
  let profil: IBenutzerProfilDokument;

  beforeEach(() => {
    profil = {
      email: 'test@example.com',
      anzeigename: 'Test',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['schichtplan'],
      zugriffe: {},
    };
    benutzerProfil = signal(profil);
    routerMock = { createUrlTree: vi.fn().mockReturnValue({} as UrlTree) };
    TestBed.configureTestingModule({
      providers: [
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it.each(['master', 'office'] as const)('should allow an active %s account', async (userRole) => {
    benutzerProfil.set({ ...profil, userRole });

    const result = await TestBed.runInInjectionContext(() => {
      return dienstplanPlanungGuard({} as never, {} as never);
    });

    expect(result).toBe(true);
  });

  it.each(['filiale', 'mitarbeiter'] as const)(
    'should redirect an active %s account to the view',
    async (userRole) => {
      const ansichtUrlTree = {} as UrlTree;
      benutzerProfil.set({ ...profil, userRole });
      routerMock.createUrlTree.mockReturnValue(ansichtUrlTree);

      const result = await TestBed.runInInjectionContext(() => {
        return dienstplanPlanungGuard({} as never, {} as never);
      });

      expect(result).toBe(ansichtUrlTree);
      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/schichtplan/ansicht']);
    },
  );

  it('should redirect an inactive account to login', async () => {
    const loginUrlTree = {} as UrlTree;
    benutzerProfil.set({ ...profil, aktiv: false });
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    const result = await TestBed.runInInjectionContext(() => {
      return dienstplanPlanungGuard({} as never, {} as never);
    });

    expect(result).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
