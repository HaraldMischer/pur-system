// pur-system/src/app/commons/validators/nicht-leer.validator.ts

import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Prüft, ob ein Formularwert nach dem Entfernen äußerer Leerzeichen Inhalt besitzt.
 *
 * @param control - Das zu prüfende Formularfeld.
 * @returns `null` bei vorhandenem Inhalt, andernfalls einen `required`-Fehler.
 */
export function nichtLeerValidator(control: AbstractControl): ValidationErrors | null {
  return String(control.value).trim() ? null : { required: true };
}
