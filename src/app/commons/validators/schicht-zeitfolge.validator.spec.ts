// pur-system/src/app/commons/validators/schicht-zeitfolge.validator.spec.ts

import { FormControl, FormGroup } from '@angular/forms';

import { schichtZeitfolgeValidator } from './schicht-zeitfolge.validator';

describe('schichtZeitfolgeValidator', () => {
  it('should accept same-day and overnight shift sequences', () => {
    const form = createForm('08:00', '16:30');
    expect(schichtZeitfolgeValidator(form)).toBeNull();

    form.setValue({ beginnLokalzeit: '16:30', endeLokalzeit: '01:00' });
    expect(schichtZeitfolgeValidator(form)).toBeNull();
  });

  it('should reject equal or invalid shift times', () => {
    expect(schichtZeitfolgeValidator(createForm('08:00', '08:00'))).toEqual({
      ungueltigeZeitfolge: true,
    });
    expect(schichtZeitfolgeValidator(createForm('ungültig', '16:30'))).toEqual({
      ungueltigeZeitfolge: true,
    });
  });

  it('should leave missing values to their field validators', () => {
    expect(schichtZeitfolgeValidator(createForm('', '16:30'))).toBeNull();
  });
});

function createForm(beginnLokalzeit: string, endeLokalzeit: string): FormGroup {
  return new FormGroup({
    beginnLokalzeit: new FormControl(beginnLokalzeit, { nonNullable: true }),
    endeLokalzeit: new FormControl(endeLokalzeit, { nonNullable: true }),
  });
}
