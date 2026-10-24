// pur-system/src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { STANDARD_SCHLIESSZEITRAUM_NRW } from '../../../commons/constants/filialeinstellung.constants';
import {
  FilialeinstellungStore,
  IFilialeinstellungFehler,
} from '../../../stores/domain/filialeinstellung.store';
import { SondertagBearbeitenDialog } from './sondertag-bearbeiten-dialog';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;

describe('SondertagBearbeitenDialog', () => {
  const createSondertag = vi.fn().mockResolvedValue(undefined);
  const updateSystemSondertag = vi.fn().mockResolvedValue(undefined);
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
        {
          provide: MAT_DIALOG_DATA,
          useValue: { pfad: PFAD, schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW },
        },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: FilialeinstellungStore,
          useValue: {
            getFilialeinstellungKontext: vi.fn(() => kontext()),
            clearError,
            createSondertag,
            updateSystemSondertag,
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
    expect(
      (fixture.nativeElement.querySelector('app-eingabe-datum input') as HTMLInputElement).readOnly,
    ).toBe(false);
    expect(fixture.componentInstance.form.controls.beginnLokalzeit.value).toBe('06:00');
    expect(fixture.componentInstance.form.controls.endeLokalzeit.value).toBe('01:00');
    expect(fixture.nativeElement.textContent).not.toContain('Jährlich wiederholen');
  });

  it('should update a legal holiday without requiring a fixed annual date', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        pfad: PFAD,
        schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW,
        sondertag: {
          id: 'karfreitag',
          unternehmerId: PFAD.unternehmerId,
          firmaId: PFAD.firmaId,
          filialeId: PFAD.filialeId,
          bezeichnung: 'Karfreitag',
          aktiv: true,
          herkunft: 'system',
          datumsregel: {
            typ: 'gesetzlicherFeiertag',
            feiertagSchluessel: 'karfreitag',
          },
          oeffnungsregel: {
            geoeffnet: false,
            beginnLokalzeit: '08:00',
            endeLokalzeit: '18:00',
            endetAmFolgetag: false,
          },
          erstelltVonUid: 'system',
          aktualisiertVonUid: 'system',
        },
      },
    });
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    const component = fixture.componentInstance;

    component.form.controls.geoeffnet.setValue(true);
    fixture.detectChanges();

    expect(component.dialogTitel).toBe('Gesetzlichen Feiertag bearbeiten');
    expect(fixture.nativeElement.textContent).toContain(
      'Gesetzlicher Feiertag mit berechnetem Datum.',
    );
    const datumEingabe = fixture.nativeElement.querySelector(
      'app-eingabe-datum input',
    ) as HTMLInputElement;
    expect(component.form.controls.monatTag.disabled).toBe(false);
    expect(datumEingabe.readOnly).toBe(true);
    expect(datumEingabe.value).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    expect(component.form.valid).toBe(true);
    expect(component.hatAenderungen()).toBe(true);

    await component.save();

    expect(updateSystemSondertag).toHaveBeenCalledWith(PFAD, 'karfreitag', {
      aktiv: true,
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '08:00',
        endeLokalzeit: '18:00',
        endetAmFolgetag: false,
      },
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should describe a legal holiday with a fixed date', () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        pfad: PFAD,
        schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW,
        sondertag: {
          id: 'tagDerDeutschenEinheit',
          unternehmerId: PFAD.unternehmerId,
          firmaId: PFAD.firmaId,
          filialeId: PFAD.filialeId,
          bezeichnung: 'Tag der Deutschen Einheit',
          aktiv: true,
          herkunft: 'system',
          datumsregel: {
            typ: 'gesetzlicherFeiertag',
            feiertagSchluessel: 'tagDerDeutschenEinheit',
          },
          oeffnungsregel: { geoeffnet: false },
          erstelltVonUid: 'system',
          aktualisiertVonUid: 'system',
        },
      },
    });
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Gesetzlicher Feiertag mit festem Datum.');
    const datumEingabe = fixture.nativeElement.querySelector(
      'app-eingabe-datum input',
    ) as HTMLInputElement;
    expect(datumEingabe.readOnly).toBe(true);
    expect(datumEingabe.value).toBe('03.10');
  });

  it('should describe a system special day with a fixed date', () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        pfad: PFAD,
        schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW,
        sondertag: {
          id: 'heiligabend',
          unternehmerId: PFAD.unternehmerId,
          firmaId: PFAD.firmaId,
          filialeId: PFAD.filialeId,
          bezeichnung: 'Heiligabend',
          aktiv: true,
          herkunft: 'system',
          datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
          oeffnungsregel: { geoeffnet: false },
          erstelltVonUid: 'system',
          aktualisiertVonUid: 'system',
        },
      },
    });
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sondertag mit festem Datum.');
    const datumEingabe = fixture.nativeElement.querySelector(
      'app-eingabe-datum input',
    ) as HTMLInputElement;
    expect(datumEingabe.readOnly).toBe(true);
    expect(datumEingabe.value).toBe('24.12');
  });

  it('should provide the standard times for a system holiday without stored times', () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        pfad: PFAD,
        schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW,
        sondertag: {
          id: 'karfreitag',
          unternehmerId: PFAD.unternehmerId,
          firmaId: PFAD.firmaId,
          filialeId: PFAD.filialeId,
          bezeichnung: 'Karfreitag',
          aktiv: false,
          herkunft: 'system',
          datumsregel: {
            typ: 'gesetzlicherFeiertag',
            feiertagSchluessel: 'karfreitag',
          },
          oeffnungsregel: { geoeffnet: false },
          erstelltVonUid: 'system',
          aktualisiertVonUid: 'system',
        },
      },
    });
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);

    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({
      aktiv: false,
      geoeffnet: false,
      beginnLokalzeit: '06:00',
      endeLokalzeit: '01:00',
    });
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

  it('should reject opening times that overlap the closing period', () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.patchValue({
      bezeichnung: 'Testtag',
      monatTag: '02-15',
      aktiv: true,
      geoeffnet: true,
      beginnLokalzeit: '05:30',
      endeLokalzeit: '20:00',
    });

    expect(fixture.componentInstance.form.hasError('oeffnungsregelAusserhalbOeffnungsrahmen')).toBe(
      true,
    );
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

    expect(fixture.componentInstance.form.controls.beginnLokalzeit.disabled).toBe(true);
    expect(fixture.componentInstance.form.controls.endeLokalzeit.disabled).toBe(true);
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
      'app-eingabe-zeit input',
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

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Der Sondertag konnte nicht angelegt werden.');
    expect(text).toContain('Der Sondertag benötigt ein gültiges jährliches Datum.');
    expect(close).not.toHaveBeenCalled();
  });
});
