// pur-system/src/app/guards/master.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { BenutzerStore } from '../stores/app/benutzer.store';
import { getErlaubteStartRoute } from './guard-navigation';

export const masterGuard: CanActivateFn = () => {
  const benutzerStore = inject(BenutzerStore);
  const router = inject(Router);
  const benutzerProfil = benutzerStore.benutzerProfil();

  if (!benutzerProfil?.aktiv) {
    return router.createUrlTree(['/login']);
  }

  return (
    benutzerProfil.userRole === 'master' ||
    router.createUrlTree([getErlaubteStartRoute(benutzerProfil) ?? '/login'])
  );
};
