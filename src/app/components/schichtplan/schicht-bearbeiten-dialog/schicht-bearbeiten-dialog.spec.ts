// pur-system/src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Timestamp } from 'firebase/firestore';

import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterbelegungStore } from '../../../stores/domain/mitarbeiterbelegung.store';
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
  const hatMitarbeiterZeitkonflikt = vi.fn().mockReturnValue(false);
  let dialogDaten: TSchichtBearbeitenDialogDaten;

  beforeEach(async () => {
    vi.clearAllMocks();
    inProgress.set(false);
    storeError.set(null);
    hatMitarbeiterZeitkonflikt.mockReturnValue(false);
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
        {
          provide: MitarbeiterbelegungStore,
          useValue: { hatMitarbeiterZeitkonflikt },
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
        datum: '2026-10-05',
        mitarbeiterId: 'm-1',
        modellschichtId: 'spaet',
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
        datum: '2026-10-05',
        mitarbeiterId: 'm-2',
        modellschichtId: 'spaet',
      }),
    );
  });

  it('should move an edited shift to a selected day and model cell', async () => {
    dialogDaten = createDialogDaten({
      schicht: createSchichtEintrag(),
      verschiebeziele: [
        ...createDialogDaten().verschiebeziele,
        {
          datum: '2026-10-06',
          modellschicht: {
            ...createDialogDaten().modellschicht,
            id: 'frueh',
            bezeichnung: 'Früh',
          },
          rasterzeit: {
            modellschichtId: 'frueh',
            beginnLokalzeit: '07:00',
            endeLokalzeit: '12:00',
            beginntAmFolgetag: false,
            endetAmFolgetag: false,
          },
          schichtIds: [],
        },
      ],
    });
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.toggleVerschiebemodus();
    component.schichtForm.controls.datum.setValue('2026-10-06');
    component.handleDatumChange();

    await component.saveSchicht();

    expect(updateSchicht).toHaveBeenCalledWith(dialogDaten.pfad, 's-1', {
      datum: '2026-10-06',
      mitarbeiterId: 'm-1',
      modellschichtId: 'frueh',
    });
  });

  it('should block moving into an occupied single model cell', async () => {
    const basis = createDialogDaten();
    dialogDaten = createDialogDaten({
      schicht: createSchichtEintrag(),
      verschiebeziele: [
        ...basis.verschiebeziele,
        {
          datum: '2026-10-06',
          modellschicht: basis.modellschicht,
          rasterzeit: basis.rasterzeit,
          schichtIds: ['s-fremd'],
        },
      ],
    });
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.schichtForm.patchValue({ datum: '2026-10-06', modellschichtId: 'spaet' });

    await component.saveSchicht();

    expect(component.zielIstBelegt()).toBe(true);
    expect(updateSchicht).not.toHaveBeenCalled();
  });

  it('should reject an unavailable employee', async () => {
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.schichtForm.controls.mitarbeiterId.setValue('m-fremd');

    await component.saveSchicht();

    expect(component.schichtForm.invalid).toBe(true);
    expect(createSchicht).not.toHaveBeenCalled();
  });

  it('should show and block a company-wide employee time conflict', async () => {
    hatMitarbeiterZeitkonflikt.mockReturnValue(true);
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.schichtForm.controls.mitarbeiterId.setValue('m-1');
    fixture.detectChanges();

    await component.saveSchicht();

    expect(component.hatZeitkonflikt()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Der Mitarbeiter ist im gewählten Zeitraum bereits eingeplant.',
    );
    expect(createSchicht).not.toHaveBeenCalled();
  });

  it('should exclude the edited shift itself from the time conflict check', () => {
    dialogDaten = createDialogDaten({ schicht: createSchichtEintrag() });
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    fixture.detectChanges();

    expect(hatMitarbeiterZeitkonflikt).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({
        beginn: Timestamp.fromDate(new Date('2026-10-05T16:30:00+02:00')),
        ende: Timestamp.fromDate(new Date('2026-10-06T01:00:00+02:00')),
      }),
      JSON.stringify(['b-1', '2026-10', 'v-1', 's-1']),
    );
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

  it('should show a service error for a nonexistent local time', async () => {
    createSchicht.mockRejectedValueOnce(
      new Error('Die lokale Uhrzeit existiert in der gewählten Zeitzone nicht.'),
    );
    const basis = createDialogDaten();
    const rasterzeit = {
      ...basis.rasterzeit,
      beginnLokalzeit: '02:30',
      endeLokalzeit: '03:30',
      endetAmFolgetag: false,
    };
    dialogDaten = createDialogDaten({
      datum: '2026-03-29',
      rasterzeit,
      verschiebeziele: [
        {
          datum: '2026-03-29',
          modellschicht: basis.modellschicht,
          rasterzeit,
          schichtIds: [],
        },
      ],
    });
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.schichtForm.controls.mitarbeiterId.setValue('m-1');

    await component.saveSchicht();
    fixture.detectChanges();

    expect(component.error()).toContain('existiert');
    expect(createSchicht).toHaveBeenCalledOnce();
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
        beginn: { lokalzeit: '16:30', tag: 'starttag' },
        mehrfachbelegungErlaubt: false,
      },
      rasterzeit: {
        modellschichtId: 'spaet',
        beginnLokalzeit: '16:30',
        endeLokalzeit: '01:00',
        beginntAmFolgetag: false,
        endetAmFolgetag: true,
      },
      verschiebeziele: [
        {
          datum: '2026-10-05',
          modellschicht: {
            id: 'spaet',
            dienstplanId: '2026-10',
            unternehmerId: 'u-1',
            firmaId: 'f-1',
            filialeId: 'b-1',
            bezeichnung: 'Spät',
            reihenfolge: 1,
            beginn: { lokalzeit: '16:30', tag: 'starttag' },
            mehrfachbelegungErlaubt: false,
          },
          rasterzeit: {
            modellschichtId: 'spaet',
            beginnLokalzeit: '16:30',
            endeLokalzeit: '01:00',
            beginntAmFolgetag: false,
            endetAmFolgetag: true,
          },
          schichtIds: [],
        },
      ],
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
      datum: '2026-10-05',
      mitarbeiterId: 'm-1',
      modellschichtId: 'spaet',
      beginn: Timestamp.fromDate(new Date('2026-10-05T16:30:00+02:00')),
      ende: Timestamp.fromDate(new Date('2026-10-06T01:00:00+02:00')),
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
      ...overrides,
    };
  }
});
