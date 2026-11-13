// pur-system/src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import type { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import {
  SchichtmodellBearbeitenDialog,
  TSchichtmodellBearbeitenDialogDaten,
} from './schichtmodell-bearbeiten-dialog';

describe('SchichtmodellBearbeitenDialog', () => {
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
  const bestand: ISchichtmodellBestand = {
    schichtmodell: {
      id: 'modell-1',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      bezeichnung: 'Modell 1',
      aktiv: true,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    tagesvorlagenschichten: [
      {
        id: 'schicht-1',
        schichtmodellId: 'modell-1',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        vorlage: 'wochentag',
        bezeichnung: 'Frühschicht',
        reihenfolge: 0,
        vorbereitungsminuten: 0,
        nachbereitungsminuten: 0,
        mehrfachbelegungErlaubt: false,
      },
      {
        id: 'schicht-2',
        schichtmodellId: 'modell-1',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        vorlage: 'sonntag',
        bezeichnung: 'Sonntagsschicht',
        reihenfolge: 0,
        vorbereitungsminuten: 0,
        nachbereitungsminuten: 0,
        mehrfachbelegungErlaubt: false,
      },
    ],
  };
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const createSchichtmodell = vi.fn().mockResolvedValue(undefined);
  const updateSchichtmodell = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();

  async function createComponent(schichtmodellBestand?: ISchichtmodellBestand) {
    const daten: TSchichtmodellBearbeitenDialogDaten = {
      pfad,
      oeffnungen,
      ...(schichtmodellBestand ? { bestand: schichtmodellBestand } : {}),
    };
    await TestBed.configureTestingModule({
      imports: [SchichtmodellBearbeitenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: daten },
        {
          provide: SchichtmodellStore,
          useValue: {
            inProgress,
            error,
            createSchichtmodell,
            updateSchichtmodell,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    return TestBed.createComponent(SchichtmodellBearbeitenDialog).componentInstance;
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

    expect(createSchichtmodell).toHaveBeenCalledWith(
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

  it('should prefill editable names for newly added shifts', async () => {
    const component = await createComponent();
    const schichten = component.form.controls.wochentag;

    expect(schichten.at(0).controls.bezeichnung.value).toBe('Schicht 1');

    component.addSchicht('wochentag');

    expect(schichten.at(1).controls.bezeichnung.value).toBe('Schicht 2');
  });

  it('should only save an existing model after an actual change', async () => {
    const component = await createComponent(bestand);

    expect(component.hatAenderungen()).toBe(false);

    await component.save();

    expect(updateSchichtmodell).not.toHaveBeenCalled();

    component.form.controls.bezeichnung.setValue(' Modell 1 ');
    expect(component.hatAenderungen()).toBe(false);

    component.form.controls.bezeichnung.setValue('Modell 2');
    expect(component.hatAenderungen()).toBe(true);

    component.form.controls.bezeichnung.setValue('Modell 1');
    expect(component.hatAenderungen()).toBe(false);

    component.form.controls.bezeichnung.setValue('Modell 2');
    await component.save();

    expect(updateSchichtmodell).toHaveBeenCalledTimes(1);
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

  it('should redistribute all shifts evenly when adding another shift', async () => {
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
    expect(ersteSchicht.controls.endeLokalzeit.value).toBe('13:00');
    expect(zweiteSchicht.controls.beginnLokalzeit.value).toBe('13:00');
    expect(zweiteSchicht.controls.endeLokalzeit.value).toBe('19:00');
    expect(schichten.at(2).controls.beginnLokalzeit.value).toBe('19:00');

    component.removeSchicht('wochentag', 2);
    expect(zweiteSchicht.controls.endeLokalzeit.value).toBe('01:00');
  });
});
