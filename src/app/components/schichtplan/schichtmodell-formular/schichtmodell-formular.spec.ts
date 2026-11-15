// pur-system/src/app/components/schichtplan/schichtmodell-formular/schichtmodell-formular.spec.ts

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import type { ISchichtmodellVorlage } from '../../../commons/utils/dienstplan/schichtmodell-vorlagen';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { SchichtmodellFormular } from './schichtmodell-formular';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;
const VORLAGEN: readonly ISchichtmodellVorlage[] = [
  {
    vorlage: 'wochentag',
    bezeichnung: 'Wochentagsvorlage',
    oeffnung: {
      geoeffnet: true,
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    },
  },
  {
    vorlage: 'sonntag',
    bezeichnung: 'Sonntagsvorlage',
    oeffnung: {
      geoeffnet: true,
      beginnLokalzeit: '10:00',
      endeLokalzeit: '22:00',
      endetAmFolgetag: false,
    },
  },
  {
    vorlage: 'wochentag:montag',
    bezeichnung: 'Montag',
    oeffnung: {
      geoeffnet: true,
      beginnLokalzeit: '14:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    },
  },
];
const BESTAND: ISchichtmodellBestand = {
  schichtmodell: {
    ...PFAD,
    id: 'modell-1',
    bezeichnung: 'Modell 1',
    aktiv: true,
    vorbereitungsminuten: 15,
    nachbereitungsminuten: 10,
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  },
  tagesvorlagenschichten: VORLAGEN.map((vorlage, index) => {
    return {
      ...PFAD,
      id: `schicht-${index + 1}`,
      schichtmodellId: 'modell-1',
      vorlage: vorlage.vorlage,
      bezeichnung: vorlage.bezeichnung,
      reihenfolge: 0,
      mehrfachbelegungErlaubt: false,
    };
  }),
};

describe('SchichtmodellFormular', () => {
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const createSchichtmodell = vi.fn().mockResolvedValue(BESTAND);
  const updateSchichtmodell = vi.fn().mockResolvedValue(BESTAND);

  beforeEach(async () => {
    vi.clearAllMocks();
    inProgress.set(false);
    error.set(null);
    await TestBed.configureTestingModule({
      imports: [SchichtmodellFormular],
      providers: [
        {
          provide: SchichtmodellStore,
          useValue: { inProgress, error, createSchichtmodell, updateSchichtmodell },
        },
      ],
    }).compileComponents();
  });

  it('should create and emit a new shift model from all current templates', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const gespeichert = vi.fn();
    component.gespeichert.subscribe(gespeichert);
    component.form.controls.bezeichnung.setValue(' Standard ');
    component.form.controls.vorbereitungsminuten.setValue(30);
    component.form.controls.nachbereitungsminuten.setValue(20);
    component.getVorlageForm('wochentag').at(0).controls.bezeichnung.setValue(' Früh ');

    await component.save();

    expect(createSchichtmodell).toHaveBeenCalledWith(
      PFAD,
      expect.objectContaining({
        bezeichnung: 'Standard',
        vorbereitungsminuten: 30,
        nachbereitungsminuten: 20,
        tagesvorlagenschichten: expect.arrayContaining([
          expect.objectContaining({ vorlage: 'wochentag', bezeichnung: 'Früh' }),
          expect.objectContaining({ vorlage: 'sonntag' }),
          expect.objectContaining({ vorlage: 'wochentag:montag' }),
        ]),
      }),
      VORLAGEN,
    );
    expect(gespeichert).toHaveBeenCalledWith(BESTAND);
    expect(component.hatAenderungen()).toBe(false);
  });

  it('should only update an existing model after an actual change', async () => {
    const fixture = createFixture(BESTAND);
    const component = fixture.componentInstance;

    expect(component.hatAenderungen()).toBe(false);
    await component.save();
    expect(updateSchichtmodell).not.toHaveBeenCalled();

    component.form.controls.bezeichnung.setValue('Modell 2');
    await component.save();

    expect(updateSchichtmodell).toHaveBeenCalledWith(
      PFAD,
      'modell-1',
      expect.objectContaining({ bezeichnung: 'Modell 2', aktiv: true }),
      VORLAGEN,
    );
  });

  it('should recognize missing and obsolete templates as a model change', () => {
    const ohneMontag: ISchichtmodellBestand = {
      ...BESTAND,
      tagesvorlagenschichten: [
        ...BESTAND.tagesvorlagenschichten.filter((schicht) => {
          return schicht.vorlage !== 'wochentag:montag';
        }),
        { ...BESTAND.tagesvorlagenschichten[0]!, id: 'alt', vorlage: 'sondertag:alt' },
      ],
    };

    const fixture = createFixture(ohneMontag);

    expect(fixture.componentInstance.hatAenderungen()).toBe(true);
    expect(fixture.componentInstance.getVorlageForm('wochentag:montag').length).toBe(1);
  });

  it('should preserve model preparation times and redistribute boundaries', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const schichten = component.getVorlageForm('wochentag');
    component.form.controls.vorbereitungsminuten.setValue(30);
    component.form.controls.nachbereitungsminuten.setValue(15);

    component.addSchicht('wochentag');

    expect(schichten.at(0).controls.endeLokalzeit.value).toBe('16:00');
    expect(schichten.at(1).controls.beginnLokalzeit.value).toBe('16:00');
    expect(component.form.controls.vorbereitungsminuten.value).toBe(30);
    expect(component.form.controls.nachbereitungsminuten.value).toBe(15);

    component.removeSchicht('wochentag', 0);

    expect(component.form.controls.vorbereitungsminuten.value).toBe(30);
    expect(component.form.controls.nachbereitungsminuten.value).toBe(15);
  });

  it('should emit when the current changes are discarded', () => {
    const fixture = createFixture(BESTAND);
    const abgebrochen = vi.fn();
    fixture.componentInstance.abgebrochen.subscribe(abgebrochen);

    fixture.componentInstance.cancel();

    expect(abgebrochen).toHaveBeenCalledTimes(1);
  });

  it('should disable the form during a write and expose the store error afterwards', () => {
    const fixture = createFixture(BESTAND);

    inProgress.set(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.disabled).toBe(true);

    inProgress.set(false);
    error.set('Das Schichtmodell konnte nicht gespeichert werden.');
    fixture.detectChanges();

    expect(fixture.componentInstance.form.enabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Das Schichtmodell konnte nicht gespeichert werden.',
    );
  });

  function createFixture(bestand?: ISchichtmodellBestand): ComponentFixture<SchichtmodellFormular> {
    const fixture = TestBed.createComponent(SchichtmodellFormular);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.componentRef.setInput('vorlagen', VORLAGEN);
    if (bestand) fixture.componentRef.setInput('bestand', bestand);
    fixture.detectChanges();
    return fixture;
  }
});
