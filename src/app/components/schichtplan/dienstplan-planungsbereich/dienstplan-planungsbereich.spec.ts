// pur-system/src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { MitarbeiterbelegungStore } from '../../../stores/domain/mitarbeiterbelegung.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { HinweisDialog } from '../../shared/hinweis-dialog/hinweis-dialog';
import { DienstplanPlanungsbereich } from './dienstplan-planungsbereich';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;
const FILIALE: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};

describe('DienstplanPlanungsbereich', () => {
  const loadDienstplanMonat = vi.fn().mockResolvedValue(undefined);
  const dialogOpen = vi.fn();
  const benutzerProfil = signal({
    email: 'office@example.com',
    anzeigename: 'Office',
    aktiv: true,
    userRole: 'office' as const,
    erlaubteBereiche: ['dashboard', 'schichtplan'],
    zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DienstplanPlanungsbereich],
      providers: [
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        {
          provide: DienstplanStore,
          useValue: {
            getDienstplanKontext: vi.fn().mockReturnValue(null),
            loadDienstplanMonat,
            inProgress: signal(false),
          },
        },
        {
          provide: FilialeinstellungStore,
          useValue: {
            loadFilialeinstellung: vi.fn().mockResolvedValue(undefined),
            getFilialeinstellungKontext: vi.fn().mockReturnValue(null),
          },
        },
        {
          provide: MitarbeiterbelegungStore,
          useValue: {
            konflikte: signal([]),
            hatMitarbeiterZeitkonflikt: vi.fn().mockReturnValue(false),
          },
        },
        {
          provide: MitarbeiterStore,
          useValue: {
            getMitarbeiterById: vi.fn().mockReturnValue(null),
            getMitarbeiterNachFilialen: vi.fn().mockReturnValue([]),
          },
        },
        {
          provide: SchichtmodellStore,
          useValue: {
            loadSchichtmodelle: vi.fn().mockResolvedValue(undefined),
            getSchichtmodellKontext: vi.fn().mockReturnValue(null),
            error: signal(null),
          },
        },
        { provide: MatDialog, useValue: { open: dialogOpen } },
      ],
    }).compileComponents();
  });

  it('should load the monthly state of its branch', async () => {
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loadDienstplanMonat).toHaveBeenCalledWith(PFAD, '2026-10', false);
    expect(fixture.componentInstance.darfSchreiben()).toBe(true);
  });

  it('should keep the branch read-only outside planning mode', async () => {
    const fixture = createComponent(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.darfSchreiben()).toBe(false);
  });

  it('should explain a rejected multiple occupancy in a dialog', () => {
    const fixture = createComponent(true);

    fixture.componentInstance.openMehrfachbelegungHinweis({ schichtBezeichnung: 'Spät' });

    expect(dialogOpen).toHaveBeenCalledWith(HinweisDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        titel: 'Mehrfachbelegung nicht erlaubt',
        nachricht: 'Diese Schicht kann nur einmal belegt werden.',
      },
    });
  });

  it('should explain that the employee is already assigned to the shift', () => {
    const fixture = createComponent(true);

    fixture.componentInstance.openMitarbeiterBereitsEingeplantHinweis();

    expect(dialogOpen).toHaveBeenCalledWith(HinweisDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        titel: 'Mitarbeiter bereits eingeplant',
        nachricht: 'Dieser Mitarbeiter ist hier bereits eingeplant.',
      },
    });
  });

  it('should explain that the employee is not allowed for the branch', () => {
    const fixture = createComponent(true);

    fixture.componentInstance.openMitarbeiterNichtZugelassenHinweis();

    expect(dialogOpen).toHaveBeenCalledWith(HinweisDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        titel: 'Mitarbeiter nicht zugelassen',
        nachricht: 'Dieser Mitarbeiter ist für diese Filiale nicht zugelassen.',
      },
    });
  });

  function createComponent(planungsmodus: boolean) {
    const fixture = TestBed.createComponent(DienstplanPlanungsbereich);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.componentRef.setInput('monat', '2026-10');
    fixture.componentRef.setInput('planungsmodus', planungsmodus);
    fixture.componentRef.setInput('belegungsstandVerfuegbar', true);
    return fixture;
  }
});
