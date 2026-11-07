// pur-system/src/app/components/schichtplan/schicht-tagesmodell-bearbeiten-dialog/schicht-tagesmodell-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SchichtTagesmodellStore } from '../../../stores/domain/schicht-tagesmodell.store';
import {
  SchichtTagesmodellBearbeitenDialog,
  TSchichtTagesmodellBearbeitenDialogDaten,
} from './schicht-tagesmodell-bearbeiten-dialog';

describe('SchichtTagesmodellBearbeitenDialog', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const oeffnungen = {
    wochentag: {
      geoeffnet: true as const,
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    },
    sonntag: {
      geoeffnet: true as const,
      beginnLokalzeit: '10:00',
      endeLokalzeit: '22:00',
      endetAmFolgetag: false,
    },
  };
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const createSchichtTagesmodell = vi.fn().mockResolvedValue(undefined);
  const updateSchichtTagesmodell = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();

  async function createComponent() {
    const daten: TSchichtTagesmodellBearbeitenDialogDaten = { pfad, oeffnungen };
    await TestBed.configureTestingModule({
      imports: [SchichtTagesmodellBearbeitenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: daten },
        {
          provide: SchichtTagesmodellStore,
          useValue: {
            inProgress,
            error,
            createSchichtTagesmodell,
            updateSchichtTagesmodell,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    return TestBed.createComponent(SchichtTagesmodellBearbeitenDialog).componentInstance;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    inProgress.set(false);
    error.set(null);
  });

  it('should derive and save the day assignments from the effective opening rules', async () => {
    const component = await createComponent();
    component.form.controls.bezeichnung.setValue(' Standard ');
    component.form.controls.wochentag.at(0).patchValue({
      bezeichnung: ' Früh ',
    });
    component.addSchicht('wochentag');
    component.form.controls.wochentag.at(1).patchValue({
      bezeichnung: ' Spät ',
      beginnLokalzeit: '20:00',
    });
    component.form.controls.sonntag.at(0).patchValue({
      bezeichnung: ' Tag ',
    });

    await component.save();

    expect(createSchichtTagesmodell).toHaveBeenCalledWith(
      pfad,
      {
        bezeichnung: 'Standard',
        tagesvorlagenschichten: [
          {
            vorlage: 'wochentag',
            bezeichnung: 'Früh',
            reihenfolge: 0,
            ende: { lokalzeit: '16:00', tag: 'starttag' },
            vorbereitungsminuten: 0,
            nachbereitungsminuten: 0,
            mehrfachbelegungErlaubt: false,
          },
          {
            vorlage: 'wochentag',
            bezeichnung: 'Spät',
            reihenfolge: 1,
            beginn: { lokalzeit: '20:00', tag: 'starttag' },
            vorbereitungsminuten: 0,
            nachbereitungsminuten: 0,
            mehrfachbelegungErlaubt: false,
          },
          {
            vorlage: 'sonntag',
            bezeichnung: 'Tag',
            reihenfolge: 0,
            vorbereitungsminuten: 0,
            nachbereitungsminuten: 0,
            mehrfachbelegungErlaubt: false,
          },
        ],
      },
      oeffnungen,
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should keep preparation on the first and follow-up on the last shift', async () => {
    const component = await createComponent();
    const schichten = component.form.controls.wochentag;
    const ersteSchicht = schichten.at(0);
    ersteSchicht.controls.vorbereitungsminuten.setValue(30);
    ersteSchicht.controls.nachbereitungsminuten.setValue(15);

    component.addSchicht('wochentag');

    const zweiteSchicht = schichten.at(1);
    expect(ersteSchicht.controls.vorbereitungsminuten.value).toBe(30);
    expect(ersteSchicht.controls.nachbereitungsminuten.value).toBe(0);
    expect(zweiteSchicht.controls.vorbereitungsminuten.value).toBe(0);
    expect(zweiteSchicht.controls.nachbereitungsminuten.value).toBe(15);

    component.removeSchicht('wochentag', 0);

    expect(schichten.at(0)).toBe(zweiteSchicht);
    expect(zweiteSchicht.controls.vorbereitungsminuten.value).toBe(30);
    expect(zweiteSchicht.controls.nachbereitungsminuten.value).toBe(15);

    component.addSchicht('wochentag');
    component.removeSchicht('wochentag', 1);

    expect(schichten.at(0)).toBe(zweiteSchicht);
    expect(zweiteSchicht.controls.vorbereitungsminuten.value).toBe(30);
    expect(zweiteSchicht.controls.nachbereitungsminuten.value).toBe(15);
  });

  it('should split the remaining last shift when adding another shift', async () => {
    const component = await createComponent();
    const schichten = component.form.controls.wochentag;
    const ersteSchicht = schichten.at(0);

    component.addSchicht('wochentag');

    const zweiteSchicht = schichten.at(1);
    expect(ersteSchicht.controls.endeLokalzeit.value).toBe('16:00');
    expect(zweiteSchicht.controls.beginnLokalzeit.value).toBe('16:00');

    zweiteSchicht.controls.beginnLokalzeit.setValue('17:00');
    expect(ersteSchicht.controls.endeLokalzeit.value).toBe('16:00');

    component.addSchicht('wochentag');
    expect(zweiteSchicht.controls.endeLokalzeit.value).toBe('21:00');
    expect(schichten.at(2).controls.beginnLokalzeit.value).toBe('21:00');

    component.removeSchicht('wochentag', 2);
    expect(zweiteSchicht.controls.endeLokalzeit.value).toBe('01:00');
  });
});
