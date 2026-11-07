// pur-system/src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { STANDARD_OEFFNUNGSREGEL } from '../../../commons/constants/filialeinstellung.constants';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import {
  SchichtTagesmodellStore,
  TSchichtTagesmodellKontext,
} from '../../../stores/domain/schicht-tagesmodell.store';
import {
  SchichtmodellStore,
  TSchichtmodellKontext,
} from '../../../stores/domain/schichtmodell.store';
import { SchichtRastermodellBearbeitenDialog } from '../schicht-rastermodell-bearbeiten-dialog/schicht-rastermodell-bearbeiten-dialog';
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
  const tagesmodellKontext = signal<TSchichtTagesmodellKontext>({
    ...PFAD,
    schichttagesmodelle: [],
    download: false,
    isLoaded: true,
    error: null,
  });
  const loadSchichtmodelle = vi.fn().mockResolvedValue(undefined);
  const loadSchichtTagesmodelle = vi.fn().mockResolvedValue(undefined);
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
    tagesmodellKontext.set({
      ...PFAD,
      schichttagesmodelle: [],
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
          provide: SchichtTagesmodellStore,
          useValue: {
            getSchichtTagesmodellKontext: vi.fn(() => tagesmodellKontext()),
            loadSchichtTagesmodelle,
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
                oeffnungszeiten: { standardoeffnungsregel: STANDARD_OEFFNUNGSREGEL },
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

  it('should show only the action belonging to the selected planning type', async () => {
    const fixture = TestBed.createComponent(SchichtmodelleFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    let aktionen = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'));
    let rastermodellHinzufuegen = aktionen.find((aktion) => {
      return aktion.textContent?.includes('Rastermodell hinzufügen');
    });
    let tagesmodellHinzufuegen = aktionen.find((aktion) => {
      return aktion.textContent?.includes('Tagesmodell hinzufügen');
    });

    expect(rastermodellHinzufuegen?.disabled).toBe(false);
    expect(tagesmodellHinzufuegen).toBeUndefined();
    rastermodellHinzufuegen?.click();
    expect(open).toHaveBeenCalledWith(
      SchichtRastermodellBearbeitenDialog,
      expect.objectContaining({
        data: { pfad: PFAD, standardoeffnungsregel: STANDARD_OEFFNUNGSREGEL },
      }),
    );

    fixture.componentInstance.selectPlanungsart('schichttagesmodell');
    fixture.detectChanges();
    aktionen = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'));
    rastermodellHinzufuegen = aktionen.find((aktion) => {
      return aktion.textContent?.includes('Rastermodell hinzufügen');
    });
    tagesmodellHinzufuegen = aktionen.find((aktion) => {
      return aktion.textContent?.includes('Tagesmodell hinzufügen');
    });

    expect(rastermodellHinzufuegen).toBeUndefined();
    expect(tagesmodellHinzufuegen?.disabled).toBe(false);
  });

  it('should initially show the first active raster model and change the visible selection', async () => {
    kontext.update((wert) => ({
      ...wert,
      schichtmodelle: [
        {
          schichtmodell: {
            id: 'modell-inaktiv',
            unternehmerId: PFAD.unternehmerId,
            firmaId: PFAD.firmaId,
            filialeId: PFAD.filialeId,
            bezeichnung: 'Inaktives Modell',
            aktiv: false,
            planungsart: 'schichtrastermodell',
            erstelltVonUid: 'admin-1',
            aktualisiertVonUid: 'admin-1',
          },
          modellschichten: [],
        },
        {
          schichtmodell: {
            id: 'modell-aktiv',
            unternehmerId: PFAD.unternehmerId,
            firmaId: PFAD.firmaId,
            filialeId: PFAD.filialeId,
            bezeichnung: 'Aktives Modell',
            aktiv: true,
            planungsart: 'schichtrastermodell',
            erstelltVonUid: 'admin-1',
            aktualisiertVonUid: 'admin-1',
          },
          modellschichten: [],
        },
      ],
    }));
    const fixture = TestBed.createComponent(SchichtmodelleFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    let sichtbareModelltitel = Array.from(compiled.querySelectorAll<HTMLHeadingElement>('h5'));
    expect(sichtbareModelltitel[0].textContent).toContain('Aktives Modell');

    fixture.componentInstance.selectSchichtrastermodell('modell-inaktiv');
    fixture.detectChanges();

    sichtbareModelltitel = Array.from(compiled.querySelectorAll<HTMLHeadingElement>('h5'));
    expect(sichtbareModelltitel[0].textContent).toContain('Inaktives Modell');
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
            planungsart: 'schichtrastermodell',
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
