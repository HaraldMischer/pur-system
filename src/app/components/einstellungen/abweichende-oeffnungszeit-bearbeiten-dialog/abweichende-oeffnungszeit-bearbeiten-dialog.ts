// pur-system/src/app/components/einstellungen/abweichende-oeffnungszeit-bearbeiten-dialog/abweichende-oeffnungszeit-bearbeiten-dialog.ts

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { createOeffnungsregelZeitraumValidator } from '../../../commons/validators/oeffnungsregel-zeitraum.validator';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';

// ===== Konstanten & Typen ===================

export interface IAbweichendeOeffnungszeitBearbeitenDialogDaten {
  readonly bezeichnung: string;
  readonly beginnLokalzeit: string;
  readonly endeLokalzeit: string;
}

export interface IAbweichendeOeffnungszeitBearbeitenDialogErgebnis {
  readonly beginnLokalzeit: string;
  readonly endeLokalzeit: string;
}

@Component({
  selector: 'app-abweichende-oeffnungszeit-bearbeiten-dialog',
  imports: [MatButtonModule, MatDialogModule, EingabeZeit, ReactiveFormsModule],
  templateUrl: './abweichende-oeffnungszeit-bearbeiten-dialog.html',
  styleUrl: './abweichende-oeffnungszeit-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbweichendeOeffnungszeitBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  readonly daten = inject<IAbweichendeOeffnungszeitBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<
      AbweichendeOeffnungszeitBearbeitenDialog,
      IAbweichendeOeffnungszeitBearbeitenDialogErgebnis | undefined
    >,
  );

  // ===== Öffentliche Werte ====================

  readonly form = new FormGroup(
    {
      geoeffnet: new FormControl(true, { nonNullable: true }),
      beginnLokalzeit: new FormControl(this.daten.beginnLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeLokalzeit: new FormControl(this.daten.endeLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [createOeffnungsregelZeitraumValidator()] },
  );
  readonly hatAenderungen = signal(false);

  constructor() {
    const ursprung = JSON.stringify(this.getSpeicherwert());
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hatAenderungen.set(JSON.stringify(this.getSpeicherwert()) !== ursprung);
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Übernimmt die geänderte Öffnungszeit in den aufrufenden Kontext.
   */
  apply(): void {
    if (this.form.invalid || !this.hatAenderungen()) return;
    this.dialogRef.close(this.getSpeicherwert());
  }

  // ===== Interne Helfer =======================

  private getSpeicherwert(): IAbweichendeOeffnungszeitBearbeitenDialogErgebnis {
    const wert = this.form.getRawValue();
    return {
      beginnLokalzeit: wert.beginnLokalzeit,
      endeLokalzeit: wert.endeLokalzeit,
    };
  }
}
