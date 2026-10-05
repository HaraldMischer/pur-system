// pur-system/src/app/commons/validators/nicht-leer.validator.spec.ts

import { FormControl } from '@angular/forms';

import { nichtLeerValidator } from './nicht-leer.validator';

describe('nichtLeerValidator', () => {
  it('should reject empty and whitespace-only values', () => {
    expect(nichtLeerValidator(new FormControl(''))).toEqual({ required: true });
    expect(nichtLeerValidator(new FormControl('   '))).toEqual({ required: true });
  });

  it('should accept content surrounded by whitespace', () => {
    expect(nichtLeerValidator(new FormControl(' Inhalt '))).toBeNull();
  });
});
