// pur-system/src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import { SchichtvorlagenPage } from './schichtvorlagen-page';

const FILIALEN: readonly IFilialeEintrag[] = [
  {
    id: 'b-1',
    nummer: 1,
    aktiv: true,
    anzeigename: 'Bochum 1',
    filialname: 'Bochum 1',
    kontakt: {},
  },
  {
    id: 'b-2',
    nummer: 2,
    aktiv: true,
    anzeigename: 'Bochum 2',
    filialname: 'Bochum 2',
    kontakt: {},
  },
];

describe('SchichtvorlagenPage', () => {
  const selectedUnternehmer = signal({ id: 'u-1' });
  const selectedFirma = signal({ id: 'f-1' });
  const selectedFilialen = signal(FILIALEN);
  const loadSchichtvorlagen = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    selectedFilialen.set(FILIALEN);
    await TestBed.configureTestingModule({
      imports: [SchichtvorlagenPage],
      providers: [
        {
          provide: AppKontextStore,
          useValue: { selectedUnternehmer, selectedFirma, selectedFilialen },
        },
        {
          provide: SchichtvorlageStore,
          useValue: {
            getSchichtvorlageKontext: vi.fn(() => null),
            loadSchichtvorlagen,
            inProgress: signal(false),
          },
        },
      ],
    }).compileComponents();
  });

  it('should render and load one independent template section per selected branch', async () => {
    const fixture = TestBed.createComponent(SchichtvorlagenPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelectorAll('app-schichtvorlagen-filialabschnitt'),
    ).toHaveLength(2);
    expect(loadSchichtvorlagen).toHaveBeenCalledWith({
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
    });
    expect(loadSchichtvorlagen).toHaveBeenCalledWith({
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-2',
    });
  });

  it('should render no template section without a selected branch', () => {
    selectedFilialen.set([]);
    const fixture = TestBed.createComponent(SchichtvorlagenPage);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('app-schichtvorlagen-filialabschnitt'),
    ).toHaveLength(0);
    expect(loadSchichtvorlagen).not.toHaveBeenCalled();
  });
});
