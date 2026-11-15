// pur-system/src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.spec.ts

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { STANDARD_OEFFNUNGSREGEL } from '../../../commons/constants/filialeinstellung.constants';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import {
  SchichtmodellStore,
  TSchichtmodellKontext,
} from '../../../stores/domain/schichtmodell.store';
import { SchichtmodellFormular } from '../schichtmodell-formular/schichtmodell-formular';
import { SchichtmodelleFiliale } from './schichtmodelle-filiale';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;
const FILIALE: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};

describe('SchichtmodelleFiliale', () => {
  const modell1 = createModell('modell-1', 'Modell 1', true);
  const modell2 = createModell('modell-2', 'Modell 2', false);
  const kontext = signal<TSchichtmodellKontext>(createKontext([modell1, modell2]));
  const loadSchichtmodelle = vi.fn().mockResolvedValue(undefined);
  const loadFilialeinstellung = vi.fn().mockResolvedValue(undefined);
  const createSchichtmodell = vi.fn().mockResolvedValue(modell1);
  const updateSchichtmodell = vi.fn().mockResolvedValue(modell1);
  const dialogErgebnis = signal<boolean | undefined>(true);
  const open = vi.fn(() => {
    return { afterClosed: () => of(dialogErgebnis()) };
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    kontext.set(createKontext([modell1, modell2]));
    dialogErgebnis.set(true);
    await TestBed.configureTestingModule({
      imports: [SchichtmodelleFiliale],
      providers: [
        {
          provide: SchichtmodellStore,
          useValue: {
            getSchichtmodellKontext: vi.fn(() => kontext()),
            loadSchichtmodelle,
            createSchichtmodell,
            updateSchichtmodell,
            inProgress: signal(false),
            error: signal(null),
          },
        },
        {
          provide: FilialeinstellungStore,
          useValue: {
            loadFilialeinstellung,
            getFilialeinstellungKontext: vi.fn().mockReturnValue({
              isLoaded: true,
              bestand: {
                oeffnungszeiten: {
                  standardoeffnungsregel: STANDARD_OEFFNUNGSREGEL,
                  wochenregeln: {
                    montag: {
                      modus: 'abweichend',
                      oeffnungsregel: {
                        geoeffnet: true,
                        beginnLokalzeit: '14:00',
                        endeLokalzeit: '01:00',
                        endetAmFolgetag: true,
                      },
                    },
                    dienstag: { modus: 'standard' },
                    mittwoch: { modus: 'standard' },
                    donnerstag: { modus: 'standard' },
                    freitag: { modus: 'standard' },
                    samstag: { modus: 'standard' },
                    sonntag: { modus: 'standard' },
                  },
                },
                sondertage: [],
              },
            }),
          },
        },
        { provide: MatDialog, useValue: { open } },
      ],
    }).compileComponents();
  });

  it('should load the shift models and settings of its branch', async () => {
    const fixture = createFixture();
    await fixture.whenStable();

    expect(loadSchichtmodelle).toHaveBeenCalledWith(PFAD);
    expect(loadFilialeinstellung).toHaveBeenCalledWith(PFAD);
  });

  it('should initially wait for a conscious model selection', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedBestand()).toBeUndefined();
    expect(fixture.nativeElement.querySelector('app-schichtmodell-formular')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Bitte für diese Filiale ein Schichtmodell wählen.',
    );
  });

  it('should switch directly to another model without unsaved changes', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    await fixture.componentInstance.selectSchichtmodell('modell-2');

    expect(fixture.componentInstance.selectedBestand()).toBe(modell2);
    expect(open).not.toHaveBeenCalled();
  });

  it('should keep the current model when discarding unsaved changes is cancelled', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.componentInstance.selectSchichtmodell('modell-1');
    fixture.detectChanges();
    const formularComponent = fixture.debugElement.query(By.directive(SchichtmodellFormular))
      .componentInstance as SchichtmodellFormular;
    formularComponent.form.controls.bezeichnung.setValue('Geändert');
    dialogErgebnis.set(undefined);

    await fixture.componentInstance.selectSchichtmodell('modell-2');

    expect(fixture.componentInstance.selectedBestand()).toBe(modell1);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('should show a new model form after the add action', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.createSchichtmodell();
    fixture.detectChanges();

    expect(fixture.componentInstance.istNeuanlage()).toBe(true);
    expect(fixture.componentInstance.selectedBestand()).toBeUndefined();
    expect(fixture.nativeElement.querySelector('app-schichtmodell-formular')).not.toBeNull();
  });

  it('should prevent adding another model while the current model has unsaved changes', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.componentInstance.selectSchichtmodell('modell-1');
    fixture.detectChanges();
    const formularComponent = fixture.debugElement.query(By.directive(SchichtmodellFormular))
      .componentInstance as SchichtmodellFormular;
    formularComponent.form.controls.bezeichnung.setValue('Geändert');
    fixture.detectChanges();

    fixture.componentInstance.createSchichtmodell();

    expect(fixture.componentInstance.istNeuanlage()).toBe(false);
    expect(fixture.componentInstance.selectedBestand()).toBe(modell1);
    expect(open).not.toHaveBeenCalled();
  });

  it('should identify a model with missing current templates as requiring adjustment', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    const unvollstaendigesModell: ISchichtmodellBestand = {
      ...modell1,
      tagesvorlagenschichten: modell1.tagesvorlagenschichten.filter((schicht) => {
        return schicht.vorlage !== 'wochentag:montag';
      }),
    };

    expect(fixture.componentInstance.istAnpassungErforderlich(unvollstaendigesModell)).toBe(true);
  });

  function createFixture(): ComponentFixture<SchichtmodelleFiliale> {
    const fixture = TestBed.createComponent(SchichtmodelleFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    return fixture;
  }
});

function createKontext(
  schichtmodelle: TSchichtmodellKontext['schichtmodelle'] = [],
): TSchichtmodellKontext {
  return {
    ...PFAD,
    schichtmodelle,
    download: false,
    isLoaded: true,
    error: null,
  };
}

function createModell(id: string, bezeichnung: string, aktiv: boolean): ISchichtmodellBestand {
  const vorlagen = ['wochentag', 'sonntag', 'wochentag:montag'] as const;
  return {
    schichtmodell: {
      ...PFAD,
      id,
      bezeichnung,
      aktiv,
      vorbereitungsminuten: 0,
      nachbereitungsminuten: 0,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    tagesvorlagenschichten: vorlagen.map((vorlage, index) => {
      return {
        ...PFAD,
        id: `${id}-schicht-${index + 1}`,
        schichtmodellId: id,
        vorlage,
        bezeichnung: 'Schicht 1',
        reihenfolge: 0,
        mehrfachbelegungErlaubt: false,
      };
    }),
  };
}
