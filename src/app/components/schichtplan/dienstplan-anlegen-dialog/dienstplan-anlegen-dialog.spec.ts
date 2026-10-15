// pur-system/src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.spec.ts

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import {
  DienstplanAnlegenDialog,
  TDienstplanAnlegenDialogDaten,
} from './dienstplan-anlegen-dialog';

describe('DienstplanAnlegenDialog', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const schichtmodell = createSchichtmodell();
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const createDienstplan = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();
  let fixture: ComponentFixture<DienstplanAnlegenDialog>;

  beforeEach(async () => {
    vi.clearAllMocks();
    inProgress.set(false);
    error.set(null);
    createDienstplan.mockResolvedValue(undefined);
    await setup({
      pfad,
      monat: '2026-10',
      schichtmodelle: [schichtmodell],
    });
  });

  async function setup(daten: TDienstplanAnlegenDialogDaten): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DienstplanAnlegenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: daten },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: DienstplanStore,
          useValue: { createDienstplan, inProgress, error },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DienstplanAnlegenDialog);
    fixture.detectChanges();
  }

  it('should require a model before creating the monthly plan', async () => {
    await fixture.componentInstance.saveDienstplan();

    expect(createDienstplan).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('should create the monthly plan with the selected model', async () => {
    fixture.componentInstance.dienstplanForm.controls.schichtmodellId.setValue('modell-1');

    await fixture.componentInstance.saveDienstplan();

    expect(createDienstplan).toHaveBeenCalledWith(pfad, '2026-10', schichtmodell);
    expect(close).toHaveBeenCalledWith(true);
  });

  function createSchichtmodell(): ISchichtmodellBestand {
    return {
      schichtmodell: {
        ...pfad,
        id: 'modell-1',
        bezeichnung: 'Sommer',
        aktiv: true,
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      modellschichten: [
        {
          ...pfad,
          id: 'frueh',
          schichtmodellId: 'modell-1',
          bezeichnung: 'Früh',
          beginnLokalzeit: '07:00',
          endeLokalzeit: '12:00',
          endetAmFolgetag: false,
          standardpauseMinuten: 0,
          mehrfachbelegungErlaubt: false,
        },
      ],
    };
  }
});
