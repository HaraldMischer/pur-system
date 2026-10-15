// pur-system/src/app/pages/einstellungen/oeffnungszeiten-page/oeffnungszeiten-page.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { OeffnungszeitenPage } from './oeffnungszeiten-page';

const FILIALE: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};

describe('OeffnungszeitenPage', () => {
  const selectedFilialen = signal<readonly IFilialeEintrag[]>([FILIALE]);
  const loadFilialeinstellung = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    selectedFilialen.set([FILIALE]);
    await TestBed.configureTestingModule({
      imports: [OeffnungszeitenPage],
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
          provide: FilialeinstellungStore,
          useValue: {
            getFilialeinstellungKontext: vi.fn(() => null),
            loadFilialeinstellung,
          },
        },
      ],
    }).compileComponents();
  });

  it('should render and load one independent section per selected branch', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('app-oeffnungszeiten-filiale')).toHaveLength(1);
    expect(loadFilialeinstellung).toHaveBeenCalledWith({
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
    });
  });

  it('should explain the resolution priority and render no section without a branch', () => {
    selectedFilialen.set([]);
    const fixture = TestBed.createComponent(OeffnungszeitenPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Ausnahmen überschreiben Sondertage; Sondertage überschreiben die regulären Wochentage.',
    );
    expect(fixture.nativeElement.querySelectorAll('app-oeffnungszeiten-filiale')).toHaveLength(0);
  });
});
