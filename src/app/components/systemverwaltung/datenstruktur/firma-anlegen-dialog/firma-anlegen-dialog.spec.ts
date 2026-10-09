// pur-system/src/app/components/systemverwaltung/datenstruktur/firma-anlegen-dialog/firma-anlegen-dialog.spec.ts

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FirmaStore } from '../../../../stores/domain/firma.store';
import { FirmaAnlegenDialog } from './firma-anlegen-dialog';

describe('FirmaAnlegenDialog', () => {
  let closeMock: ReturnType<typeof vi.fn>;
  let createFirmaMock: ReturnType<typeof vi.fn>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let firmaStoreMock: {
    inProgress: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    createFirma: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    closeMock = vi.fn();
    createFirmaMock = vi.fn().mockResolvedValue({
      id: 'firma-123',
      nummer: 1,
      anzeigename: 'Firma Nord',
    });
    dialogRefMock = { close: closeMock, disableClose: false };
    firmaStoreMock = {
      inProgress: signal(false),
      error: signal(null),
      createFirma: createFirmaMock,
    };

    await TestBed.configureTestingModule({
      imports: [FirmaAnlegenDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { unternehmerId: 'unternehmer-1' } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: FirmaStore, useValue: firmaStoreMock },
      ],
    }).compileComponents();
  });

  it('should require all mandatory company fields', async () => {
    const fixture = TestBed.createComponent(FirmaAnlegenDialog);
    const component = fixture.componentInstance;

    expect(component.firmaForm.invalid).toBe(true);

    await component.onSubmit();

    expect(createFirmaMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
    expect(component.firmaForm.touched).toBe(true);
  });

  it('should use only global form and dialog layout classes', () => {
    const fixture = TestBed.createComponent(FirmaAnlegenDialog);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const form = compiled.querySelector('form');
    const dialogContent = compiled.querySelector('mat-dialog-content');
    const dialogActions = compiled.querySelector('mat-dialog-actions');
    const submitButton = compiled.querySelector<HTMLButtonElement>('button[type="submit"]');

    expect(form?.id).toBe('firma-anlegen-form');
    expect(form?.classList).toContain('pur-form--grid');
    expect(dialogContent?.classList).toContain('pur-dialog__content');
    expect(form?.contains(dialogActions)).toBe(false);
    expect(submitButton?.getAttribute('form')).toBe('firma-anlegen-form');
    expect(compiled.querySelectorAll('.pur-form__row')).toHaveLength(5);
    expect(compiled.querySelector('[class*="firma-anlegen-dialog__"]')).toBeNull();
  });

  it('should reject an invalid email address', () => {
    const component = TestBed.createComponent(FirmaAnlegenDialog).componentInstance;

    component.firmaForm.controls.kontakt.controls.email.setValue('ungueltig');

    expect(component.firmaForm.controls.kontakt.controls.email.hasError('email')).toBe(true);
  });

  it('should create the company without optional contact data', async () => {
    const component = TestBed.createComponent(FirmaAnlegenDialog).componentInstance;
    component.firmaForm.setValue({
      anzeigename: 'Firma Nord',
      firmenname: 'Firma Nord GmbH',
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
    });

    await component.onSubmit();

    expect(createFirmaMock).toHaveBeenCalledWith('unternehmer-1', {
      anzeigename: 'Firma Nord',
      firmenname: 'Firma Nord GmbH',
      adresse: {
        strasse: 'Hauptstraße',
        hausnummer: '1',
        postleitzahl: '20095',
        ort: 'Hamburg',
      },
      kontakt: {},
    });
  });

  it('should create the company without address data', async () => {
    const component = TestBed.createComponent(FirmaAnlegenDialog).componentInstance;
    component.firmaForm.setValue({
      anzeigename: 'Firma Nord',
      firmenname: 'Firma Nord GmbH',
      adresse: {
        strasse: '',
        hausnummer: '',
        postleitzahl: '',
        ort: '',
      },
      kontakt: {
        email: '',
        telefon: '',
      },
    });

    await component.onSubmit();

    expect(createFirmaMock).toHaveBeenCalledWith('unternehmer-1', {
      anzeigename: 'Firma Nord',
      firmenname: 'Firma Nord GmbH',
      kontakt: {},
    });
  });

  it('should create the company and close with the result when the form is valid', async () => {
    const component = TestBed.createComponent(FirmaAnlegenDialog).componentInstance;
    component.firmaForm.setValue({
      anzeigename: ' Firma Nord ',
      firmenname: ' Firma Nord GmbH ',
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
    });

    await component.onSubmit();

    expect(createFirmaMock).toHaveBeenCalledWith('unternehmer-1', {
      anzeigename: 'Firma Nord',
      firmenname: 'Firma Nord GmbH',
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
    });
    expect(closeMock).toHaveBeenCalledWith({
      id: 'firma-123',
      nummer: 1,
      anzeigename: 'Firma Nord',
    });
    expect(dialogRefMock.disableClose).toBe(false);
  });

  it('should keep the dialog open when creation fails', async () => {
    createFirmaMock.mockRejectedValue({ code: 'permission-denied' });
    const component = TestBed.createComponent(FirmaAnlegenDialog).componentInstance;
    component.firmaForm.setValue({
      anzeigename: 'Firma Nord',
      firmenname: 'Firma Nord GmbH',
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
    });

    await component.onSubmit();

    expect(closeMock).not.toHaveBeenCalled();
    expect(dialogRefMock.disableClose).toBe(false);
  });
});
