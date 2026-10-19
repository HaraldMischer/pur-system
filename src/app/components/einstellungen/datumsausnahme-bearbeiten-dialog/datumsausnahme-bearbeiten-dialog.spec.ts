// pur-system/src/app/components/einstellungen/datumsausnahme-bearbeiten-dialog/datumsausnahme-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import {
  FilialeinstellungStore,
  IFilialeinstellungFehler,
} from '../../../stores/domain/filialeinstellung.store';
import { DatumsausnahmeBearbeitenDialog } from './datumsausnahme-bearbeiten-dialog';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;

describe('DatumsausnahmeBearbeitenDialog', () => {
  const createAusnahme = vi.fn().mockResolvedValue(undefined);
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
      imports: [DatumsausnahmeBearbeitenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { pfad: PFAD } },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: FilialeinstellungStore,
          useValue: {
            getFilialeinstellungKontext: vi.fn(() => kontext()),
            clearError,
            createAusnahme,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create an exception for one concrete date', async () => {
    const fixture = TestBed.createComponent(DatumsausnahmeBearbeitenDialog);
    fixture.componentInstance.form.patchValue({
      bezeichnung: 'Betriebsversammlung',
      datum: '2026-11-12',
      geoeffnet: true,
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
    });

    await fixture.componentInstance.save();

    expect(createAusnahme).toHaveBeenCalledWith(PFAD, {
      datum: '2026-11-12',
      bezeichnung: 'Betriebsversammlung',
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '07:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should only provide one concrete date without an active state', () => {
    const fixture = TestBed.createComponent(DatumsausnahmeBearbeitenDialog);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.contains('datum')).toBe(true);
    expect(fixture.componentInstance.form.contains('aktiv')).toBe(false);
    const datumEingabe = fixture.nativeElement.querySelector('app-datum-eingabe');
    const geoeffnet = fixture.nativeElement.querySelector(
      'mat-checkbox[formControlName="geoeffnet"]',
    );
    expect(datumEingabe?.closest('.pur-form__row')).toBe(geoeffnet?.closest('.pur-form__row'));
    expect(datumEingabe?.classList).toContain('pur-form__item--50');
    expect(geoeffnet?.classList).toContain('pur-form__item--50');
    expect(fixture.nativeElement.textContent).not.toContain('Jährlich wiederholen');
  });

  it('should keep the times visible and disabled while the exception is closed', () => {
    const fixture = TestBed.createComponent(DatumsausnahmeBearbeitenDialog);
    fixture.componentInstance.form.controls.geoeffnet.setValue(true);
    fixture.componentInstance.form.patchValue({
      beginnLokalzeit: '09:00',
      endeLokalzeit: '17:30',
    });
    fixture.componentInstance.form.controls.geoeffnet.setValue(false);
    fixture.detectChanges();

    const zeitfelder = fixture.nativeElement.querySelectorAll(
      'app-lokalzeit-eingabe input',
    ) as NodeListOf<HTMLInputElement>;
    expect(zeitfelder).toHaveLength(2);
    expect(Array.from(zeitfelder).every((zeitfeld) => zeitfeld.disabled)).toBe(true);
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({
      beginnLokalzeit: '09:00',
      endeLokalzeit: '17:30',
    });
  });
});
