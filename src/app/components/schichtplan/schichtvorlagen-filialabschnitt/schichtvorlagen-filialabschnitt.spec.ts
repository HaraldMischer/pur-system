// pur-system/src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { ISchichtvorlageEintrag } from '../../../commons/models/domain/schichtvorlage';
import {
  SchichtvorlageStore,
  TSchichtvorlageKontext,
} from '../../../stores/domain/schichtvorlage.store';
import { SchichtvorlageBearbeitenDialog } from '../schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog';
import { SchichtvorlagenFilialabschnitt } from './schichtvorlagen-filialabschnitt';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;
const FILIALE: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};
const VORLAGE: ISchichtvorlageEintrag = {
  ...PFAD,
  id: 'sv-1',
  bezeichnung: 'Frühschicht',
  beginnLokalzeit: '08:00',
  endeLokalzeit: '16:30',
  endetAmFolgetag: false,
  standardpauseMinuten: 30,
  aktiv: true,
  erstelltVonUid: 'uid-1',
  aktualisiertVonUid: 'uid-1',
};

describe('SchichtvorlagenFilialabschnitt', () => {
  const kontext = signal<TSchichtvorlageKontext | null>({
    ...PFAD,
    schichtvorlagen: [VORLAGE],
    download: false,
    isLoaded: true,
    error: null,
  });
  const inProgress = signal(false);
  const loadSchichtvorlagen = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    kontext.set({
      ...PFAD,
      schichtvorlagen: [VORLAGE],
      download: false,
      isLoaded: true,
      error: null,
    });
    await TestBed.configureTestingModule({
      imports: [SchichtvorlagenFilialabschnitt],
      providers: [
        {
          provide: SchichtvorlageStore,
          useValue: {
            getSchichtvorlageKontext: vi.fn(() => kontext()),
            loadSchichtvorlagen,
            inProgress,
          },
        },
        { provide: MatDialog, useValue: { open } },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(SchichtvorlagenFilialabschnitt);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    return fixture;
  }

  it('should load and render the templates of its branch', async () => {
    const fixture = createComponent();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loadSchichtvorlagen).toHaveBeenCalledWith(PFAD);
    expect(fixture.nativeElement.querySelector('mat-card')).not.toBeNull();
  });

  it('should open the dialog with its branch path and selected template', () => {
    const fixture = createComponent();
    fixture.detectChanges();

    fixture.componentInstance.openSchichtvorlageDialog(VORLAGE);

    expect(open).toHaveBeenCalledWith(
      SchichtvorlageBearbeitenDialog,
      expect.objectContaining({
        data: { pfad: PFAD, schichtvorlage: VORLAGE },
        panelClass: ['pur-dialog__panel'],
      }),
    );
  });
});
