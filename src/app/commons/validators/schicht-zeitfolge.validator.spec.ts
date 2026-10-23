// pur-system/src/app/commons/validators/schicht-zeitfolge.validator.spec.ts

import { FormControl, FormGroup } from '@angular/forms';

import { schichtZeitfolgeValidator } from './schicht-zeitfolge.validator';

describe('schichtZeitfolgeValidator', () => {
  it('should accept valid sequences on the start day and following day', () => {
    const form = createForm('08:00', 'starttag', '16:30', 'starttag');
    expect(schichtZeitfolgeValidator(form)).toBeNull();

    form.setValue({
      beginnLokalzeit: '16:30',
      beginnTag: 'starttag',
      endeLokalzeit: '01:00',
      endeTag: 'folgetag',
    });
    expect(schichtZeitfolgeValidator(form)).toBeNull();
  });

  it('should reject nonpositive or invalid shift sequences', () => {
    expect(schichtZeitfolgeValidator(createForm('08:00', 'starttag', '08:00', 'starttag'))).toEqual(
      {
        ungueltigeZeitfolge: true,
      },
    );
    expect(schichtZeitfolgeValidator(createForm('20:00', 'starttag', '01:00', 'starttag'))).toEqual(
      {
        ungueltigeZeitfolge: true,
      },
    );
    expect(
      schichtZeitfolgeValidator(createForm('ungültig', 'starttag', '16:30', 'starttag')),
    ).toEqual({
      ungueltigeZeitfolge: true,
    });
  });

  it('should leave missing values to their field validators', () => {
    expect(schichtZeitfolgeValidator(createForm('', 'starttag', '16:30', 'starttag'))).toBeNull();
  });
});

function createForm(
  beginnLokalzeit: string,
  beginnTag: 'starttag' | 'folgetag',
  endeLokalzeit: string,
  endeTag: 'starttag' | 'folgetag',
): FormGroup {
  return new FormGroup({
    beginnLokalzeit: new FormControl(beginnLokalzeit, { nonNullable: true }),
    beginnTag: new FormControl(beginnTag, { nonNullable: true }),
    endeLokalzeit: new FormControl(endeLokalzeit, { nonNullable: true }),
    endeTag: new FormControl(endeTag, { nonNullable: true }),
  });
}
