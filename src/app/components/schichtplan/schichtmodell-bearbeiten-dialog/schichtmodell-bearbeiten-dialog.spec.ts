// pur-system/src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ISchichtmodellAnlage } from '../../../commons/models/domain/schichtmodell';
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
          standardpauseMinuten: 30,
          mehrfachbelegungErlaubt: false,
        }),
      ],
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should add and remove model shifts while retaining one shift', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const bestehendeSchicht = component.schichtmodellForm.controls.modellschichten.at(0);

    component.addModellschicht();
    expect(component.schichtmodellForm.controls.modellschichten.at(0)).not.toBe(bestehendeSchicht);
    expect(component.schichtmodellForm.controls.modellschichten.at(1)).toBe(bestehendeSchicht);
    component.removeModellschicht(0);
    component.removeModellschicht(0);
    expect(component.schichtmodellForm.controls.modellschichten).toHaveLength(1);
    expect(component.schichtmodellForm.controls.modellschichten.at(0)).toBe(bestehendeSchicht);
  });

  it('should submit model shifts chronologically by start time', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    component.schichtmodellForm.controls.bezeichnung.setValue('Standard');
    component.schichtmodellForm.controls.modellschichten.at(0).patchValue({
      bezeichnung: 'Spät',
      beginnLokalzeit: '16:00',
      endeLokalzeit: '01:00',
    });
    component.addModellschicht();
    component.schichtmodellForm.controls.modellschichten.at(0).patchValue({
      bezeichnung: 'Früh',
      beginnLokalzeit: '07:00',
      endeLokalzeit: '16:00',
    });

    await component.saveSchichtmodell();

    const anlage = createSchichtmodell.mock.calls[0][1] as ISchichtmodellAnlage;
    expect(anlage.modellschichten.map(({ bezeichnung }) => bezeichnung)).toEqual(['Früh', 'Spät']);
  });

  it('should submit the selected multiple occupancy for a model shift', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const schicht = component.schichtmodellForm.controls.modellschichten.at(0);
    component.schichtmodellForm.controls.bezeichnung.setValue('Standard');
    schicht.patchValue({
      bezeichnung: 'Früh',
      beginnLokalzeit: '07:00',
      endeLokalzeit: '14:00',
      mehrfachbelegungErlaubt: true,
    });

    await component.saveSchichtmodell();

    const anlage = createSchichtmodell.mock.calls[0][1] as ISchichtmodellAnlage;
    expect(anlage.modellschichten[0].mehrfachbelegungErlaubt).toBe(true);
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
