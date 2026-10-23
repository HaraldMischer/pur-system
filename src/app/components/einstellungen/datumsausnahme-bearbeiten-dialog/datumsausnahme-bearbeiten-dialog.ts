// pur-system/src/app/components/einstellungen/datumsausnahme-bearbeiten-dialog/datumsausnahme-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import {
  IFilialeinstellungAusnahmeEintrag,
  ISchliesszeitraum,
  TOeffnungsregel,
} from '../../../commons/models/domain/filialeinstellung';
import { getMaximalerOeffnungsrahmen } from '../../../commons/utils/filialeinstellung/schliesszeitraum';
import { createOeffnungsregelZeitraumValidator } from '../../../commons/validators/oeffnungsregel-zeitraum.validator';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { DatumEingabe } from '../../shared/datum-eingabe/datum-eingabe';
import { LokalzeitEingabe } from '../../shared/lokalzeit-eingabe/lokalzeit-eingabe';

// ===== Konstanten & Typen ===================

export interface IDatumsausnahmeBearbeitenDialogDaten {
  readonly pfad: IFilialPfad;
  readonly schliesszeitraum: ISchliesszeitraum;
  readonly ausnahme?: IFilialeinstellungAusnahmeEintrag;
}

@Component({
  selector: 'app-datumsausnahme-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    DatumEingabe,
    LokalzeitEingabe,
    ReactiveFormsModule,
  ],
  templateUrl: './datumsausnahme-bearbeiten-dialog.html',
  styleUrl: './datumsausnahme-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatumsausnahmeBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  readonly daten = inject<IDatumsausnahmeBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DatumsausnahmeBearbeitenDialog>);
  readonly store = inject(FilialeinstellungStore);

  // ===== Öffentliche Werte ====================

  readonly form = new FormGroup(
    {
      bezeichnung: new FormControl(this.daten.ausnahme?.bezeichnung ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      datum: new FormControl(this.daten.ausnahme?.datum ?? '', {
        nonNullable: true,
        validators: [Validators.required],
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
    { validators: [createOeffnungsregelZeitraumValidator(this.daten.schliesszeitraum)] },
  );
  readonly hatAenderungen = signal(!this.daten.ausnahme);
  readonly inProgress = computed(() => {
    return this.store.getFilialeinstellungKontext(this.daten.pfad)?.inProgress ?? false;
  });
  readonly fehler = computed(() => {
    return this.store.getFilialeinstellungKontext(this.daten.pfad)?.error ?? null;
  });

  constructor() {
    this.store.clearError(this.daten.pfad);
    this.updateOeffnungszeitenStatus();
    if (this.daten.ausnahme) this.form.controls.datum.disable({ emitEvent: false });
    const ursprung = JSON.stringify(this.form.getRawValue());
    this.form.controls.geoeffnet.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updateOeffnungszeitenStatus();
    });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hatAenderungen.set(JSON.stringify(this.form.getRawValue()) !== ursprung);
    });
    effect(() => {
      if (this.inProgress()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        if (this.daten.ausnahme) this.form.controls.datum.disable({ emitEvent: false });
        this.updateOeffnungszeitenStatus();
      }
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Speichert die neue oder bearbeitete Datumsausnahme.
   */
  async save(): Promise<void> {
    if (this.form.invalid || this.inProgress() || !this.hatAenderungen()) return;
    const wert = this.form.getRawValue();
    const aktualisierung = {
      datum: wert.datum,
      bezeichnung: wert.bezeichnung.trim(),
      oeffnungsregel: this.buildOeffnungsregel(),
    };
    try {
      if (this.daten.ausnahme) {
        await this.store.updateAusnahme(this.daten.pfad, this.daten.ausnahme.datum, aktualisierung);
      } else {
        await this.store.createAusnahme(this.daten.pfad, aktualisierung);
      }
      this.dialogRef.close(true);
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  // ===== Interne Helfer =======================

  private getBeginn(): string {
    return (
      this.daten.ausnahme?.oeffnungsregel.beginnLokalzeit ??
      getMaximalerOeffnungsrahmen(this.daten.schliesszeitraum).beginnLokalzeit
    );
  }

  private getEnde(): string {
    return (
      this.daten.ausnahme?.oeffnungsregel.endeLokalzeit ??
      getMaximalerOeffnungsrahmen(this.daten.schliesszeitraum).endeLokalzeit
    );
  }

  private buildOeffnungsregel(): TOeffnungsregel {
    const wert = this.form.getRawValue();
    return {
      geoeffnet: wert.geoeffnet,
      beginnLokalzeit: wert.beginnLokalzeit,
      endeLokalzeit: wert.endeLokalzeit,
      endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
    };
  }

  private updateOeffnungszeitenStatus(): void {
    const geoeffnet = this.form.controls.geoeffnet.getRawValue();
    if (geoeffnet) {
      this.form.controls.beginnLokalzeit.enable({ emitEvent: false });
      this.form.controls.endeLokalzeit.enable({ emitEvent: false });
      return;
    }
    this.form.controls.beginnLokalzeit.disable({ emitEvent: false });
    this.form.controls.endeLokalzeit.disable({ emitEvent: false });
  }
}
