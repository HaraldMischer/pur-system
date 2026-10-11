// pur-system/src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IBenutzerProfilDokument } from '../../../commons/models/domain/benutzer';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import { DienstplanArbeitsbereich } from './dienstplan-arbeitsbereich';

const FILIALE_1: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};
const FILIALE_2: IFilialeEintrag = {
  ...FILIALE_1,
  id: 'b-2',
  nummer: 2,
  anzeigename: 'Bochum 2',
  filialname: 'Bochum 2',
};

describe('DienstplanArbeitsbereich', () => {
  const selectedUnternehmer = signal<{ id: string } | null>({ id: 'u-1' });
  const selectedFirma = signal<{ id: string } | null>({ id: 'f-1' });
  const selectedFilialen = signal<readonly IFilialeEintrag[]>([FILIALE_1, FILIALE_2]);
  const benutzerProfil = signal<IBenutzerProfilDokument>({
    email: 'office@example.com',
    anzeigename: 'Office',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard', 'schichtplan'],
    zugriffe: { 'u-1': { 'f-1': ['b-1', 'b-2'] } },
  });
  const loadDienstplanMonat = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    selectedUnternehmer.set({ id: 'u-1' });
    selectedFirma.set({ id: 'f-1' });
    selectedFilialen.set([FILIALE_1, FILIALE_2]);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DienstplanArbeitsbereich],
      providers: [
        {
          provide: AppKontextStore,
          useValue: { selectedUnternehmer, selectedFirma, selectedFilialen },
        },
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        {
          provide: DienstplanStore,
          useValue: {
            getDienstplanKontext: vi.fn().mockReturnValue(null),
            loadDienstplanMonat,
            createDienstplan: vi.fn(),
            inProgress: signal(false),
            error: signal(null),
          },
        },
        {
          provide: MitarbeiterStore,
          useValue: {
            getMitarbeiter: vi.fn().mockReturnValue([]),
            getMitarbeiterById: vi.fn().mockReturnValue(null),
          },
        },
        {
          provide: SchichtvorlageStore,
          useValue: {
            schichtvorlagen: signal([]),
            error: signal(null),
            loadSchichtvorlagen: vi.fn(),
          },
        },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('should render and load one monthly section per selected branch', async () => {
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('app-dienstplan-filialabschnitt')).toHaveLength(
      2,
    );
    expect(loadDienstplanMonat).toHaveBeenCalledTimes(2);
    expect(loadDienstplanMonat).toHaveBeenCalledWith(
      { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' },
      fixture.componentInstance.selectedMonat(),
      false,
    );
    expect(loadDienstplanMonat).toHaveBeenCalledWith(
      { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-2' },
      fixture.componentInstance.selectedMonat(),
      false,
    );
  });

  it('should apply a month change to every selected branch section', async () => {
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.componentInstance.selectedMonat.set('2026-01');
    fixture.detectChanges();
    await fixture.whenStable();
    vi.clearAllMocks();

    fixture.componentInstance.changeMonat(-1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedMonat()).toBe('2025-12');
    expect(loadDienstplanMonat).toHaveBeenCalledTimes(2);
    expect(loadDienstplanMonat.mock.calls.every((aufruf) => aufruf[1] === '2025-12')).toBe(true);
  });

  it('should not load a plan without a selected branch', async () => {
    selectedFilialen.set([]);
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('app-dienstplan-filialabschnitt')).toHaveLength(
      0,
    );
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(loadDienstplanMonat).not.toHaveBeenCalled();
  });
});
