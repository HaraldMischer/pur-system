// pur-system/src/app/components/einstellungen/datumsausnahme-bearbeiten-dialog/datumsausnahme-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { STANDARD_SCHLIESSZEITRAUM_NRW } from '../../../commons/constants/filialeinstellung.constants';
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

    expect(fixture.componentInstance.form.controls.beginnLokalzeit.disabled).toBe(true);
    expect(fixture.componentInstance.form.controls.endeLokalzeit.disabled).toBe(true);
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({
      beginnLokalzeit: '09:00',
      endeLokalzeit: '17:30',
    });
  });

  it('should reject opening times that overlap the closing period', () => {
    const fixture = TestBed.createComponent(DatumsausnahmeBearbeitenDialog);
    fixture.componentInstance.form.patchValue({
      bezeichnung: 'Sonderöffnung',
      datum: '2026-11-12',
      geoeffnet: true,
      beginnLokalzeit: '06:00',
      endeLokalzeit: '01:30',
    });

    expect(fixture.componentInstance.form.hasError('oeffnungsregelAusserhalbOeffnungsrahmen')).toBe(
      true,
    );
  });
});
