// pur-system/src/app/guards/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';

import { AuthService } from '../services/firebase/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getAuthState().pipe(
    take(1),
    map((benutzer) => benutzer !== null || router.createUrlTree(['/login'])),
  );
};
