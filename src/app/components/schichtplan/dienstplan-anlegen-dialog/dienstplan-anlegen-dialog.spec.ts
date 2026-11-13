// pur-system/src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.spec.ts

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

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
  const storeError = signal<string | null>(null);
  const createDienstplan = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();
  const open = vi.fn().mockReturnValue({ afterClosed: () => of([]) });
  const dienstplanStoreMock = { createDienstplan, inProgress, error: storeError };
  const dialogRefMock = { close };
  const dialogMock = { open };
  let fixture: ComponentFixture<DienstplanAnlegenDialog>;

  beforeEach(async () => {
    vi.clearAllMocks();
    inProgress.set(false);
    storeError.set(null);
    createDienstplan.mockResolvedValue(undefined);
    open.mockReturnValue({ afterClosed: () => of([]) });
    await setup({ pfad, monat: '2026-10', schichtmodelle: [schichtmodell] });
  });

  async function setup(daten: TDienstplanAnlegenDialogDaten): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DienstplanAnlegenDialog],
      providers: [{ provide: MAT_DIALOG_DATA, useValue: daten }],
    });
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRefMock });
    TestBed.overrideProvider(MatDialog, { useValue: dialogMock });
    TestBed.overrideProvider(DienstplanStore, { useValue: dienstplanStoreMock });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(DienstplanAnlegenDialog);
    fixture.detectChanges();
    expect(fixture.componentInstance.dienstplanStore).toBe(dienstplanStoreMock);
  }

  it('should require a daily model before creating the monthly plan', async () => {
    await fixture.componentInstance.saveDienstplan();

    expect(createDienstplan).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('should create the monthly plan with the selected daily model', async () => {
    fixture.componentInstance.dienstplanForm.controls.schichtmodellId.setValue('modell-1');

    await fixture.componentInstance.saveDienstplan();

    expect(createDienstplan).toHaveBeenCalledWith(pfad, '2026-10', schichtmodell, []);
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should keep the dialog open when the day-structure dialog is cancelled', async () => {
    open.mockReturnValueOnce({ afterClosed: () => of(undefined) });
    fixture.componentInstance.dienstplanForm.controls.schichtmodellId.setValue('modell-1');

    await fixture.componentInstance.saveDienstplan();

    expect(createDienstplan).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('should show the known plan creation error', async () => {
    const fehlermeldung = 'Der Dienstplan konnte nicht angelegt werden.';
    createDienstplan.mockImplementationOnce(async () => {
      storeError.set(fehlermeldung);
      throw new Error(fehlermeldung);
    });
    fixture.componentInstance.dienstplanForm.controls.schichtmodellId.setValue('modell-1');

    await fixture.componentInstance.saveDienstplan();

    expect(fixture.componentInstance.error()).toBe(fehlermeldung);
    expect(close).not.toHaveBeenCalled();
  });

  function createSchichtmodell(): ISchichtmodellBestand {
    return {
      schichtmodell: {
        ...pfad,
        id: 'modell-1',
        bezeichnung: 'Standard',
        aktiv: true,
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      tagesvorlagenschichten: [
        {
          ...pfad,
          id: 'werktag-frueh',
          schichtmodellId: 'modell-1',
          vorlage: 'wochentag',
          bezeichnung: 'Früh',
          reihenfolge: 0,
          ende: { lokalzeit: '16:00', tag: 'starttag' },
          mehrfachbelegungErlaubt: false,
          vorbereitungsminuten: 0,
          nachbereitungsminuten: 0,
        },
      ],
    };
  }
});
