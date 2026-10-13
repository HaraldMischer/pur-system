// pur-system/src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import {
  SchichtmodellBearbeitenDialog,
  TSchichtmodellBearbeitenDialogDaten,
} from './schichtmodell-bearbeiten-dialog';

describe('SchichtmodellBearbeitenDialog', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const createSchichtmodell = vi.fn().mockResolvedValue(undefined);
  const updateSchichtmodell = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();

  async function createComponent(daten: TSchichtmodellBearbeitenDialogDaten) {
    await TestBed.configureTestingModule({
      imports: [SchichtmodellBearbeitenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: daten },
        {
          provide: SchichtmodellStore,
          useValue: { inProgress, error, createSchichtmodell, updateSchichtmodell },
        },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
      ],
    }).compileComponents();
    return TestBed.createComponent(SchichtmodellBearbeitenDialog);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    inProgress.set(false);
    error.set(null);
  });

  it('should create an active model with at least one normalized model shift', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const schicht = component.schichtmodellForm.controls.modellschichten.at(0);
    component.schichtmodellForm.controls.bezeichnung.setValue(' Sommer ');
    schicht.patchValue({
      bezeichnung: ' Früh ',
      beginnLokalzeit: '07:00',
      endeLokalzeit: '14:00',
    });

    await component.saveSchichtmodell();

    expect(createSchichtmodell).toHaveBeenCalledWith(pfad, {
      bezeichnung: 'Sommer',
      modellschichten: [
        expect.objectContaining({
          bezeichnung: 'Früh',
          reihenfolge: 0,
          standardpauseMinuten: 30,
        }),
      ],
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should add, reorder and remove model shifts while retaining one shift', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;

    component.addModellschicht();
    component.schichtmodellForm.controls.modellschichten.at(0).controls.bezeichnung.setValue('A');
    component.schichtmodellForm.controls.modellschichten.at(1).controls.bezeichnung.setValue('B');
    component.moveModellschichtDown(0);

    expect(
      component.schichtmodellForm.controls.modellschichten.at(0).controls.bezeichnung.value,
    ).toBe('B');
    component.removeModellschicht(1);
    component.removeModellschicht(0);
    expect(component.schichtmodellForm.controls.modellschichten).toHaveLength(1);
  });

  it('should reject equal times and infer a shift ending on the following day', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const schicht = component.schichtmodellForm.controls.modellschichten.at(0);
    component.schichtmodellForm.controls.bezeichnung.setValue('Nacht');
    schicht.patchValue({
      bezeichnung: 'Nacht',
      beginnLokalzeit: '20:00',
      endeLokalzeit: '20:00',
    });
    await component.saveSchichtmodell();
    expect(createSchichtmodell).not.toHaveBeenCalled();

    schicht.controls.endeLokalzeit.setValue('04:00');
    await component.saveSchichtmodell();
    expect(createSchichtmodell).toHaveBeenCalledWith(
      pfad,
      expect.objectContaining({
        modellschichten: [
          expect.objectContaining({ endetAmFolgetag: true, standardpauseMinuten: 30 }),
        ],
      }),
    );
  });
});
