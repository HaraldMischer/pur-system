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
  const updateSondertag = vi.fn().mockResolvedValue(undefined);
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
          useValue: { pfad: PFAD },
        },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: FilialeinstellungStore,
          useValue: {
            getFilialeinstellungKontext: vi.fn(() => kontext()),
            clearError,
            createSondertag,
            updateSondertag,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create a fixed annual special day in standard mode', async () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.setValue({
      bezeichnung: 'Heiligabend',
      monatTag: '12-24',
    });

    await fixture.componentInstance.save();

    expect(createSondertag).toHaveBeenCalledWith(PFAD, {
      bezeichnung: 'Heiligabend',
      aktiv: false,
      datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
      oeffnungsregel: {
        geoeffnet: false,
        beginnLokalzeit: '06:00',
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
    expect(fixture.nativeElement.textContent).not.toContain('Jährlich wiederholen');
  });

  it('should update name and date while preserving the opening rule', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        pfad: PFAD,
        sondertag: {
          id: 'winteraktion',
          unternehmerId: PFAD.unternehmerId,
          firmaId: PFAD.firmaId,
          filialeId: PFAD.filialeId,
          bezeichnung: 'Winteraktion',
          aktiv: true,
          herkunft: 'benutzer',
          datumsregel: { typ: 'jaehrlichFestesDatum', monat: 2, tag: 3 },
          oeffnungsregel: {
            geoeffnet: true,
            beginnLokalzeit: '09:00',
            endeLokalzeit: '18:00',
            endetAmFolgetag: false,
          },
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
        },
      },
    });
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.setValue({
      bezeichnung: 'Frühlingsaktion',
      monatTag: '03-04',
    });

    await fixture.componentInstance.save();

    expect(updateSondertag).toHaveBeenCalledWith(PFAD, 'winteraktion', {
      bezeichnung: 'Frühlingsaktion',
      aktiv: true,
      datumsregel: { typ: 'jaehrlichFestesDatum', monat: 3, tag: 4 },
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '09:00',
        endeLokalzeit: '18:00',
        endetAmFolgetag: false,
      },
    });
    expect(close).toHaveBeenCalledWith(true);
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
    });

    await fixture.componentInstance.save();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Der Sondertag konnte nicht angelegt werden.');
    expect(text).toContain('Der Sondertag benötigt ein gültiges jährliches Datum.');
    expect(close).not.toHaveBeenCalled();
  });
});
