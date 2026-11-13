// pur-system/src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { STANDARD_OEFFNUNGSREGEL } from '../../../commons/constants/filialeinstellung.constants';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import {
  SchichtmodellStore,
  TSchichtmodellKontext,
} from '../../../stores/domain/schichtmodell.store';
import { SchichtmodellBearbeitenDialog } from '../schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog';
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
  const kontext = signal<TSchichtmodellKontext>(createKontext());
  const loadSchichtmodelle = vi.fn().mockResolvedValue(undefined);
  const loadFilialeinstellung = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    kontext.set(createKontext());
    await TestBed.configureTestingModule({
      imports: [SchichtmodelleFiliale],
      providers: [
        {
          provide: SchichtmodellStore,
          useValue: {
            getSchichtmodellKontext: vi.fn(() => kontext()),
            loadSchichtmodelle,
            inProgress: signal(false),
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
                  wochenregeln: { sonntag: { modus: 'standard' } },
                },
              },
            }),
          },
        },
        { provide: MatDialog, useValue: { open } },
      ],
    }).compileComponents();
  });

  it('should load the daily models and settings of its branch', async () => {
    const fixture = createFixture();
    await fixture.whenStable();

    expect(loadSchichtmodelle).toHaveBeenCalledWith(PFAD);
    expect(loadFilialeinstellung).toHaveBeenCalledWith(PFAD);
  });

  it('should initially select the first active daily model', async () => {
    kontext.set(
      createKontext([
        createModell('inaktiv', 'Inaktives Modell', false),
        createModell('aktiv', 'Aktives Modell', true),
      ]),
    );
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedSchichtmodell()?.schichtmodell.id).toBe('aktiv');
  });

  it('should open the daily-model dialog with the selected branch settings', async () => {
    const fixture = createFixture();
    await fixture.whenStable();

    fixture.componentInstance.openSchichtmodellDialog();

    expect(open).toHaveBeenCalledWith(
      SchichtmodellBearbeitenDialog,
      expect.objectContaining({
        data: expect.objectContaining({ pfad: PFAD }),
      }),
    );
  });

  function createFixture() {
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

function createModell(id: string, bezeichnung: string, aktiv: boolean) {
  return {
    schichtmodell: {
      ...PFAD,
      id,
      bezeichnung,
      aktiv,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    tagesvorlagenschichten: [],
  };
}
