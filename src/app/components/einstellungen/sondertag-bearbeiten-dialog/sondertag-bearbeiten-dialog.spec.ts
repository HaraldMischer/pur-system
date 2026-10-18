// pur-system/src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.spec.ts

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { SondertagBearbeitenDialog } from './sondertag-bearbeiten-dialog';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;

describe('SondertagBearbeitenDialog', () => {
  const createSondertag = vi.fn().mockResolvedValue(undefined);
  const createAusnahme = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [SondertagBearbeitenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { pfad: PFAD } },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: FilialeinstellungStore,
          useValue: {
            getFilialeinstellungKontext: vi.fn(() => ({ inProgress: false })),
            createSondertag,
            createAusnahme,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create a fixed annual special day with an overnight opening rule', async () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.setValue({
      bezeichnung: 'Heiligabend',
      jaehrlichWiederkehrend: true,
      datum: '',
      monat: 12,
      tag: 24,
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

  it('should create a one-time special day for a concrete date', async () => {
    const fixture = TestBed.createComponent(SondertagBearbeitenDialog);
    fixture.componentInstance.form.patchValue({
      bezeichnung: 'Betriebsversammlung',
      jaehrlichWiederkehrend: false,
      datum: '2026-11-12',
      geoeffnet: false,
    });

    await fixture.componentInstance.save();

    expect(createAusnahme).toHaveBeenCalledWith(PFAD, {
      datum: '2026-11-12',
      bezeichnung: 'Betriebsversammlung',
      oeffnungsregel: { geoeffnet: false },
    });
    expect(close).toHaveBeenCalledWith(true);
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
    expect(fixture.nativeElement.querySelectorAll('span[matTextSuffix]')).toHaveLength(2);
  });
});
