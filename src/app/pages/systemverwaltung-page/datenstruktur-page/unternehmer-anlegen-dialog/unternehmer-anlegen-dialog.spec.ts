// pur-system/src/app/pages/systemverwaltung-page/datenstruktur-page/unternehmer-anlegen-dialog/unternehmer-anlegen-dialog.spec.ts

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { UnternehmerStore } from '../../../../stores/domain/unternehmer.store';
import { UnternehmerAnlegenDialog } from './unternehmer-anlegen-dialog';

describe('UnternehmerAnlegenDialog', () => {
  let closeMock: ReturnType<typeof vi.fn>;
  let createUnternehmerMock: ReturnType<typeof vi.fn>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let unternehmerStoreMock: {
    inProgress: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    createUnternehmer: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    closeMock = vi.fn();
    createUnternehmerMock = vi.fn().mockResolvedValue({
      id: 'unternehmer-123',
      nummer: 1,
      anzeigename: 'Unternehmer Nord',
    });
    dialogRefMock = { close: closeMock, disableClose: false };
    unternehmerStoreMock = {
      inProgress: signal(false),
      error: signal(null),
      createUnternehmer: createUnternehmerMock,
    };

    await TestBed.configureTestingModule({
      imports: [UnternehmerAnlegenDialog, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: UnternehmerStore, useValue: unternehmerStoreMock },
      ],
    }).compileComponents();
  });

  it('should require all mandatory entrepreneur fields', async () => {
    const fixture = TestBed.createComponent(UnternehmerAnlegenDialog);
    const component = fixture.componentInstance;

    expect(component.unternehmerForm.invalid).toBe(true);

    await component.onSubmit();

    expect(createUnternehmerMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
    expect(component.unternehmerForm.touched).toBe(true);
  });

  it('should use only global form and dialog layout classes', () => {
    const fixture = TestBed.createComponent(UnternehmerAnlegenDialog);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const form = compiled.querySelector('form');
    const dialogContent = compiled.querySelector('mat-dialog-content');
    const dialogActions = compiled.querySelector('mat-dialog-actions');
    const submitButton = compiled.querySelector<HTMLButtonElement>('button[type="submit"]');

    expect(form?.id).toBe('unternehmer-anlegen-form');
    expect(form?.classList).toContain('pur-form--grid');
    expect(dialogContent?.classList).toContain('pur-dialog__content');
    expect(form?.contains(dialogActions)).toBe(false);
    expect(submitButton?.getAttribute('form')).toBe('unternehmer-anlegen-form');
    expect(compiled.querySelectorAll('.pur-form__row')).toHaveLength(4);
    expect(compiled.querySelector('[class*="unternehmer-anlegen-dialog__"]')).toBeNull();
  });

  it('should reject an invalid email address', () => {
    const component = TestBed.createComponent(UnternehmerAnlegenDialog).componentInstance;

    component.unternehmerForm.controls.person.controls.kontakt.controls.email.setValue('ungueltig');

    expect(
      component.unternehmerForm.controls.person.controls.kontakt.controls.email.hasError('email'),
    ).toBe(true);
  });

  it('should create the entrepreneur without optional contact data', async () => {
    const component = TestBed.createComponent(UnternehmerAnlegenDialog).componentInstance;
    component.unternehmerForm.setValue({
      anzeigename: 'Unternehmer Nord',
      person: {
        vorname: 'Max',
        nachname: 'Mustermann',
        adresse: {
          strasse: 'Hauptstraße',
          hausnummer: '1',
          postleitzahl: '20095',
          ort: 'Hamburg',
        },
        kontakt: {
          email: '',
          telefon: '',
        },
      },
    });

    await component.onSubmit();

    expect(createUnternehmerMock).toHaveBeenCalledWith({
      anzeigename: 'Unternehmer Nord',
      person: {
        vorname: 'Max',
        nachname: 'Mustermann',
        adresse: {
          strasse: 'Hauptstraße',
          hausnummer: '1',
          postleitzahl: '20095',
          ort: 'Hamburg',
        },
        kontakt: {},
      },
    });
  });

  it('should create the entrepreneur and close with the result when the form is valid', async () => {
    const component = TestBed.createComponent(UnternehmerAnlegenDialog).componentInstance;

    component.unternehmerForm.setValue({
      anzeigename: ' Unternehmer Nord ',
      person: {
        vorname: ' Max ',
        nachname: ' Mustermann ',
        adresse: {
          strasse: ' Hauptstraße ',
          hausnummer: ' 1 ',
          postleitzahl: ' 20095 ',
          ort: ' Hamburg ',
        },
        kontakt: {
          email: ' INFO@EXAMPLE.COM ',
          telefon: ' 040 123456 ',
        },
      },
    });

    await component.onSubmit();

    expect(createUnternehmerMock).toHaveBeenCalledWith({
      anzeigename: 'Unternehmer Nord',
      person: {
        vorname: 'Max',
        nachname: 'Mustermann',
        adresse: {
          strasse: 'Hauptstraße',
          hausnummer: '1',
          postleitzahl: '20095',
          ort: 'Hamburg',
        },
        kontakt: {
          email: 'info@example.com',
          telefon: '040 123456',
        },
      },
    });
    expect(closeMock).toHaveBeenCalledWith({
      id: 'unternehmer-123',
      nummer: 1,
      anzeigename: 'Unternehmer Nord',
    });
    expect(dialogRefMock.disableClose).toBe(false);
  });

  it('should keep the dialog open when creation fails', async () => {
    createUnternehmerMock.mockRejectedValue({ code: 'permission-denied' });
    const component = TestBed.createComponent(UnternehmerAnlegenDialog).componentInstance;
    component.unternehmerForm.setValue({
      anzeigename: 'Unternehmer Nord',
      person: {
        vorname: 'Max',
        nachname: 'Mustermann',
        adresse: {
          strasse: 'Hauptstraße',
          hausnummer: '1',
          postleitzahl: '20095',
          ort: 'Hamburg',
        },
        kontakt: {
          email: 'info@example.com',
          telefon: '040 123456',
        },
      },
    });

    await component.onSubmit();

    expect(closeMock).not.toHaveBeenCalled();
    expect(dialogRefMock.disableClose).toBe(false);
  });
});
