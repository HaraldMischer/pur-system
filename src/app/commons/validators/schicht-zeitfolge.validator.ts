// pur-system/src/app/commons/validators/schicht-zeitfolge.validator.ts

import { AbstractControl, ValidationErrors } from '@angular/forms';

import { calculateSchichtdauerMinuten } from '../utils/dienstplan/schicht-lokalzeit';

/**
 * Prüft Beginn und Ende einer lokalen Schichtzeitfolge.
 *
 * Fehlende Werte werden durch die Pflichtfeldvalidatoren der einzelnen Felder behandelt.
 *
 * @param control - Formulargruppe mit `beginnLokalzeit` und `endeLokalzeit`.
 * @returns `null` bei einer gültigen Zeitfolge, andernfalls einen Zeitfolgefehler.
 */
export function schichtZeitfolgeValidator(control: AbstractControl): ValidationErrors | null {
  const beginn = control.get('beginnLokalzeit')?.value as string | undefined;
  const ende = control.get('endeLokalzeit')?.value as string | undefined;
  if (!beginn || !ende) return null;
  return calculateSchichtdauerMinuten(beginn, ende) === null ? { ungueltigeZeitfolge: true } : null;
}
