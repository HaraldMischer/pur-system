// pur-system/src/app/guards/mitarbeiter-verwaltung.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';

import { darfMitarbeiterBereichNutzen } from '../commons/utils/mitarbeiter/mitarbeiter-berechtigung';
import { AuthService } from '../services/firebase/auth.service';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { getErlaubteStartRoute } from './guard-navigation';

export const mitarbeiterVerwaltungGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const benutzerStore = inject(BenutzerStore);
  const router = inject(Router);
  const benutzer = await firstValueFrom(authService.getAuthState().pipe(take(1)));

  if (!benutzer) {
    return router.createUrlTree(['/login']);
  }

  const profil = await benutzerStore.loadBenutzerProfil(benutzer.uid);
  if (!profil?.aktiv) {
    return router.createUrlTree(['/login']);
  }
  if (darfMitarbeiterBereichNutzen(profil)) {
    return true;
  }

  const profilOhneMitarbeiterbereich = {
    ...profil,
    erlaubteBereiche: profil.erlaubteBereiche.filter((bereich) => {
      return bereich !== 'mitarbeiter';
    }),
  };
  return router.createUrlTree([getErlaubteStartRoute(profilOhneMitarbeiterbereich) ?? '/login']);
};
