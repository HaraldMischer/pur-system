// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-zusammenfuehren-dialog/mitarbeiter-zusammenfuehren-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IMitarbeiterEintrag } from '../../../../commons/models/domain/mitarbeiter';
import { MitarbeiterStore } from '../../../../stores/domain/mitarbeiter.store';
import { MitarbeiterZusammenfuehrenDialog } from './mitarbeiter-zusammenfuehren-dialog';

describe('MitarbeiterZusammenfuehrenDialog', () => {
  const quelle: IMitarbeiterEintrag = {
    id: 'm-quelle',
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    person: {
      vorname: 'Mia',
      nachname: 'Muster',
      adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
      kontakt: {},
    },
    rollen: ['servicekraft'],
    filialIds: ['b-1'],
    aktiv: true,
  };
  const ziel: IMitarbeiterEintrag = {
    ...quelle,
    id: 'm-ziel',
    person: { ...quelle.person, vorname: 'Maria' },
    filialIds: ['b-2'],
  };
  const zielSpaeter: IMitarbeiterEintrag = {
    ...ziel,
    id: 'm-ziel-spaeter',
    person: { ...ziel.person, vorname: 'Zoe', nachname: 'Zulu' },
  };
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const mergeMitarbeiter = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [MitarbeiterZusammenfuehrenDialog, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            quelle,
            mitarbeiter: [zielSpaeter, quelle, ziel],
          },
        },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
        {
          provide: MitarbeiterStore,
          useValue: { inProgress, error, mergeMitarbeiter },
        },
      ],
    });
  });

  it('should offer only existing target employees and describe the effects', () => {
    const fixture = TestBed.createComponent(MitarbeiterZusammenfuehrenDialog);
    fixture.detectChanges();

    expect(fixture.componentInstance.zielMitarbeiter).toEqual([ziel, zielSpaeter]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mia Muster');
  });

  it('should merge the source into the selected target', async () => {
    const fixture = TestBed.createComponent(MitarbeiterZusammenfuehrenDialog);
    fixture.componentInstance.zusammenfuehrenForm.controls.zielMitarbeiterId.setValue('m-ziel');

    await fixture.componentInstance.onSubmit();

    expect(mergeMitarbeiter).toHaveBeenCalledWith('u-1', 'f-1', 'm-quelle', 'm-ziel');
    expect(close).toHaveBeenCalledWith(true);
  });
});
