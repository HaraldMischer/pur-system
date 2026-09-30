// pur-system/src/app/guards/initialisierung.guard.ts

import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { filter, take } from 'rxjs';

import { AppSitzungsInitService } from '../services/core/app-sitzungs-init.service';
import { BenutzerStore } from '../stores/app/benutzer.store';

type TInitialisierungsentscheidung = true | UrlTree | null;

export const initialisierungGuard: CanActivateFn = (_route, state) => {
  const appSitzungsInitService = inject(AppSitzungsInitService);
  const benutzerStore = inject(BenutzerStore);
  const router = inject(Router);
  const entscheidung = computed<TInitialisierungsentscheidung>(() => {
    if (benutzerStore.istInaktiv()) {
      return router.createUrlTree(['/login']);
    }
    if (appSitzungsInitService.status() === 'error') {
      return router.createUrlTree(['/initialisierungsfehler'], {
        queryParams: { returnUrl: state.url },
      });
    }
    if (appSitzungsInitService.status() === 'ready') {
      return true;
    }
    return null;
  });

  return toObservable(entscheidung).pipe(
    filter((wert): wert is true | UrlTree => {
      return wert !== null;
    }),
    take(1),
  );
};
