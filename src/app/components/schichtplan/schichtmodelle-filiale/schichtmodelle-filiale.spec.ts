// pur-system/src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
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
  const open = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
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
        { provide: MatDialog, useValue: { open } },
      ],
    }).compileComponents();
  });

  it('should load only its branch and open a create dialog for it', async () => {
    const fixture = TestBed.createComponent(SchichtmodelleFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loadSchichtmodelle).toHaveBeenCalledWith(PFAD);
    fixture.componentInstance.openSchichtmodellDialog();
    expect(open).toHaveBeenCalledWith(
      SchichtmodellBearbeitenDialog,
      expect.objectContaining({ data: { pfad: PFAD } }),
    );
  });
});
