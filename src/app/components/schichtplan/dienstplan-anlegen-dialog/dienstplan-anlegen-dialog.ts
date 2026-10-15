// pur-system/src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';

export type TDienstplanAnlegenDialogDaten = {
  readonly pfad: IFilialPfad;
  readonly monat: string;
  readonly schichtmodelle: readonly ISchichtmodellBestand[];
};

@Component({
  selector: 'app-dienstplan-anlegen-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './dienstplan-anlegen-dialog.html',
  styleUrl: './dienstplan-anlegen-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanAnlegenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(MatDialogRef<DienstplanAnlegenDialog>);
  readonly daten = inject<TDienstplanAnlegenDialogDaten>(MAT_DIALOG_DATA);
  readonly dienstplanStore = inject(DienstplanStore);

  // ===== Öffentliche Werte ====================

  readonly dienstplanForm = new FormGroup({
    schichtmodellId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly error = signal<string | null>(null);

  // ===== Interne Ableitungen ==================

  private readonly formStatusEffect = effect(() => {
    const inProgress = this.dienstplanStore.inProgress();
    untracked(() => {
      if (inProgress) this.dienstplanForm.disable({ emitEvent: false });
      else this.dienstplanForm.enable({ emitEvent: false });
    });
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Legt den Monatsdienstplan mit dem ausgewählten Schichtmodell an.
   */
  async saveDienstplan(): Promise<void> {
    if (this.dienstplanStore.inProgress() || this.dienstplanForm.invalid) return;
    const schichtmodellId = this.dienstplanForm.controls.schichtmodellId.value;
    const schichtmodell = this.daten.schichtmodelle.find((bestand) => {
      return bestand.schichtmodell.id === schichtmodellId;
    });
    if (!schichtmodell) {
      this.error.set('Schichtmodell ungültig.');
      return;
    }
    this.error.set(null);
    try {
      await this.dienstplanStore.createDienstplan(this.daten.pfad, this.daten.monat, schichtmodell);
      this.dialogRef.close(true);
    } catch {
      this.error.set(
        this.dienstplanStore.error() ?? 'Der Dienstplan konnte nicht angelegt werden.',
      );
    }
  }
}
