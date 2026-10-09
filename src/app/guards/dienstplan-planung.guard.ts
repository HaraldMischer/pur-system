// pur-system/src/app/guards/dienstplan-planung.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { BenutzerStore } from '../stores/app/benutzer.store';

export const dienstplanPlanungGuard: CanActivateFn = () => {
  const benutzerStore = inject(BenutzerStore);
  const router = inject(Router);
  const benutzerProfil = benutzerStore.benutzerProfil();

  if (!benutzerProfil?.aktiv) {
    return router.createUrlTree(['/login']);
  }

  const darfPlanen = benutzerProfil.userRole === 'master' || benutzerProfil.userRole === 'office';
  return darfPlanen || router.createUrlTree(['/schichtplan/ansicht']);
};
