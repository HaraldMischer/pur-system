// pur-system/src/app/guards/verwaltung.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';

import { AuthService } from '../services/firebase/auth.service';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { getErlaubteStartRoute } from './guard-navigation';

export const verwaltungGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const benutzerStore = inject(BenutzerStore);
  const router = inject(Router);
  const benutzer = await firstValueFrom(authService.getAuthState().pipe(take(1)));

  if (!benutzer) {
    return router.createUrlTree(['/login']);
  }

  const benutzerProfil = await benutzerStore.loadBenutzerProfil(benutzer.uid);

  if (!benutzerProfil?.aktiv) {
    return router.createUrlTree(['/login']);
  }

  const darfVerwalten =
    benutzerProfil.userRole === 'office' || benutzerProfil.userRole === 'master';

  return darfVerwalten || router.createUrlTree([getErlaubteStartRoute(benutzerProfil) ?? '/login']);
};
