// pur-system/src/app/components/einstellungen/ausnahme-bearbeiten-dialog/ausnahme-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import {
  IFilialeinstellungAusnahmeEintrag,
  TOeffnungsregel,
} from '../../../commons/models/domain/filialeinstellung';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';

// ===== Konstanten & Typen ===================

export interface IAusnahmeBearbeitenDialogDaten {
  readonly pfad: IFilialPfad;
  readonly ausnahme?: IFilialeinstellungAusnahmeEintrag;
}

function oeffnungszeitValidator(control: AbstractControl): ValidationErrors | null {
  const geoeffnet = control.get('geoeffnet')?.value;
  const beginn = control.get('beginnLokalzeit')?.value;
  const ende = control.get('endeLokalzeit')?.value;
  return geoeffnet && beginn === ende ? { identischeOeffnungszeiten: true } : null;
}

@Component({
  selector: 'app-ausnahme-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './ausnahme-bearbeiten-dialog.html',
  styleUrl: './ausnahme-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AusnahmeBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  readonly daten = inject<IAusnahmeBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AusnahmeBearbeitenDialog>);
  readonly store = inject(FilialeinstellungStore);

  // ===== Öffentliche Werte ====================

  readonly form = new FormGroup(
    {
      datum: new FormControl(this.daten.ausnahme?.datum ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      bezeichnung: new FormControl(this.daten.ausnahme?.bezeichnung ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      geoeffnet: new FormControl(this.daten.ausnahme?.oeffnungsregel.geoeffnet ?? false, {
        nonNullable: true,
      }),
      beginnLokalzeit: new FormControl(this.getBeginn(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeLokalzeit: new FormControl(this.getEnde(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [oeffnungszeitValidator] },
  );
  readonly hatAenderungen = signal(!this.daten.ausnahme);
  readonly inProgress = computed(() => {
    return this.store.getFilialeinstellungKontext(this.daten.pfad)?.inProgress ?? false;
  });

  constructor() {
    const ursprung = JSON.stringify(this.form.getRawValue());
    if (this.daten.ausnahme) this.form.controls.datum.disable({ emitEvent: false });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hatAenderungen.set(JSON.stringify(this.form.getRawValue()) !== ursprung);
    });
    effect(() => {
      const inProgress = this.inProgress();
      if (inProgress) this.form.disable({ emitEvent: false });
      else {
        this.form.enable({ emitEvent: false });
        if (this.daten.ausnahme) this.form.controls.datum.disable({ emitEvent: false });
      }
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Speichert die neue oder bearbeitete datumsbezogene Ausnahme.
   */
  async save(): Promise<void> {
    if (this.form.invalid || this.inProgress() || !this.hatAenderungen()) return;
    const wert = this.form.getRawValue();
    const schreibdaten = {
      datum: wert.datum,
      bezeichnung: wert.bezeichnung.trim(),
      oeffnungsregel: this.buildOeffnungsregel(),
    };
    try {
      if (this.daten.ausnahme) {
        await this.store.updateAusnahme(this.daten.pfad, this.daten.ausnahme.datum, schreibdaten);
      } else {
        await this.store.createAusnahme(this.daten.pfad, schreibdaten);
      }
      this.dialogRef.close(true);
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  // ===== Interne Helfer =======================

  private getBeginn(): string {
    const regel = this.daten.ausnahme?.oeffnungsregel;
    return regel?.geoeffnet ? regel.beginnLokalzeit : '08:00';
  }

  private getEnde(): string {
    const regel = this.daten.ausnahme?.oeffnungsregel;
    return regel?.geoeffnet ? regel.endeLokalzeit : '18:00';
  }

  private buildOeffnungsregel(): TOeffnungsregel {
    const wert = this.form.getRawValue();
    if (!wert.geoeffnet) return { geoeffnet: false };
    return {
      geoeffnet: true,
      beginnLokalzeit: wert.beginnLokalzeit,
      endeLokalzeit: wert.endeLokalzeit,
      endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
    };
  }
}
