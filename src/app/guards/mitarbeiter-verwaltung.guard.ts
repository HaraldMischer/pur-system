// pur-system/src/app/guards/mitarbeiter-verwaltung.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { darfMitarbeiterBereichNutzen } from '../commons/utils/mitarbeiter/mitarbeiter-berechtigung';
import { BenutzerStore } from '../stores/app/benutzer.store';
import { getErlaubteStartRoute } from './guard-navigation';

export const mitarbeiterVerwaltungGuard: CanActivateFn = () => {
  const benutzerStore = inject(BenutzerStore);
  const router = inject(Router);
  const profil = benutzerStore.benutzerProfil();
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
