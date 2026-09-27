// pur-system/src/app/pages/verwaltung-page/firma-bearbeiten-dialog/firma-bearbeiten-dialog.spec.ts

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IFirmaEintrag } from '../../../commons/models/domain/firma';
import { VerwaltungStore } from '../../../stores/domain/verwaltung.store';
import { FirmaBearbeitenDialog } from './firma-bearbeiten-dialog';

describe('FirmaBearbeitenDialog', () => {
  const firma: IFirmaEintrag = {
    id: 'firma-1',
    nummer: 7,
    aktiv: true,
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
      mobil: '0170 123456',
      webseite: 'https://example.com',
    },
  };
  let closeMock: ReturnType<typeof vi.fn>;
  let updateFirmaMock: ReturnType<typeof vi.fn>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let verwaltungStoreMock: {
    inProgress: WritableSignal<boolean>;
    updateError: WritableSignal<string | null>;
    updateFirma: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    closeMock = vi.fn();
    updateFirmaMock = vi.fn().mockResolvedValue(firma);
    dialogRefMock = { close: closeMock, disableClose: false };
    verwaltungStoreMock = {
      inProgress: signal(false),
      updateError: signal(null),
      updateFirma: updateFirmaMock,
    };

    await TestBed.configureTestingModule({
      imports: [FirmaBearbeitenDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { firma } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: VerwaltungStore, useValue: verwaltungStoreMock },
      ],
    }).compileComponents();
  });

  it('should initialize the form with the complete editable company data', () => {
    const component = TestBed.createComponent(FirmaBearbeitenDialog).componentInstance;

    expect(component.firmaForm.getRawValue()).toEqual({
      anzeigename: 'Firma Nord',
      firmenname: 'Firma Nord GmbH',
      adresse: firma.adresse,
      kontakt: firma.kontakt,
    });
    expect(component.firmaForm.valid).toBe(true);
  });

  it('should use only global form and dialog layout classes', () => {
    const fixture = TestBed.createComponent(FirmaBearbeitenDialog);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('form');
    const dialogContent = compiled.querySelector('mat-dialog-content');
    const dialogActions = compiled.querySelector('mat-dialog-actions');
    const submitButton = compiled.querySelector<HTMLButtonElement>('button[type="submit"]');

    expect(form?.id).toBe('firma-bearbeiten-form');
    expect(form?.classList).toContain('pur-form--grid');
    expect(dialogContent?.classList).toContain('pur-dialog__content');
    expect(form?.contains(dialogActions)).toBe(false);
    expect(submitButton?.getAttribute('form')).toBe('firma-bearbeiten-form');
    expect(compiled.querySelector('[class*="firma-bearbeiten-dialog__"]')).toBeNull();
  });

  it('should reject mandatory fields containing only whitespace', async () => {
    const component = TestBed.createComponent(FirmaBearbeitenDialog).componentInstance;
    component.firmaForm.controls.anzeigename.setValue('   ');

    await component.onSubmit();

    expect(updateFirmaMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
    expect(component.firmaForm.touched).toBe(true);
  });

  it('should normalize editable data and close with the updated company', async () => {
    const aktualisierteFirma = { ...firma, anzeigename: 'Firma Neu' };
    updateFirmaMock.mockResolvedValue(aktualisierteFirma);
    const component = TestBed.createComponent(FirmaBearbeitenDialog).componentInstance;
    component.firmaForm.patchValue({
      anzeigename: ' Firma Neu ',
      kontakt: {
        email: ' KONTAKT@EXAMPLE.COM ',
        telefon: ' 040 654321 ',
        mobil: '',
        webseite: '',
      },
    });

    await component.onSubmit();

    expect(updateFirmaMock).toHaveBeenCalledWith({
      anzeigename: 'Firma Neu',
      firmenname: 'Firma Nord GmbH',
      adresse: firma.adresse,
      kontakt: {
        email: 'kontakt@example.com',
        telefon: '040 654321',
      },
    });
    expect(closeMock).toHaveBeenCalledWith(aktualisierteFirma);
    expect(dialogRefMock.disableClose).toBe(false);
  });

  it('should keep the dialog open when the update fails', async () => {
    updateFirmaMock.mockRejectedValue({ code: 'permission-denied' });
    const component = TestBed.createComponent(FirmaBearbeitenDialog).componentInstance;

    await component.onSubmit();

    expect(closeMock).not.toHaveBeenCalled();
    expect(dialogRefMock.disableClose).toBe(false);
  });
});
