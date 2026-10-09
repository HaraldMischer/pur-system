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
    component.schichtvorlageForm.setValue({
      bezeichnung: '  Frühschicht  ',
      beginnLokalzeit: '08:00',
      endeLokalzeit: '16:30',
      endetAmFolgetag: false,
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

  it('should reject an end before the start unless the template ends on the following day', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    component.schichtvorlageForm.patchValue({
      bezeichnung: 'Spätschicht',
      beginnLokalzeit: '16:30',
      endeLokalzeit: '01:00',
      endetAmFolgetag: false,
    });

    await component.saveSchichtvorlage();
    expect(createSchichtvorlage).not.toHaveBeenCalled();

    component.schichtvorlageForm.controls.endetAmFolgetag.setValue(true);
    await component.saveSchichtvorlage();
    expect(createSchichtvorlage).toHaveBeenCalledOnce();
  });
});
