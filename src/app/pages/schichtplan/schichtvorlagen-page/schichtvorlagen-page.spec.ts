// pur-system/src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import { SchichtvorlageBearbeitenDialog } from '../../../components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog';
import { SchichtvorlagenPage } from './schichtvorlagen-page';

describe('SchichtvorlagenPage', () => {
  const selectedUnternehmer = signal({ id: 'u-1' });
  const selectedFirma = signal({ id: 'f-1' });
  const selectedFiliale = signal({ id: 'b-1', anzeigename: 'Bochum 1' });
  const schichtvorlagen = signal([
    {
      id: 'sv-1',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      bezeichnung: 'Frühschicht',
      beginnLokalzeit: '08:00',
      endeLokalzeit: '16:30',
      endetAmFolgetag: false,
      standardpauseMinuten: 30,
      aktiv: true,
      erstelltVonUid: 'master-1',
      aktualisiertVonUid: 'master-1',
    },
    {
      id: 'sv-2',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      bezeichnung: 'Spätschicht',
      beginnLokalzeit: '16:30',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
      aktiv: false,
      erstelltVonUid: 'master-1',
      aktualisiertVonUid: 'master-1',
    },
  ]);
  const download = signal(false);
  const isLoaded = signal(true);
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const loadSchichtvorlagen = vi.fn().mockResolvedValue(undefined);
  const resetSchichtvorlagen = vi.fn();
  const open = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [SchichtvorlagenPage],
      providers: [
        {
          provide: AppKontextStore,
          useValue: { selectedUnternehmer, selectedFirma, selectedFiliale },
        },
        {
          provide: SchichtvorlageStore,
          useValue: {
            schichtvorlagen,
            download,
            isLoaded,
            inProgress,
            error,
            loadSchichtvorlagen,
            resetSchichtvorlagen,
          },
        },
        { provide: MatDialog, useValue: { open } },
      ],
    }).compileComponents();
  });

  it('should load and display active and inactive templates for the selected branch', async () => {
    const fixture = TestBed.createComponent(SchichtvorlagenPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loadSchichtvorlagen).toHaveBeenCalledWith({
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
    });
    expect(fixture.nativeElement.textContent).toContain('Frühschicht');
    expect(fixture.nativeElement.textContent).toContain('Spätschicht');
    expect(fixture.nativeElement.textContent).toContain('Inaktiv');
  });

  it('should open the edit dialog with the full branch path and the selected template', () => {
    const fixture = TestBed.createComponent(SchichtvorlagenPage);
    fixture.detectChanges();

    fixture.componentInstance.openSchichtvorlageDialog(schichtvorlagen()[0]);

    expect(open).toHaveBeenCalledWith(
      SchichtvorlageBearbeitenDialog,
      expect.objectContaining({
        data: {
          pfad: { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' },
          schichtvorlage: schichtvorlagen()[0],
        },
        panelClass: ['pur-dialog__panel'],
      }),
    );
  });
});
