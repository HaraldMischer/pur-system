// pur-system/src/app/components/shared/bestaetigung-dialog/bestaetigung-dialog.spec.ts

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { BestaetigungDialog, IBestaetigungDialogDaten } from './bestaetigung-dialog';

describe('BestaetigungDialog', () => {
  const close = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function createComponent(daten: IBestaetigungDialogDaten) {
    await TestBed.configureTestingModule({
      imports: [BestaetigungDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: daten },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    return TestBed.createComponent(BestaetigungDialog);
  }

  it('should render the configured confirmation and return the selected decision', async () => {
    const fixture = await createComponent({
      titel: 'Dienstplan löschen',
      nachricht: 'Soll der Dienstplan wirklich gelöscht werden?',
      abbrechenText: 'Zurück',
      bestaetigenText: 'Wirklich löschen',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button');
    expect(compiled.querySelector('[mat-dialog-title]')?.textContent).toContain(
      'Dienstplan löschen',
    );
    expect(compiled.querySelector('mat-dialog-content')?.textContent).toContain(
      'Soll der Dienstplan wirklich gelöscht werden?',
    );
    expect(buttons[0].textContent).toContain('Zurück');
    expect(buttons[1].textContent).toContain('Wirklich löschen');

    buttons[0].click();
    expect(close).toHaveBeenLastCalledWith(undefined);
    buttons[1].click();
    expect(close).toHaveBeenLastCalledWith(true);
  });

  it('should use the default action labels', async () => {
    const fixture = await createComponent({
      titel: 'Fortfahren',
      nachricht: 'Möchtest du fortfahren?',
    });
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      'mat-dialog-actions button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].textContent).toContain('Abbrechen');
    expect(buttons[1].textContent).toContain('Bestätigen');
  });
});
