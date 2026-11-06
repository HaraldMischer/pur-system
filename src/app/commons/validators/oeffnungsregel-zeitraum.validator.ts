// pur-system/src/app/commons/validators/oeffnungsregel-zeitraum.validator.ts

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Erstellt einen Formularvalidator für eine positive Öffnungsdauer.
 */
export function createOeffnungsregelZeitraumValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const geoeffnet = Boolean(control.get('geoeffnet')?.value);
    const beginnLokalzeit = String(control.get('beginnLokalzeit')?.value ?? '');
    const endeLokalzeit = String(control.get('endeLokalzeit')?.value ?? '');
    if (!geoeffnet) return null;
    return beginnLokalzeit === endeLokalzeit ? { identischeOeffnungszeiten: true } : null;
  };
}
