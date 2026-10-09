// pur-system/src/app/components/systemverwaltung/datenstruktur/filiale-anlegen-dialog/filiale-anlegen-dialog.spec.ts

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FilialeStore } from '../../../../stores/domain/filiale.store';
import { FilialeAnlegenDialog } from './filiale-anlegen-dialog';

describe('FilialeAnlegenDialog', () => {
  let closeMock: ReturnType<typeof vi.fn>;
  let createFilialeMock: ReturnType<typeof vi.fn>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let filialeStoreMock: {
    inProgress: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    createFiliale: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    closeMock = vi.fn();
    createFilialeMock = vi.fn().mockResolvedValue({
      id: 'filiale-123',
      nummer: 1,
      anzeigename: 'Gevelsberg 1',
    });
    dialogRefMock = { close: closeMock, disableClose: false };
    filialeStoreMock = {
      inProgress: signal(false),
      error: signal(null),
      createFiliale: createFilialeMock,
    };

    await TestBed.configureTestingModule({
      imports: [FilialeAnlegenDialog, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { unternehmerId: 'unternehmer-1', firmaId: 'firma-1' },
        },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: FilialeStore, useValue: filialeStoreMock },
      ],
    }).compileComponents();
  });

  it('should require all mandatory branch fields', async () => {
    const fixture = TestBed.createComponent(FilialeAnlegenDialog);
    const component = fixture.componentInstance;

    expect(component.filialeForm.invalid).toBe(true);

    await component.onSubmit();

    expect(createFilialeMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
    expect(component.filialeForm.touched).toBe(true);
  });

  it('should use only global form and dialog layout classes', () => {
    const fixture = TestBed.createComponent(FilialeAnlegenDialog);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const form = compiled.querySelector('form');
    const dialogContent = compiled.querySelector('mat-dialog-content');
    const dialogActions = compiled.querySelector('mat-dialog-actions');
    const submitButton = compiled.querySelector<HTMLButtonElement>('button[type="submit"]');

    expect(form?.id).toBe('filiale-anlegen-form');
    expect(form?.classList).toContain('pur-form--grid');
    expect(dialogContent?.classList).toContain('pur-dialog__content');
    expect(form?.contains(dialogActions)).toBe(false);
    expect(submitButton?.getAttribute('form')).toBe('filiale-anlegen-form');
    expect(compiled.querySelectorAll('.pur-form__row')).toHaveLength(5);
    expect(compiled.querySelector('[class*="filiale-anlegen-dialog__"]')).toBeNull();
  });

  it('should reject an invalid email address', () => {
    const component = TestBed.createComponent(FilialeAnlegenDialog).componentInstance;

    component.filialeForm.controls.kontakt.controls.email.setValue('ungueltig');

    expect(component.filialeForm.controls.kontakt.controls.email.hasError('email')).toBe(true);
  });

  it('should create the branch without optional contact data', async () => {
    const component = TestBed.createComponent(FilialeAnlegenDialog).componentInstance;
    component.filialeForm.setValue({
      anzeigename: 'Gevelsberg 1',
      filialname: 'Spielhalle',
      adresse: {
        strasse: 'Mittelstraße',
        hausnummer: '102',
        postleitzahl: '58285',
        ort: 'Gevelsberg',
      },
      kontakt: { email: '', telefon: '' },
    });

    await component.onSubmit();

    expect(createFilialeMock).toHaveBeenCalledWith('unternehmer-1', 'firma-1', {
      anzeigename: 'Gevelsberg 1',
      filialname: 'Spielhalle',
      adresse: {
        strasse: 'Mittelstraße',
        hausnummer: '102',
        postleitzahl: '58285',
        ort: 'Gevelsberg',
      },
      kontakt: {},
    });
  });

  it('should create the branch without address data', async () => {
    const component = TestBed.createComponent(FilialeAnlegenDialog).componentInstance;
    component.filialeForm.setValue({
      anzeigename: 'Gevelsberg 1',
      filialname: 'Spielhalle',
      adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
      kontakt: { email: '', telefon: '' },
    });

    await component.onSubmit();

    expect(createFilialeMock).toHaveBeenCalledWith('unternehmer-1', 'firma-1', {
      anzeigename: 'Gevelsberg 1',
      filialname: 'Spielhalle',
      kontakt: {},
    });
  });

  it('should create the branch and close with the result when the form is valid', async () => {
    const component = TestBed.createComponent(FilialeAnlegenDialog).componentInstance;
    component.filialeForm.setValue({
      anzeigename: ' Gevelsberg 1 ',
      filialname: ' Spielhalle ',
      adresse: {
        strasse: ' Mittelstraße ',
        hausnummer: ' 102 ',
        postleitzahl: ' 58285 ',
        ort: ' Gevelsberg ',
      },
      kontakt: {
        email: ' INFO@EXAMPLE.COM ',
        telefon: ' 02332 123456 ',
      },
    });

    await component.onSubmit();

    expect(createFilialeMock).toHaveBeenCalledWith('unternehmer-1', 'firma-1', {
      anzeigename: 'Gevelsberg 1',
      filialname: 'Spielhalle',
      adresse: {
        strasse: 'Mittelstraße',
        hausnummer: '102',
        postleitzahl: '58285',
        ort: 'Gevelsberg',
      },
      kontakt: {
        email: 'info@example.com',
        telefon: '02332 123456',
      },
    });
    expect(closeMock).toHaveBeenCalledWith({
      id: 'filiale-123',
      nummer: 1,
      anzeigename: 'Gevelsberg 1',
    });
    expect(dialogRefMock.disableClose).toBe(false);
  });

  it('should keep the dialog open when creation fails', async () => {
    createFilialeMock.mockRejectedValue({ code: 'permission-denied' });
    const component = TestBed.createComponent(FilialeAnlegenDialog).componentInstance;
    component.filialeForm.setValue({
      anzeigename: 'Gevelsberg 1',
      filialname: 'Spielhalle',
      adresse: {
        strasse: 'Mittelstraße',
        hausnummer: '102',
        postleitzahl: '58285',
        ort: 'Gevelsberg',
      },
      kontakt: {
        email: 'info@example.com',
        telefon: '02332 123456',
      },
    });

    await component.onSubmit();

    expect(closeMock).not.toHaveBeenCalled();
    expect(dialogRefMock.disableClose).toBe(false);
  });
});
