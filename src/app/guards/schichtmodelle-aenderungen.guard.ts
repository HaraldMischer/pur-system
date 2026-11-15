// pur-system/src/app/guards/schichtmodelle-aenderungen.guard.ts

import { CanDeactivateFn } from '@angular/router';

type TSchichtmodelleAenderungenKomponente = {
  confirmVerlassen(): boolean | Promise<boolean>;
};

export const schichtmodelleAenderungenGuard: CanDeactivateFn<
  TSchichtmodelleAenderungenKomponente
> = (component) => {
  return component.confirmVerlassen();
};
