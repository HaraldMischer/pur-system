// pur-system/src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.spec.ts

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import { DienstplanFachfehler } from '../../../services/domain/dienstplan.service';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { HinweisDialog } from '../../shared/hinweis-dialog/hinweis-dialog';
import {
  DienstplanAnlegenDialog,
  TDienstplanAnlegenDialogDaten,
} from './dienstplan-anlegen-dialog';

describe('DienstplanAnlegenDialog', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const schichtmodell = createSchichtmodell();
  const ungueltigesSchichtmodell = createUngueltigesSchichtmodell();
  const kalendertage = [
    {
      datum: '2026-10-01',
      wochentag: 'donnerstag' as const,
      istSonntag: false,
      aktiveSondertage: [],
      oeffnungsregelQuelle: 'wochentag' as const,
      oeffnungsregel: {
        geoeffnet: true as const,
        beginnLokalzeit: '08:00',
        endeLokalzeit: '23:00',
        endetAmFolgetag: false,
      },
      tagesstrukturQuelle: 'wochentagsvorlage' as const,
    },
  ];
  const inProgress = signal(false);
  const storeError = signal<string | null>(null);
  const createDienstplan = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();
  const open = vi.fn();
  const dienstplanStoreMock = { createDienstplan, inProgress, error: storeError };
  const dialogRefMock = { close };
  const dialogMock = { open };
  let fixture: ComponentFixture<DienstplanAnlegenDialog>;

  beforeEach(async () => {
    vi.clearAllMocks();
    inProgress.set(false);
    storeError.set(null);
    createDienstplan.mockResolvedValue(undefined);
    await setup({
      pfad,
      monat: '2026-10',
      schichtmodelle: [schichtmodell, ungueltigesSchichtmodell],
      kalendertage,
    });
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

    expect(createDienstplan).toHaveBeenCalledWith(pfad, '2026-10', schichtmodell);
    expect(close).toHaveBeenCalledWith(true);
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

  it('should show incompatible opening times in a notice dialog', async () => {
    const fehlermeldung =
      'Der Dienstplan konnte nicht angelegt werden. Das Schichtmodell „Standard“ ist für die aktuellen Öffnungszeiten nicht vollständig oder nicht mehr gültig. Bitte passen Sie die Schichtvorlagen an.';
    createDienstplan.mockImplementationOnce(async () => {
      storeError.set(fehlermeldung);
      throw new DienstplanFachfehler(fehlermeldung, 'schichtmodell-oeffnungszeiten');
    });
    fixture.componentInstance.dienstplanForm.controls.schichtmodellId.setValue('modell-1');

    await fixture.componentInstance.saveDienstplan();

    expect(open).toHaveBeenCalledWith(HinweisDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        titel: 'Der Dienstplan wurde nicht angelegt',
        nachricht:
          'Das Schichtmodell „Standard“ ist für die aktuellen Öffnungszeiten nicht vollständig oder nicht mehr gültig. Bitte passen Sie die Schichtvorlagen an.',
      },
    });
    expect(fixture.componentInstance.error()).toBeNull();
    expect(close).not.toHaveBeenCalled();
  });

  it('should reject an incompatible shift model before creating the monthly plan', async () => {
    fixture.componentInstance.dienstplanForm.controls.schichtmodellId.setValue('modell-2');

    await fixture.componentInstance.saveDienstplan();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(HinweisDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        titel: 'Der Dienstplan wurde nicht angelegt',
        nachricht:
          'Das Schichtmodell „Ungültig“ ist für die aktuellen Öffnungszeiten nicht vollständig oder nicht mehr gültig. Bitte passen Sie die Schichtvorlagen an.',
      },
    });
    expect(createDienstplan).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  function createSchichtmodell(): ISchichtmodellBestand {
    return {
      schichtmodell: {
        ...pfad,
        id: 'modell-1',
        bezeichnung: 'Standard',
        aktiv: true,
        vorbereitungsminuten: 0,
        nachbereitungsminuten: 0,
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
        },
      ],
    };
  }

  function createUngueltigesSchichtmodell(): ISchichtmodellBestand {
    return {
      schichtmodell: {
        ...pfad,
        id: 'modell-2',
        bezeichnung: 'Ungültig',
        aktiv: true,
        vorbereitungsminuten: 0,
        nachbereitungsminuten: 0,
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      tagesvorlagenschichten: [
        {
          ...pfad,
          id: 'ungueltig-frueh',
          schichtmodellId: 'modell-2',
          vorlage: 'wochentag',
          bezeichnung: 'Früh',
          reihenfolge: 0,
          ende: { lokalzeit: '07:00', tag: 'starttag' },
          mehrfachbelegungErlaubt: false,
        },
        {
          ...pfad,
          id: 'ungueltig-spaet',
          schichtmodellId: 'modell-2',
          vorlage: 'wochentag',
          bezeichnung: 'Spät',
          reihenfolge: 1,
          beginn: { lokalzeit: '07:00', tag: 'starttag' },
          mehrfachbelegungErlaubt: false,
        },
      ],
    };
  }
});
