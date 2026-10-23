// pur-system/src/app/commons/validators/oeffnungsregel-zeitraum.validator.ts

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ISchliesszeitraum, TOeffnungsregel } from '../models/domain/filialeinstellung';
import { isOeffnungsregelInnerhalbOeffnungsrahmen } from '../utils/filialeinstellung/schliesszeitraum';

/**
 * Erstellt einen Formularvalidator für eine Öffnungsregel innerhalb des zulässigen Öffnungsrahmens.
 */
export function createOeffnungsregelZeitraumValidator(
  schliesszeitraum: ISchliesszeitraum,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const geoeffnet = Boolean(control.get('geoeffnet')?.value);
    const beginnLokalzeit = String(control.get('beginnLokalzeit')?.value ?? '');
    const endeLokalzeit = String(control.get('endeLokalzeit')?.value ?? '');
    if (!geoeffnet) return null;
    if (beginnLokalzeit === endeLokalzeit) return { identischeOeffnungszeiten: true };
    const oeffnungsregel: TOeffnungsregel = {
      geoeffnet: true,
      beginnLokalzeit,
      endeLokalzeit,
      endetAmFolgetag: endeLokalzeit < beginnLokalzeit,
    };
    return isOeffnungsregelInnerhalbOeffnungsrahmen(oeffnungsregel, schliesszeitraum)
      ? null
      : { oeffnungsregelAusserhalbOeffnungsrahmen: true };
  };
}
