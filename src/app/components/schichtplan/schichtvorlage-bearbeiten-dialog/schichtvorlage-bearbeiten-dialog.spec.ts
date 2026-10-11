// pur-system/src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import {
  SchichtvorlageBearbeitenDialog,
  TSchichtvorlageBearbeitenDialogDaten,
} from './schichtvorlage-bearbeiten-dialog';

describe('SchichtvorlageBearbeitenDialog', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const createSchichtvorlage = vi.fn().mockResolvedValue(undefined);
  const updateSchichtvorlage = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();

  async function createComponent(daten: TSchichtvorlageBearbeitenDialogDaten) {
    await TestBed.configureTestingModule({
      imports: [SchichtvorlageBearbeitenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: daten },
        {
          provide: SchichtvorlageStore,
          useValue: { inProgress, error, createSchichtvorlage, updateSchichtvorlage },
        },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
      ],
    }).compileComponents();
    return TestBed.createComponent(SchichtvorlageBearbeitenDialog);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    inProgress.set(false);
    error.set(null);
  });

  it('should validate, normalize and create a template', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.schichtvorlageForm.controls.aktiv.value).toBe(true);
    expect(component.schichtvorlageForm.controls.aktiv.disabled).toBe(true);

    component.schichtvorlageForm.setValue({
      bezeichnung: '  Frühschicht  ',
      beginnLokalzeit: '08:00',
      endeLokalzeit: '16:30',
      standardpauseMinuten: 30,
      aktiv: true,
    });

    await component.saveSchichtvorlage();

    expect(createSchichtvorlage).toHaveBeenCalledWith(pfad, {
      bezeichnung: 'Frühschicht',
      beginnLokalzeit: '08:00',
      endeLokalzeit: '16:30',
      endetAmFolgetag: false,
      standardpauseMinuten: 30,
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should update the active status but skip an unchanged template', async () => {
    const fixture = await createComponent({
      pfad,
      schichtvorlage: {
        id: 'sv-1',
        ...pfad,
        bezeichnung: 'Spätschicht',
        beginnLokalzeit: '16:30',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
        standardpauseMinuten: 30,
        aktiv: true,
        erstelltVonUid: 'master-1',
        aktualisiertVonUid: 'master-1',
      },
    });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-checkbox')).not.toBeNull();
    expect(component.schichtvorlageForm.controls.aktiv.enabled).toBe(true);

    await component.saveSchichtvorlage();
    expect(updateSchichtvorlage).not.toHaveBeenCalled();

    component.schichtvorlageForm.controls.aktiv.setValue(false);
    await component.saveSchichtvorlage();

    expect(updateSchichtvorlage).toHaveBeenCalledWith(
      pfad,
      'sv-1',
      expect.objectContaining({ aktiv: false }),
    );
  });

  it('should infer the following day and reject equal start and end times', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    component.schichtvorlageForm.patchValue({
      bezeichnung: 'Spätschicht',
      beginnLokalzeit: '16:30',
      endeLokalzeit: '16:30',
    });

    await component.saveSchichtvorlage();
    expect(createSchichtvorlage).not.toHaveBeenCalled();

    component.schichtvorlageForm.controls.endeLokalzeit.setValue('01:00');
    await component.saveSchichtvorlage();
    expect(createSchichtvorlage).toHaveBeenCalledWith(
      pfad,
      expect.objectContaining({ endetAmFolgetag: true, standardpauseMinuten: 30 }),
    );
  });

  it('should calculate the read-only standard break from the shift duration', async () => {
    const fixture = await createComponent({ pfad });
    const form = fixture.componentInstance.schichtvorlageForm;
    fixture.detectChanges();

    const pauseInput = fixture.nativeElement.querySelector(
      'input[formControlName="standardpauseMinuten"]',
    ) as HTMLInputElement;

    expect(form.controls.standardpauseMinuten.value).toBe(0);
    expect(pauseInput.readOnly).toBe(true);

    form.controls.beginnLokalzeit.setValue('08:00');
    form.controls.endeLokalzeit.setValue('14:00');
    expect(fixture.componentInstance.schichtdauerStunden()).toBe('6');
    expect(form.controls.standardpauseMinuten.value).toBe(0);

    form.controls.endeLokalzeit.setValue('14:01');
    expect(form.controls.standardpauseMinuten.value).toBe(30);

    form.controls.endeLokalzeit.setValue('17:00');
    expect(form.controls.standardpauseMinuten.value).toBe(30);

    form.controls.endeLokalzeit.setValue('17:01');
    expect(form.controls.standardpauseMinuten.value).toBe(45);
  });

  it('should calculate the standard break for a shift ending on the following day', async () => {
    const fixture = await createComponent({ pfad });
    const form = fixture.componentInstance.schichtvorlageForm;

    form.controls.beginnLokalzeit.setValue('20:00');
    form.controls.endeLokalzeit.setValue('04:00');
    expect(fixture.componentInstance.schichtdauerStunden()).toBe('8');
    expect(form.controls.standardpauseMinuten.value).toBe(30);
  });

  it('should format fractional shift hours and reset an invalid duration to zero', async () => {
    const fixture = await createComponent({ pfad });
    const form = fixture.componentInstance.schichtvorlageForm;

    form.controls.beginnLokalzeit.setValue('08:00');
    form.controls.endeLokalzeit.setValue('16:30');
    expect(fixture.componentInstance.schichtdauerStunden()).toBe('8,5');

    form.controls.endeLokalzeit.setValue('08:00');
    expect(fixture.componentInstance.schichtdauerStunden()).toBe('0');
  });
});
