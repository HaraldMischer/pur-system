// pur-system/src/app/guards/bereich.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';

import { TAppBereich } from '../commons/models/app/app-bereich';
import { AuthService } from '../services/firebase/auth.service';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { getErlaubteStartRoute } from './guard-navigation';

export const bereichGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const benutzerStore = inject(BenutzerStore);
  const router = inject(Router);
  const benutzer = await firstValueFrom(authService.getAuthState().pipe(take(1)));

  if (!benutzer) {
    return router.createUrlTree(['/login']);
  }

  const benutzerProfil = await benutzerStore.loadBenutzerProfil(benutzer.uid);
  const bereich = route.data['bereich'] as TAppBereich | undefined;

  if (!benutzerProfil?.aktiv) {
    return router.createUrlTree(['/login']);
  }

  if (!bereich || benutzerProfil.erlaubteBereiche.includes(bereich)) {
    return true;
  }

  return router.createUrlTree([getErlaubteStartRoute(benutzerProfil) ?? '/login']);
};
