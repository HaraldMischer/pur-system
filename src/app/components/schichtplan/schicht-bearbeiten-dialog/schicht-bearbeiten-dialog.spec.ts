// pur-system/src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Timestamp } from 'firebase/firestore';

import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import {
  SchichtBearbeitenDialog,
  TSchichtBearbeitenDialogDaten,
} from './schicht-bearbeiten-dialog';

describe('SchichtBearbeitenDialog', () => {
  const inProgress = signal(false);
  const storeError = signal<string | null>(null);
  const createSchicht = vi.fn().mockResolvedValue(undefined);
  const updateSchicht = vi.fn().mockResolvedValue(undefined);
  const deleteSchicht = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();
  let dialogDaten: TSchichtBearbeitenDialogDaten;

  beforeEach(async () => {
    vi.clearAllMocks();
    inProgress.set(false);
    storeError.set(null);
    dialogDaten = createDialogDaten();
    await TestBed.configureTestingModule({
      imports: [SchichtBearbeitenDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useFactory: () => dialogDaten,
        },
        {
          provide: DienstplanStore,
          useValue: {
            inProgress,
            error: storeError,
            createSchicht,
            updateSchicht,
            deleteSchicht,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
  });

  it('should create a shift in the selected model cell', async () => {
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.schichtForm.controls.mitarbeiterId.setValue('m-1');

    await component.saveSchicht();

    expect(createSchicht).toHaveBeenCalledWith(
      dialogDaten.pfad,
      expect.objectContaining({
        mitarbeiterId: 'm-1',
        modellschichtId: 'spaet',
        beginn: Timestamp.fromDate(new Date('2026-10-05T16:30:00+02:00')),
        ende: Timestamp.fromDate(new Date('2026-10-06T01:00:00+02:00')),
        pauseMinuten: 30,
      }),
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should show date and model data as readonly values', () => {
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const readonlyInputs = Array.from(
      compiled.querySelectorAll<HTMLInputElement>('input[readonly]'),
    );

    expect(readonlyInputs.map((input) => input.value)).toEqual([
      '05.10.2026',
      'Spät',
      '16:30',
      '01:00',
      '30',
    ]);
  });

  it('should update only after the employee assignment changes', async () => {
    dialogDaten = createDialogDaten({
      schicht: createSchichtEintrag({ mitarbeiterId: 'm-1' }),
    });
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;

    await component.saveSchicht();
    expect(updateSchicht).not.toHaveBeenCalled();

    component.schichtForm.controls.mitarbeiterId.setValue('m-2');
    await component.saveSchicht();

    expect(updateSchicht).toHaveBeenCalledWith(
      dialogDaten.pfad,
      's-1',
      expect.objectContaining({
        mitarbeiterId: 'm-2',
        modellschichtId: 'spaet',
        beginn: Timestamp.fromDate(new Date('2026-10-05T16:30:00+02:00')),
        ende: Timestamp.fromDate(new Date('2026-10-06T01:00:00+02:00')),
        pauseMinuten: 30,
      }),
    );
  });

  it('should reject an unavailable employee', async () => {
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.schichtForm.controls.mitarbeiterId.setValue('m-fremd');

    await component.saveSchicht();

    expect(component.schichtForm.invalid).toBe(true);
    expect(createSchicht).not.toHaveBeenCalled();
  });

  it('should delete the edited shift', async () => {
    dialogDaten = createDialogDaten({ schicht: createSchichtEintrag() });
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);

    await fixture.componentInstance.deleteSchicht();

    expect(deleteSchicht).toHaveBeenCalledWith(dialogDaten.pfad, 's-1');
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should disable the form while a write is in progress', () => {
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    fixture.detectChanges();

    inProgress.set(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.schichtForm.disabled).toBe(true);
  });

  it('should show an error for a nonexistent local time', async () => {
    dialogDaten = createDialogDaten({
      datum: '2026-03-29',
      modellschicht: {
        ...createDialogDaten().modellschicht,
        beginnLokalzeit: '02:30',
        endeLokalzeit: '03:30',
        endetAmFolgetag: false,
      },
    });
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.schichtForm.controls.mitarbeiterId.setValue('m-1');

    await component.saveSchicht();
    fixture.detectChanges();

    expect(component.error()).toContain('existiert');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(createSchicht).not.toHaveBeenCalled();
  });

  function createDialogDaten(
    overrides: Partial<TSchichtBearbeitenDialogDaten> = {},
  ): TSchichtBearbeitenDialogDaten {
    return {
      pfad: {
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        dienstplanId: '2026-10',
        versionId: 'v-1',
      },
      zeitzone: 'Europe/Berlin',
      datum: '2026-10-05',
      mitarbeiter: [createMitarbeiter('m-1', 'Mia'), createMitarbeiter('m-2', 'Max')],
      modellschicht: {
        id: 'spaet',
        dienstplanId: '2026-10',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        bezeichnung: 'Spät',
        reihenfolge: 1,
        beginnLokalzeit: '16:30',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
        standardpauseMinuten: 30,
      },
      ...overrides,
    };
  }

  function createMitarbeiter(id: string, vorname: string): IMitarbeiterEintrag {
    return {
      id,
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      aktiv: true,
      filialIds: ['b-1'],
      rollen: ['servicekraft'],
      person: {
        vorname,
        nachname: 'Muster',
        adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
        kontakt: {},
      },
    };
  }

  function createSchichtEintrag(overrides: Partial<ISchichtEintrag> = {}): ISchichtEintrag {
    return {
      id: 's-1',
      dienstplanId: '2026-10',
      versionId: 'v-1',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      mitarbeiterId: 'm-1',
      modellschichtId: 'spaet',
      beginn: Timestamp.fromDate(new Date('2026-10-05T16:30:00+02:00')),
      ende: Timestamp.fromDate(new Date('2026-10-06T01:00:00+02:00')),
      pauseMinuten: 30,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
      ...overrides,
    };
  }
});
