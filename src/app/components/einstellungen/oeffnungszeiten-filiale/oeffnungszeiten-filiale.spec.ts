// pur-system/src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import {
  FilialeinstellungStore,
  TFilialeinstellungKontext,
} from '../../../stores/domain/filialeinstellung.store';
import { OeffnungszeitenFiliale } from './oeffnungszeiten-filiale';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;
const FILIALE: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};

describe('OeffnungszeitenFiliale', () => {
  const kontext = signal<TFilialeinstellungKontext>({
    ...PFAD,
    bestand: null,
    download: false,
    isLoaded: true,
    inProgress: false,
    error: null,
  });
  const loadFilialeinstellung = vi.fn().mockResolvedValue(undefined);
  const initializeFilialeinstellung = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [OeffnungszeitenFiliale],
      providers: [
        {
          provide: FilialeinstellungStore,
          useValue: {
            getFilialeinstellungKontext: vi.fn(() => kontext()),
            loadFilialeinstellung,
            initializeFilialeinstellung,
            saveGrundlagen: vi.fn(),
          },
        },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('should render all seven weekdays', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelectorAll('.oeffnungszeiten-filiale__wochentag'),
    ).toHaveLength(7);
  });

  it('should derive an overnight rule while initializing the branch', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.form.controls.bundesland.setValue('DE-NW');
    component.form.controls.montag.setValue({
      geoeffnet: true,
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
    });

    await component.saveGrundlagen();

    expect(initializeFilialeinstellung).toHaveBeenCalledWith(
      PFAD,
      expect.objectContaining({
        bundesland: 'DE-NW',
        wochenregeln: expect.objectContaining({
          montag: {
            geoeffnet: true,
            beginnLokalzeit: '07:00',
            endeLokalzeit: '01:00',
            endetAmFolgetag: true,
          },
        }),
      }),
    );
  });
});
