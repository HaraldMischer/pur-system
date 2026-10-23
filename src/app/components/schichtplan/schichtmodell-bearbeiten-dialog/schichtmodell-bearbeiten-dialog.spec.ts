// pur-system/src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { STANDARD_SCHLIESSZEITRAUM_NRW } from '../../../commons/constants/filialeinstellung.constants';
import { ISchichtrastermodellAnlage } from '../../../commons/models/domain/schichtmodell';
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
  const open = vi.fn();
  const close = vi.fn();

  async function createComponent(
    daten: Omit<TSchichtmodellBearbeitenDialogDaten, 'schliesszeitraum'>,
  ) {
    const dialogDaten: TSchichtmodellBearbeitenDialogDaten = {
      ...daten,
      schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW,
    };
    TestBed.configureTestingModule({
      imports: [SchichtmodellBearbeitenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogDaten },
        {
          provide: SchichtmodellStore,
          useValue: { inProgress, error, createSchichtmodell, updateSchichtmodell },
        },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: { open } });
    await TestBed.compileComponents();
    return TestBed.createComponent(SchichtmodellBearbeitenDialog);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    inProgress.set(false);
    error.set(null);
    open.mockReturnValue({ afterClosed: () => of(true) });
  });

  it('should create a single model shift without fixed outer boundaries', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const schicht = component.schichtmodellForm.controls.modellschichten.at(0);
    component.schichtmodellForm.controls.bezeichnung.setValue(' Sommer ');
    schicht.controls.bezeichnung.setValue(' Tag ');

    await component.saveSchichtmodell();

    const anlage = createSchichtmodell.mock.calls[0][1] as ISchichtrastermodellAnlage;
    expect(anlage).toEqual({
      bezeichnung: 'Sommer',
      modellschichten: [
        {
          bezeichnung: 'Tag',
          reihenfolge: 0,
          mehrfachbelegungErlaubt: false,
          vorbereitungsminuten: 0,
          nachbereitungsminuten: 0,
        },
      ],
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should append shifts, transfer the outer minutes and prefill the previous end once', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const ersteSchicht = component.schichtmodellForm.controls.modellschichten.at(0);
    ersteSchicht.controls.vorbereitungsminuten.setValue(30);
    ersteSchicht.controls.nachbereitungsminuten.setValue(15);

    component.addModellschicht();

    const zweiteSchicht = component.schichtmodellForm.controls.modellschichten.at(1);
    expect(component.schichtmodellForm.controls.modellschichten.at(0)).toBe(ersteSchicht);
    expect(ersteSchicht.controls.vorbereitungsminuten.value).toBe(30);
    expect(ersteSchicht.controls.nachbereitungsminuten.value).toBe(0);
    expect(zweiteSchicht.controls.nachbereitungsminuten.value).toBe(15);

    zweiteSchicht.controls.beginnLokalzeit.setValue('00:30');
    expect(zweiteSchicht.controls.beginnTag.value).toBe('folgetag');
    expect(ersteSchicht.controls.endeLokalzeit.value).toBe('00:30');
    expect(ersteSchicht.controls.endeTag.value).toBe('folgetag');

    zweiteSchicht.controls.beginnLokalzeit.setValue('01:00');
    expect(zweiteSchicht.controls.beginnTag.value).toBe('folgetag');
    expect(ersteSchicht.controls.endeLokalzeit.value).toBe('00:30');
    expect(ersteSchicht.controls.endeTag.value).toBe('folgetag');

    component.removeModellschicht(1);
    expect(component.schichtmodellForm.controls.modellschichten).toHaveLength(1);
    expect(ersteSchicht.controls.nachbereitungsminuten.value).toBe(15);
  });

  it('should transfer preparation when removing the first shift', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const ersteSchicht = component.schichtmodellForm.controls.modellschichten.at(0);
    ersteSchicht.controls.vorbereitungsminuten.setValue(20);
    component.addModellschicht();
    const zweiteSchicht = component.schichtmodellForm.controls.modellschichten.at(1);

    component.removeModellschicht(0);

    expect(component.schichtmodellForm.controls.modellschichten.at(0)).toBe(zweiteSchicht);
    expect(zweiteSchicht.controls.vorbereitungsminuten.value).toBe(20);
  });

  it('should derive the end day from the end time and closing period', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    component.addModellschicht();
    const ersteSchicht = component.schichtmodellForm.controls.modellschichten.at(0);

    ersteSchicht.controls.endeLokalzeit.setValue('00:30');
    expect(ersteSchicht.controls.endeTag.value).toBe('folgetag');

    ersteSchicht.controls.endeLokalzeit.setValue('16:00');
    expect(ersteSchicht.controls.endeTag.value).toBe('starttag');
  });

  it('should submit model shifts in their semantic order with explicit day assignments', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    component.schichtmodellForm.controls.bezeichnung.setValue('Standard');
    const ersteSchicht = component.schichtmodellForm.controls.modellschichten.at(0);
    ersteSchicht.controls.bezeichnung.setValue('Früh');
    component.addModellschicht();
    const zweiteSchicht = component.schichtmodellForm.controls.modellschichten.at(1);
    zweiteSchicht.controls.bezeichnung.setValue('Spät');
    zweiteSchicht.controls.beginnLokalzeit.setValue('00:30');

    await component.saveSchichtmodell();

    const anlage = createSchichtmodell.mock.calls[0][1] as ISchichtrastermodellAnlage;
    expect(anlage.modellschichten.map(({ bezeichnung }) => bezeichnung)).toEqual(['Früh', 'Spät']);
    expect(anlage.modellschichten.map(({ reihenfolge }) => reihenfolge)).toEqual([0, 1]);
    expect(anlage.modellschichten[0].ende).toEqual({ lokalzeit: '00:30', tag: 'folgetag' });
    expect(anlage.modellschichten[1].beginn).toEqual({ lokalzeit: '00:30', tag: 'folgetag' });
  });

  it('should submit multiple occupancy and edge minutes only on the outer shifts', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    component.schichtmodellForm.controls.bezeichnung.setValue('Standard');
    const ersteSchicht = component.schichtmodellForm.controls.modellschichten.at(0);
    ersteSchicht.patchValue({
      bezeichnung: 'Früh',
      mehrfachbelegungErlaubt: true,
      vorbereitungsminuten: 30,
      nachbereitungsminuten: 15,
    });

    await component.saveSchichtmodell();

    const anlage = createSchichtmodell.mock.calls[0][1] as ISchichtrastermodellAnlage;
    expect(anlage.modellschichten[0]).toEqual(
      expect.objectContaining({
        mehrfachbelegungErlaubt: true,
        vorbereitungsminuten: 30,
        nachbereitungsminuten: 15,
      }),
    );
  });

  it('should validate a fully fixed inner model shift', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    component.schichtmodellForm.controls.bezeichnung.setValue('Standard');
    const ersteSchicht = component.schichtmodellForm.controls.modellschichten.at(0);
    ersteSchicht.controls.bezeichnung.setValue('Früh');
    component.addModellschicht();
    const mittlereSchicht = component.schichtmodellForm.controls.modellschichten.at(1);
    mittlereSchicht.controls.bezeichnung.setValue('Mitte');
    mittlereSchicht.controls.beginnLokalzeit.setValue('12:00');
    component.addModellschicht();
    const letzteSchicht = component.schichtmodellForm.controls.modellschichten.at(2);
    letzteSchicht.controls.bezeichnung.setValue('Spät');
    letzteSchicht.controls.beginnLokalzeit.setValue('18:00');

    mittlereSchicht.controls.endeLokalzeit.setValue('11:00');
    expect(mittlereSchicht.hasError('ungueltigeZeitfolge')).toBe(true);
    await component.saveSchichtmodell();
    expect(createSchichtmodell).not.toHaveBeenCalled();

    mittlereSchicht.controls.endeLokalzeit.setValue('18:00');
    await component.saveSchichtmodell();
    expect(createSchichtmodell).toHaveBeenCalledOnce();
  });

  it('should require confirmation before saving a model with gaps', async () => {
    open.mockReturnValue({ afterClosed: () => of(false) });
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const [ersteSchicht, zweiteSchicht] = createZweiSchichten(component);
    ersteSchicht.controls.endeLokalzeit.setValue('14:00');
    zweiteSchicht.controls.beginnLokalzeit.setValue('16:00');

    await component.saveSchichtmodell();

    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({ bestaetigenText: 'Trotzdem speichern' }),
      }),
    );
    expect(createSchichtmodell).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('should save a model with gaps after confirmation', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const [ersteSchicht, zweiteSchicht] = createZweiSchichten(component);
    ersteSchicht.controls.endeLokalzeit.setValue('14:00');
    zweiteSchicht.controls.beginnLokalzeit.setValue('16:00');

    await component.saveSchichtmodell();

    expect(open).toHaveBeenCalledOnce();
    expect(createSchichtmodell).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('should save overlapping model shifts without a gap confirmation', async () => {
    const fixture = await createComponent({ pfad });
    const component = fixture.componentInstance;
    const [ersteSchicht, zweiteSchicht] = createZweiSchichten(component);
    ersteSchicht.controls.endeLokalzeit.setValue('17:00');
    zweiteSchicht.controls.beginnLokalzeit.setValue('16:00');

    await component.saveSchichtmodell();

    expect(open).not.toHaveBeenCalled();
    expect(createSchichtmodell).toHaveBeenCalledOnce();
  });
});

function createZweiSchichten(component: SchichtmodellBearbeitenDialog) {
  component.schichtmodellForm.controls.bezeichnung.setValue('Standard');
  const ersteSchicht = component.schichtmodellForm.controls.modellschichten.at(0);
  ersteSchicht.controls.bezeichnung.setValue('Früh');
  component.addModellschicht();
  const zweiteSchicht = component.schichtmodellForm.controls.modellschichten.at(1);
  zweiteSchicht.controls.bezeichnung.setValue('Spät');
  zweiteSchicht.controls.beginnLokalzeit.setValue('16:00');
  return [ersteSchicht, zweiteSchicht] as const;
}
