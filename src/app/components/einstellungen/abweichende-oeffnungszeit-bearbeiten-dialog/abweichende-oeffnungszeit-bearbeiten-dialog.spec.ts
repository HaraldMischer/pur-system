// pur-system/src/app/components/einstellungen/abweichende-oeffnungszeit-bearbeiten-dialog/abweichende-oeffnungszeit-bearbeiten-dialog.spec.ts

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AbweichendeOeffnungszeitBearbeitenDialog } from './abweichende-oeffnungszeit-bearbeiten-dialog';

describe('AbweichendeOeffnungszeitBearbeitenDialog', () => {
  const close = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AbweichendeOeffnungszeitBearbeitenDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            bezeichnung: 'Sonntag',
            beginnLokalzeit: '06:00',
            endeLokalzeit: '01:00',
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
  });

  it('should return a changed positive opening interval', () => {
    const fixture = TestBed.createComponent(AbweichendeOeffnungszeitBearbeitenDialog);
    const component = fixture.componentInstance;

    component.form.controls.beginnLokalzeit.setValue('07:00');
    component.apply();

    expect(close).toHaveBeenCalledWith({
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
    });
  });

  it('should reject identical times and an unchanged interval', () => {
    const fixture = TestBed.createComponent(AbweichendeOeffnungszeitBearbeitenDialog);
    const component = fixture.componentInstance;

    component.apply();
    component.form.controls.endeLokalzeit.setValue('06:00');
    component.apply();

    expect(component.form.invalid).toBe(true);
    expect(close).not.toHaveBeenCalled();
  });
});
