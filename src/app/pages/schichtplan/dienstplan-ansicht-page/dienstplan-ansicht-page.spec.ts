// pur-system/src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { MonatSelector } from '../../../components/date-selectors/monat-selector/monat-selector';
import { DienstplanAnsichtPage } from './dienstplan-ansicht-page';

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

describe('DienstplanAnsichtPage', () => {
  const selectedUnternehmer = signal<{ id: string } | null>({ id: 'u-1' });
  const selectedFirma = signal<{ id: string } | null>({ id: 'f-1' });
  const selectedFilialen = signal<readonly IFilialeEintrag[]>([FILIALE_1, FILIALE_2]);
  const loadDienstplanMonat = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    selectedUnternehmer.set({ id: 'u-1' });
    selectedFirma.set({ id: 'f-1' });
    selectedFilialen.set([FILIALE_1, FILIALE_2]);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DienstplanAnsichtPage],
      providers: [
        provideRouter([]),
        {
          provide: AppKontextStore,
          useValue: { selectedUnternehmer, selectedFirma, selectedFilialen },
        },
        {
          provide: DienstplanStore,
          useValue: {
            getDienstplanKontext: vi.fn().mockReturnValue(null),
            loadDienstplanMonat,
          },
        },
        {
          provide: MitarbeiterStore,
          useValue: { getMitarbeiterById: vi.fn().mockReturnValue(null) },
        },
      ],
    }).compileComponents();
  });

  it('stellt jede ausgewählte Filiale als eigenen veröffentlichten Monatsbereich dar', async () => {
    const fixture = TestBed.createComponent(DienstplanAnsichtPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('app-dienstplan-ansichtsbereich')).toHaveLength(
      2,
    );
    expect(loadDienstplanMonat).toHaveBeenCalledTimes(2);
    expect(loadDienstplanMonat).toHaveBeenCalledWith(
      { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' },
      fixture.componentInstance.selectedMonat(),
      true,
      'networkOnly',
    );
    expect(loadDienstplanMonat).toHaveBeenCalledWith(
      { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-2' },
      fixture.componentInstance.selectedMonat(),
      true,
      'networkOnly',
    );
  });

  it('übernimmt einen Monatswechsel in alle Filialbereiche', async () => {
    const fixture = TestBed.createComponent(DienstplanAnsichtPage);
    fixture.componentInstance.selectedMonat.set('2026-01');
    fixture.detectChanges();
    await fixture.whenStable();
    vi.clearAllMocks();

    const monatSelector = fixture.debugElement.query(By.directive(MonatSelector))
      .componentInstance as MonatSelector;
    monatSelector.changeMonat(-1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedMonat()).toBe('2025-12');
    expect(loadDienstplanMonat).toHaveBeenCalledTimes(2);
    expect(loadDienstplanMonat.mock.calls.every((aufruf) => aufruf[1] === '2025-12')).toBe(true);
  });

  it('zeigt einen Hinweis ohne ausgewählte Filiale', () => {
    selectedFilialen.set([]);
    const fixture = TestBed.createComponent(DienstplanAnsichtPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Wähle mindestens eine Filiale');
    expect(loadDienstplanMonat).not.toHaveBeenCalled();
  });
});
