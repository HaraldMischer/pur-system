// pur-system/src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import {
  FilialeinstellungStore,
  IFilialeinstellungFehler,
} from '../../../stores/domain/filialeinstellung.store';
import { SondertagBearbeitenDialog } from './sondertag-bearbeiten-dialog';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;

describe('SondertagBearbeitenDialog', () => {
  const createSondertag = vi.fn().mockResolvedValue(undefined);
  const kontext = signal<{ inProgress: boolean; error: IFilialeinstellungFehler | null }>({
    inProgress: false,
    error: null,
  });
  const clearError = vi.fn(() => {
    kontext.update((wert) => {
      return { ...wert, error: null };
    });
  });
  const close = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    kontext.set({ inProgress: false, error: null });
    await TestBed.configureTestingModule({
      imports: [SondertagBearbeitenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { pfad: PFAD } },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: FilialeinstellungStore,
          useValue: {
            getFilialeinstellungKontext: vi.fn(() => kontext()),
            clearError,
            createSondertag,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create a fixed annual special day with an overnight opening rule', async () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.setValue({
      bezeichnung: 'Heiligabend',
      monatTag: '12-24',
      aktiv: true,
      geoeffnet: true,
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
    });

    await fixture.componentInstance.save();

    expect(createSondertag).toHaveBeenCalledWith(PFAD, {
      bezeichnung: 'Heiligabend',
      aktiv: true,
      datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '07:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should only provide the annual month and day for a special day', () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.contains('monatTag')).toBe(true);
    expect(fixture.componentInstance.form.contains('monat')).toBe(false);
    expect(fixture.componentInstance.form.contains('tag')).toBe(false);
    expect(fixture.componentInstance.form.contains('datum')).toBe(false);
    expect(fixture.componentInstance.form.contains('jaehrlichWiederkehrend')).toBe(false);
    expect(fixture.componentInstance.form.controls.monatTag.value).toBe('');
    expect(fixture.componentInstance.form.controls.monatTag.hasError('required')).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Jährlich wiederholen');
  });

  it('should reject equal opening times', () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.patchValue({
      bezeichnung: 'Testtag',
      geoeffnet: true,
      beginnLokalzeit: '08:00',
      endeLokalzeit: '08:00',
    });

    expect(fixture.componentInstance.form.hasError('identischeOeffnungszeiten')).toBe(true);
  });

  it('should arrange the checkboxes and opening times in rows', () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.controls.geoeffnet.setValue(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.pur-form__row')).toHaveLength(2);
    const datumZeile = fixture.nativeElement.querySelector('.pur-form__row') as HTMLElement;
    expect(datumZeile.querySelector('app-datum-eingabe')).not.toBeNull();
    expect(datumZeile.querySelectorAll('mat-checkbox')).toHaveLength(2);
    expect(datumZeile.querySelectorAll('.pur-form__item--33')).toHaveLength(1);
    expect(datumZeile.querySelectorAll('mat-checkbox.pur-form__item--auto')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('app-lokalzeit-eingabe')).toHaveLength(2);
    expect(
      fixture.nativeElement.querySelectorAll('app-lokalzeit-eingabe mat-icon[matIconSuffix]'),
    ).toHaveLength(2);
  });

  it('should keep opening times visible and disabled while the special day is closed', () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.controls.geoeffnet.setValue(true);
    fixture.componentInstance.form.patchValue({
      beginnLokalzeit: '07:30',
      endeLokalzeit: '16:00',
    });
    fixture.componentInstance.form.controls.geoeffnet.setValue(false);
    fixture.detectChanges();

    const zeitfelder = fixture.nativeElement.querySelectorAll(
      'app-lokalzeit-eingabe input',
    ) as NodeListOf<HTMLInputElement>;
    expect(zeitfelder).toHaveLength(2);
    expect(Array.from(zeitfelder).every((zeitfeld) => zeitfeld.disabled)).toBe(true);
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({
      beginnLokalzeit: '07:30',
      endeLokalzeit: '16:00',
    });
  });

  it('should disable the opening rule while the special day is inactive and preserve its values', () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.patchValue({
      aktiv: true,
      geoeffnet: true,
      beginnLokalzeit: '09:00',
      endeLokalzeit: '17:30',
    });
    fixture.componentInstance.form.controls.aktiv.setValue(false);
    fixture.detectChanges();

    const geoeffnetCheckbox = fixture.nativeElement.querySelector(
      'mat-checkbox[formControlName="geoeffnet"] input',
    ) as HTMLInputElement | null;
    const zeitfelder = fixture.nativeElement.querySelectorAll(
      'app-lokalzeit-eingabe input',
    ) as NodeListOf<HTMLInputElement>;
    expect(fixture.componentInstance.form.controls.geoeffnet.disabled).toBe(true);
    expect(geoeffnetCheckbox?.disabled).toBe(true);
    expect(Array.from(zeitfelder).every((zeitfeld) => zeitfeld.disabled)).toBe(true);
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({
      geoeffnet: true,
      beginnLokalzeit: '09:00',
      endeLokalzeit: '17:30',
    });
  });

  it('should keep the dialog open and display the write action with its cause', async () => {
    createSondertag.mockImplementationOnce(async () => {
      kontext.set({
        inProgress: false,
        error: {
          meldung: 'Der Sondertag konnte nicht angelegt werden.',
          ursache: 'Der Sondertag benötigt ein gültiges jährliches Datum.',
        },
      });
      throw new Error('Der Sondertag benötigt ein gültiges jährliches Datum.');
    });
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.setValue({
      bezeichnung: 'Testtag',
      monatTag: '12-24',
      aktiv: true,
      geoeffnet: false,
      beginnLokalzeit: '08:00',
      endeLokalzeit: '18:00',
    });

    await fixture.componentInstance.save();
    fixture.detectChanges();

    const meldung = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement | null;
    expect(meldung?.textContent).toContain('Der Sondertag konnte nicht angelegt werden.');
    expect(meldung?.textContent).toContain('Der Sondertag benötigt ein gültiges jährliches Datum.');
    expect(close).not.toHaveBeenCalled();
  });
});
