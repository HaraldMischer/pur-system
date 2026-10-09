// pur-system/src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Timestamp } from 'firebase/firestore';

import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import {
  SchichtBearbeitenDialog,
  TSchichtBearbeitenDialogDaten,
} from './schicht-bearbeiten-dialog';

describe('SchichtBearbeitenDialog', () => {
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const createSchicht = vi.fn().mockResolvedValue(undefined);
  const updateSchicht = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();
  let dialogDaten: TSchichtBearbeitenDialogDaten;

  beforeEach(async () => {
    vi.clearAllMocks();
    dialogDaten = {
      pfad: {
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        dienstplanId: '2026-10',
        versionId: 'v-1',
      },
      zeitzone: 'Europe/Berlin',
      datum: '2026-10-05',
      zeitraumStart: '2026-10-01',
      zeitraumEnde: '2026-10-31',
      mitarbeiter: [
        {
          id: 'm-1',
          unternehmerId: 'u-1',
          firmaId: 'f-1',
          aktiv: true,
          filialIds: ['b-1'],
          rollen: ['servicekraft'],
          person: {
            vorname: 'Mia',
            nachname: 'Muster',
            adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
            kontakt: {},
          },
        },
      ],
      schichtvorlagen: [createSchichtvorlage()],
    };
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
            error,
            createSchicht,
            updateSchicht,
            deleteSchicht: vi.fn(),
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
  });

  it('should validate and create a shift that ends on the following day', async () => {
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.schichtForm.patchValue({
      mitarbeiterId: 'm-1',
      datum: '2026-10-05',
    });
    component.schichtForm.controls.schichtvorlageId.setValue('sv-1');

    expect(component.schichtForm.controls.pauseMinuten.value).toBe(30);

    await component.saveSchicht();

    expect(createSchicht).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mitarbeiterId: 'm-1',
        mitarbeiterAnzeigename: 'Muster, Mia',
        schichtvorlageId: 'sv-1',
        schichtvorlageBezeichnung: 'Spätschicht',
        beginn: Timestamp.fromDate(new Date('2026-10-05T16:30:00+02:00')),
        ende: Timestamp.fromDate(new Date('2026-10-06T01:00:00+02:00')),
      }),
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should keep the stored template snapshot when the source template changes', async () => {
    dialogDaten = {
      ...dialogDaten,
      schichtvorlagen: [
        createSchichtvorlage({
          bezeichnung: 'Geänderte Spätschicht',
          beginnLokalzeit: '17:00',
          endeLokalzeit: '02:00',
        }),
      ],
      schicht: {
        ...dialogDaten.pfad,
        id: 's-1',
        mitarbeiterId: 'm-1',
        mitarbeiterAnzeigename: 'Muster, Mia',
        schichtvorlageId: 'sv-1',
        schichtvorlageBezeichnung: 'Spätschicht',
        beginn: Timestamp.fromDate(new Date('2026-10-05T16:30:00+02:00')),
        ende: Timestamp.fromDate(new Date('2026-10-06T01:00:00+02:00')),
        pauseMinuten: 30,
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    };
    const fixture = TestBed.createComponent(SchichtBearbeitenDialog);
    const component = fixture.componentInstance;
    component.schichtForm.controls.pauseMinuten.setValue(45);

    await component.saveSchicht();

    expect(updateSchicht).toHaveBeenCalledWith(
      dialogDaten.pfad,
      's-1',
      expect.objectContaining({
        schichtvorlageId: 'sv-1',
        schichtvorlageBezeichnung: 'Spätschicht',
        beginn: Timestamp.fromDate(new Date('2026-10-05T16:30:00+02:00')),
        ende: Timestamp.fromDate(new Date('2026-10-06T01:00:00+02:00')),
        pauseMinuten: 45,
      }),
    );
  });

  function createSchichtvorlage(overrides = {}) {
    return {
      id: 'sv-1',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      bezeichnung: 'Spätschicht',
      beginnLokalzeit: '16:30',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
      standardpauseMinuten: 30,
      aktiv: true,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
      ...overrides,
    };
  }
});
