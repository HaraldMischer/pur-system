// pur-system/src/app/components/schichtplan/dienstplan-sondertage-dialog/dienstplan-sondertage-dialog.spec.ts

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import type { IDienstplanKalendertag } from '../../../commons/models/domain/dienstplan-kalendertag';
import { DienstplanSondertageDialog } from './dienstplan-sondertage-dialog';

describe('DienstplanSondertageDialog', () => {
  const close = vi.fn();
  const kalendertage: IDienstplanKalendertag[] = [
    {
      datum: '2026-11-01',
      wochentag: 'sonntag',
      istSonntag: true,
      aktiveSondertage: [],
      oeffnungsregelQuelle: 'sondertag',
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '18:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
      bezeichnung: 'Allerheiligen',
    },
  ];

  async function createComponent(): Promise<DienstplanSondertageDialog> {
    await TestBed.configureTestingModule({
      imports: [DienstplanSondertageDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { kalendertage } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    return TestBed.createComponent(DienstplanSondertageDialog).componentInstance;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should keep preparation on the first and follow-up on the last shift', async () => {
    const component = await createComponent();
    const schichten = component.form.controls.tage.at(0).controls.schichten;
    const ersteSchicht = schichten.at(0);
    ersteSchicht.controls.vorbereitungsminuten.setValue(30);
    ersteSchicht.controls.nachbereitungsminuten.setValue(15);

    component.addSchicht(0);

    const zweiteSchicht = schichten.at(1);
    expect(ersteSchicht.controls.vorbereitungsminuten.value).toBe(30);
    expect(ersteSchicht.controls.nachbereitungsminuten.value).toBe(0);
    expect(zweiteSchicht.controls.vorbereitungsminuten.value).toBe(0);
    expect(zweiteSchicht.controls.nachbereitungsminuten.value).toBe(15);

    component.removeSchicht(0, 0);

    expect(schichten.at(0)).toBe(zweiteSchicht);
    expect(zweiteSchicht.controls.vorbereitungsminuten.value).toBe(30);
    expect(zweiteSchicht.controls.nachbereitungsminuten.value).toBe(15);

    component.addSchicht(0);
    component.removeSchicht(0, 1);

    expect(schichten.at(0)).toBe(zweiteSchicht);
    expect(zweiteSchicht.controls.vorbereitungsminuten.value).toBe(30);
    expect(zweiteSchicht.controls.nachbereitungsminuten.value).toBe(15);
  });

  it('should number and redistribute all shifts evenly when adding another shift', async () => {
    const component = await createComponent();
    const schichten = component.form.controls.tage.at(0).controls.schichten;

    expect(schichten.at(0).controls.bezeichnung.value).toBe('Schicht 1');

    component.addSchicht(0);

    expect(schichten.at(1).controls.bezeichnung.value).toBe('Schicht 2');
    expect(schichten.at(0).controls.beginnLokalzeit.value).toBe('18:00');
    expect(schichten.at(0).controls.endeLokalzeit.value).toBe('21:30');
    expect(schichten.at(1).controls.beginnLokalzeit.value).toBe('21:30');
    expect(schichten.at(1).controls.endeLokalzeit.value).toBe('01:00');

    component.addSchicht(0);

    expect(schichten.at(2).controls.bezeichnung.value).toBe('Schicht 3');
    expect(schichten.at(0).controls.endeLokalzeit.value).toBe('20:15');
    expect(schichten.at(1).controls.beginnLokalzeit.value).toBe('20:15');
    expect(schichten.at(1).controls.endeLokalzeit.value).toBe('22:45');
    expect(schichten.at(2).controls.beginnLokalzeit.value).toBe('22:45');
  });

  it('should derive the boundary days from the entered local times', async () => {
    const component = await createComponent();
    const schicht = component.form.controls.tage.at(0).controls.schichten.at(0);

    schicht.controls.beginnLokalzeit.setValue('00:30');
    expect(schicht.controls.beginnTag.value).toBe('folgetag');

    schicht.controls.beginnLokalzeit.setValue('18:30');
    expect(schicht.controls.beginnTag.value).toBe('starttag');

    schicht.controls.endeLokalzeit.setValue('00:30');
    expect(schicht.controls.endeTag.value).toBe('folgetag');
  });

  it('should save preparation only on the first and follow-up only on the last shift', async () => {
    const component = await createComponent();
    const schichten = component.form.controls.tage.at(0).controls.schichten;
    schichten.at(0).controls.vorbereitungsminuten.setValue(30);
    schichten.at(0).controls.nachbereitungsminuten.setValue(15);
    component.addSchicht(0);
    schichten.at(1).patchValue({
      beginnLokalzeit: '21:30',
      endeLokalzeit: '01:00',
      endeTag: 'folgetag',
    });

    component.save();

    expect(close).toHaveBeenCalledWith([
      {
        datum: '2026-11-01',
        bezeichnung: 'Schicht 1',
        reihenfolge: 0,
        beginn: { lokalzeit: '18:00', tag: 'starttag' },
        ende: { lokalzeit: '21:30', tag: 'starttag' },
        vorbereitungsminuten: 30,
        nachbereitungsminuten: 0,
        mehrfachbelegungErlaubt: false,
      },
      {
        datum: '2026-11-01',
        bezeichnung: 'Schicht 2',
        reihenfolge: 1,
        beginn: { lokalzeit: '21:30', tag: 'starttag' },
        ende: { lokalzeit: '01:00', tag: 'folgetag' },
        vorbereitungsminuten: 0,
        nachbereitungsminuten: 15,
        mehrfachbelegungErlaubt: false,
      },
    ]);
  });
});
