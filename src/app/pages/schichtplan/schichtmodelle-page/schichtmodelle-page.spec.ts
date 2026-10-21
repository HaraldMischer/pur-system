// pur-system/src/app/pages/schichtplan/schichtmodelle-page/schichtmodelle-page.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { SchichtmodellePage } from './schichtmodelle-page';

const FILIALE: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};

describe('SchichtmodellePage', () => {
  const selectedFilialen = signal<readonly IFilialeEintrag[]>([FILIALE]);
  const loadSchichtmodelle = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    selectedFilialen.set([FILIALE]);
    await TestBed.configureTestingModule({
      imports: [SchichtmodellePage],
      providers: [
        {
          provide: AppKontextStore,
          useValue: {
            selectedUnternehmer: signal({ id: 'u-1' }),
            selectedFirma: signal({ id: 'f-1' }),
            selectedFilialen,
          },
        },
        {
          provide: SchichtmodellStore,
          useValue: {
            getSchichtmodellKontext: vi.fn(() => null),
            loadSchichtmodelle,
            inProgress: signal(false),
          },
        },
        {
          provide: FilialeinstellungStore,
          useValue: {
            loadFilialeinstellung: vi.fn().mockResolvedValue(undefined),
            getFilialeinstellungKontext: vi.fn().mockReturnValue({ bestand: { sondertage: [] } }),
          },
        },
      ],
    }).compileComponents();
  });

  it('should render one independently loaded section per selected branch', async () => {
    const fixture = TestBed.createComponent(SchichtmodellePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('app-schichtmodelle-filiale')).toHaveLength(1);
    expect(loadSchichtmodelle).toHaveBeenCalledWith({
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
    });
  });

  it('should render no model section without a selected branch', () => {
    selectedFilialen.set([]);
    const fixture = TestBed.createComponent(SchichtmodellePage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-schichtmodelle-filiale')).toHaveLength(0);
  });
});
