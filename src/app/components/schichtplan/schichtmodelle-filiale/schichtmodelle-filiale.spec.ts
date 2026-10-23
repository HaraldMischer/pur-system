// pur-system/src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.spec.ts

import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';

import { STANDARD_SCHLIESSZEITRAUM_NRW } from '../../../commons/constants/filialeinstellung.constants';
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
  const kontext = signal<TSchichtmodellKontext>({
    ...PFAD,
    schichtmodelle: [],
    download: false,
    isLoaded: true,
    error: null,
  });
  const loadSchichtmodelle = vi.fn().mockResolvedValue(undefined);
  const loadFilialeinstellung = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    kontext.set({
      ...PFAD,
      schichtmodelle: [],
      download: false,
      isLoaded: true,
      error: null,
    });
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
                oeffnungszeiten: { schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW },
              },
            }),
          },
        },
        { provide: MatDialog, useValue: { open } },
      ],
    }).compileComponents();
  });

  it('should load only its branch', async () => {
    const fixture = TestBed.createComponent(SchichtmodelleFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loadSchichtmodelle).toHaveBeenCalledWith(PFAD);
    expect(loadFilialeinstellung).toHaveBeenCalledWith(PFAD);
  });

  it('should offer the available planning type and keep the later type disabled', async () => {
    const fixture = TestBed.createComponent(SchichtmodelleFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger = fixture.debugElement
      .query(By.directive(MatMenuTrigger))
      .injector.get(MatMenuTrigger);
    trigger.openMenu();
    fixture.detectChanges();
    await fixture.whenStable();
    const menueintraege = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[mat-menu-item]'),
    );

    expect(menueintraege).toHaveLength(2);
    expect(menueintraege[0].disabled).toBe(false);
    expect(menueintraege[1].disabled).toBe(true);
    menueintraege[0].click();
    expect(open).toHaveBeenCalledWith(
      SchichtmodellBearbeitenDialog,
      expect.objectContaining({
        data: { pfad: PFAD, schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW },
      }),
    );
  });

  it('should distinguish day-dependent boundaries and following-day boundaries', async () => {
    kontext.update((wert) => ({
      ...wert,
      schichtmodelle: [
        {
          schichtmodell: {
            id: 'modell-1',
            unternehmerId: PFAD.unternehmerId,
            firmaId: PFAD.firmaId,
            filialeId: PFAD.filialeId,
            bezeichnung: 'Standard',
            aktiv: true,
            planungsart: 'schichtraster',
            erstelltVonUid: 'admin-1',
            aktualisiertVonUid: 'admin-1',
          },
          modellschichten: [
            {
              id: 'frueh',
              schichtmodellId: 'modell-1',
              unternehmerId: PFAD.unternehmerId,
              firmaId: PFAD.firmaId,
              filialeId: PFAD.filialeId,
              bezeichnung: 'Früh',
              reihenfolge: 0,
              ende: { lokalzeit: '00:30', tag: 'folgetag' },
              mehrfachbelegungErlaubt: false,
            },
            {
              id: 'spaet',
              schichtmodellId: 'modell-1',
              unternehmerId: PFAD.unternehmerId,
              firmaId: PFAD.firmaId,
              filialeId: PFAD.filialeId,
              bezeichnung: 'Spät',
              reihenfolge: 1,
              beginn: { lokalzeit: '00:30', tag: 'folgetag' },
              mehrfachbelegungErlaubt: false,
            },
          ],
        },
      ],
    }));
    const fixture = TestBed.createComponent(SchichtmodelleFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Tagesabhängig–00:30 Uhr (Folgetag)');
    expect(fixture.nativeElement.textContent).toContain('00:30 Uhr (Folgetag)–Tagesabhängig');
  });
});
