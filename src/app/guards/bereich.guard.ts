// pur-system/src/app/guards/bereich.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TAppBereich } from '../commons/models/app/app-bereich';
import { BenutzerStore } from '../stores/app/benutzer.store';

export const bereichGuard: CanActivateFn = (route) => {
  const benutzerStore = inject(BenutzerStore);
  const router = inject(Router);
  const benutzerProfil = benutzerStore.benutzerProfil();
  const bereich = route.data['bereich'] as TAppBereich | undefined;

  if (!benutzerProfil?.aktiv) {
    return router.createUrlTree(['/login']);
  }

  if (!bereich || benutzerProfil.erlaubteBereiche.includes(bereich)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
