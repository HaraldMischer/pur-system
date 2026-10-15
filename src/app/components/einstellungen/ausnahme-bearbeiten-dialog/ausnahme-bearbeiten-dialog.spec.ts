// pur-system/src/app/components/einstellungen/ausnahme-bearbeiten-dialog/ausnahme-bearbeiten-dialog.spec.ts

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { AusnahmeBearbeitenDialog } from './ausnahme-bearbeiten-dialog';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;

describe('AusnahmeBearbeitenDialog', () => {
  const createAusnahme = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AusnahmeBearbeitenDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { pfad: PFAD } },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: FilialeinstellungStore,
          useValue: {
            getFilialeinstellungKontext: vi.fn(() => ({ inProgress: false })),
            createAusnahme,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create a closed date-specific exception', async () => {
    const fixture = TestBed.createComponent(AusnahmeBearbeitenDialog);
    fixture.componentInstance.form.patchValue({
      datum: '2026-12-31',
      bezeichnung: 'Silvester',
      geoeffnet: false,
    });

    await fixture.componentInstance.save();

    expect(createAusnahme).toHaveBeenCalledWith(PFAD, {
      datum: '2026-12-31',
      bezeichnung: 'Silvester',
      oeffnungsregel: { geoeffnet: false },
    });
    expect(close).toHaveBeenCalledWith(true);
  });
});
