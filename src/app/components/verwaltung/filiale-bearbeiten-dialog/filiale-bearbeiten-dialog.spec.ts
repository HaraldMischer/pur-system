// pur-system/src/app/components/verwaltung/filiale-bearbeiten-dialog/filiale-bearbeiten-dialog.spec.ts

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { VerwaltungStore } from '../../../stores/domain/verwaltung.store';
import { FilialeBearbeitenDialog } from './filiale-bearbeiten-dialog';

describe('FilialeBearbeitenDialog', () => {
  const filiale: IFilialeEintrag = {
    id: 'filiale-1',
    nummer: 7,
    aktiv: true,
    anzeigename: 'Hamburg 1',
    filialname: 'Spielhalle',
    adresse: {
      strasse: 'Hauptstraße',
      hausnummer: '1',
      postleitzahl: '20095',
      ort: 'Hamburg',
    },
    kontakt: {
      email: 'hamburg@example.com',
      telefon: '040 123456',
      mobil: '0170 123456',
      webseite: 'https://example.com',
    },
  };
  let closeMock: ReturnType<typeof vi.fn>;
  let updateFilialeMock: ReturnType<typeof vi.fn>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let verwaltungStoreMock: {
    inProgress: WritableSignal<boolean>;
    updateError: WritableSignal<string | null>;
    updateFiliale: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    closeMock = vi.fn();
    updateFilialeMock = vi.fn().mockResolvedValue(filiale);
    dialogRefMock = { close: closeMock, disableClose: false };
    verwaltungStoreMock = {
      inProgress: signal(false),
      updateError: signal(null),
      updateFiliale: updateFilialeMock,
    };

    await TestBed.configureTestingModule({
      imports: [FilialeBearbeitenDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { filiale } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: VerwaltungStore, useValue: verwaltungStoreMock },
      ],
    }).compileComponents();
  });

  it('should initialize the form with the complete editable branch data', () => {
    const fixture = TestBed.createComponent(FilialeBearbeitenDialog);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.filialeForm.getRawValue()).toEqual({
      anzeigename: 'Hamburg 1',
      filialname: 'Spielhalle',
      adresse: filiale.adresse,
      kontakt: filiale.kontakt,
    });
    expect(component.filialeForm.valid).toBe(true);
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('mat-label'),
      (label) => label.textContent?.trim(),
    );
    expect(labels).not.toContain('Mobil');
    expect(labels).not.toContain('Webseite');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )?.disabled,
    ).toBe(true);
  });

  it('should enable saving only while the branch differs from its initial value', () => {
    const component = TestBed.createComponent(FilialeBearbeitenDialog).componentInstance;

    component.filialeForm.controls.anzeigename.setValue('Hamburg Neu');
    expect(component.hatAenderungen()).toBe(true);

    component.filialeForm.controls.anzeigename.setValue('Hamburg 1');
    expect(component.hatAenderungen()).toBe(false);
  });

  it('should not update an unchanged branch', async () => {
    const component = TestBed.createComponent(FilialeBearbeitenDialog).componentInstance;

    await component.onSubmit();

    expect(updateFilialeMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
  });

  it('should initialize and save a branch without address data', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: { filiale: { ...filiale, adresse: undefined } },
    });
    const component = TestBed.createComponent(FilialeBearbeitenDialog).componentInstance;

    expect(component.filialeForm.controls.adresse.getRawValue()).toEqual({
      strasse: '',
      hausnummer: '',
      postleitzahl: '',
      ort: '',
    });
    component.filialeForm.controls.anzeigename.setValue('Hamburg Neu');

    await component.onSubmit();

    expect(updateFilialeMock).toHaveBeenCalledWith({
      anzeigename: 'Hamburg Neu',
      filialname: 'Spielhalle',
      kontakt: filiale.kontakt,
    });
  });

  it('should use the global form and dialog structure', () => {
    const fixture = TestBed.createComponent(FilialeBearbeitenDialog);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('form');
    const dialogActions = compiled.querySelector('mat-dialog-actions');
    const submitButton = compiled.querySelector<HTMLButtonElement>('button[type="submit"]');

    expect(form?.id).toBe('filiale-bearbeiten-form');
    expect(form?.classList).toContain('pur-form--grid');
    expect(form?.contains(dialogActions)).toBe(false);
    expect(submitButton?.getAttribute('form')).toBe('filiale-bearbeiten-form');
  });

  it('should reject mandatory fields containing only whitespace', async () => {
    const component = TestBed.createComponent(FilialeBearbeitenDialog).componentInstance;
    component.filialeForm.controls.anzeigename.setValue('   ');

    await component.onSubmit();

    expect(updateFilialeMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
  });

  it('should normalize editable data and close with the updated branch', async () => {
    const aktualisierteFiliale = { ...filiale, anzeigename: 'Hamburg Neu' };
    updateFilialeMock.mockResolvedValue(aktualisierteFiliale);
    const component = TestBed.createComponent(FilialeBearbeitenDialog).componentInstance;
    component.filialeForm.patchValue({
      anzeigename: ' Hamburg Neu ',
      kontakt: {
        email: ' KONTAKT@EXAMPLE.COM ',
        telefon: ' 040 654321 ',
        mobil: '',
        webseite: '',
      },
    });

    await component.onSubmit();

    expect(updateFilialeMock).toHaveBeenCalledWith({
      anzeigename: 'Hamburg Neu',
      filialname: 'Spielhalle',
      adresse: filiale.adresse,
      kontakt: {
        email: 'kontakt@example.com',
        telefon: '040 654321',
      },
    });
    expect(closeMock).toHaveBeenCalledWith(aktualisierteFiliale);
  });

  it('should keep the dialog open when the update fails', async () => {
    updateFilialeMock.mockRejectedValue({ code: 'permission-denied' });
    const component = TestBed.createComponent(FilialeBearbeitenDialog).componentInstance;
    component.filialeForm.controls.anzeigename.setValue('Hamburg Neu');

    await component.onSubmit();

    expect(closeMock).not.toHaveBeenCalled();
    expect(dialogRefMock.disableClose).toBe(false);
  });
});
