// pur-system/src/app/commons/validators/schicht-zeitfolge.validator.ts

import { AbstractControl, ValidationErrors } from '@angular/forms';

import { TModellschichtTag } from '../models/domain/schichtmodell';
import { calculateModellschichtdauerMinuten } from '../utils/dienstplan/schicht-lokalzeit';

/**
 * Prüft Beginn und Ende einer lokalen Schichtzeitfolge.
 *
 * Fehlende Werte werden durch die Pflichtfeldvalidatoren der einzelnen Felder behandelt.
 *
 * @param control - Formulargruppe mit lokalen Zeiten und deren Tageszuordnung.
 * @returns `null` bei einer gültigen Zeitfolge, andernfalls einen Zeitfolgefehler.
 */
export function schichtZeitfolgeValidator(control: AbstractControl): ValidationErrors | null {
  const beginn = control.get('beginnLokalzeit')?.value as string | undefined;
  const ende = control.get('endeLokalzeit')?.value as string | undefined;
  const beginnTag = control.get('beginnTag')?.value as TModellschichtTag | undefined;
  const endeTag = control.get('endeTag')?.value as TModellschichtTag | undefined;
  if (!beginn || !ende) return null;
  if (!beginnTag || !endeTag) return { ungueltigeZeitfolge: true };
  return calculateModellschichtdauerMinuten(
    { lokalzeit: beginn, tag: beginnTag },
    { lokalzeit: ende, tag: endeTag },
  ) === null
    ? { ungueltigeZeitfolge: true }
    : null;
}
