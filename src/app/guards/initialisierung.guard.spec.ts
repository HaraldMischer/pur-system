// pur-system/src/app/guards/initialisierung.guard.spec.ts

import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { TAppInitialisierungsstatus } from '../commons/models/app/app-initialisierung.types';
import { AppSitzungsInitService } from '../services/core/app-sitzungs-init.service';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { initialisierungGuard } from './initialisierung.guard';

describe('initialisierungGuard', () => {
  let status: WritableSignal<TAppInitialisierungsstatus>;
  let istInaktiv: WritableSignal<boolean>;
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    status = signal<TAppInitialisierungsstatus>('idle');
    istInaktiv = signal(false);
    routerMock = {
      createUrlTree: vi.fn().mockReturnValue({} as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppSitzungsInitService,
          useValue: { status },
        },
        {
          provide: BenutzerStore,
          useValue: { istInaktiv },
        },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should wait during idle and loading before allowing a ready session', async () => {
    const resultPromise = runGuard('/verwaltung');
    let abgeschlossen = false;
    void resultPromise.then(() => {
      abgeschlossen = true;
    });

    await Promise.resolve();
    expect(abgeschlossen).toBe(false);
    status.set('loading');
    TestBed.tick();
    await Promise.resolve();
    expect(abgeschlossen).toBe(false);

    status.set('ready');
    TestBed.tick();

    await expect(resultPromise).resolves.toBe(true);
  });

  it('should redirect an initialization error and preserve the requested URL', async () => {
    const fehlerUrlTree = {} as UrlTree;
    status.set('error');
    routerMock.createUrlTree.mockReturnValue(fehlerUrlTree);

    await expect(runGuard('/mitarbeiter/liste?filter=aktiv')).resolves.toBe(fehlerUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/initialisierungsfehler'], {
      queryParams: { returnUrl: '/mitarbeiter/liste?filter=aktiv' },
    });
  });

  it('should redirect an inactive profile to login without waiting for ready', async () => {
    const loginUrlTree = {} as UrlTree;
    istInaktiv.set(true);
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    await expect(runGuard('/dashboard')).resolves.toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  function runGuard(url: string): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() => {
      return initialisierungGuard({} as never, { url } as RouterStateSnapshot);
    });

    return firstValueFrom(result as Observable<boolean | UrlTree>);
  }
});
