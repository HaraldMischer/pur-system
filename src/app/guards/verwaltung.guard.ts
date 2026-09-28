// pur-system/src/app/guards/verwaltung.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { BenutzerStore } from '../stores/app/benutzer.store';
import { getErlaubteStartRoute } from './guard-navigation';

export const verwaltungGuard: CanActivateFn = () => {
  const benutzerStore = inject(BenutzerStore);
  const router = inject(Router);
  const benutzerProfil = benutzerStore.benutzerProfil();

  if (!benutzerProfil?.aktiv) {
    return router.createUrlTree(['/login']);
  }

  const darfVerwalten =
    benutzerProfil.userRole === 'office' || benutzerProfil.userRole === 'master';

  return darfVerwalten || router.createUrlTree([getErlaubteStartRoute(benutzerProfil) ?? '/login']);
};
