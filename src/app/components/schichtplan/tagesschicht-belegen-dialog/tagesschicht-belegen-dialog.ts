// pur-system/src/app/components/schichtplan/tagesschicht-belegen-dialog/tagesschicht-belegen-dialog.ts

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import type { IDienstplanVersionPfad } from '../../../commons/models/app/firestore-pfad.types';
import type { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import type { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import type { ITagesschichtEintrag } from '../../../commons/models/domain/schicht-tagesmodell';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';

export type TTagesschichtBelegenDialogDaten = {
  readonly pfad: IDienstplanVersionPfad;
  readonly tagesschicht: ITagesschichtEintrag;
  readonly mitarbeiter: readonly IMitarbeiterEintrag[];
  readonly schicht?: ISchichtEintrag;
};

@Component({
  selector: 'app-tagesschicht-belegen-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './tagesschicht-belegen-dialog.html',
  styleUrl: './tagesschicht-belegen-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagesschichtBelegenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(MatDialogRef<TagesschichtBelegenDialog, boolean>);
  readonly daten = inject<TTagesschichtBelegenDialogDaten>(MAT_DIALOG_DATA);
  readonly store = inject(DienstplanStore);

  // ===== Öffentliche Werte ====================

  readonly form = new FormGroup({
    mitarbeiterId: new FormControl(this.daten.schicht?.mitarbeiterId ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  readonly error = signal<string | null>(null);

  // ===== Öffentliche Aktionen =================

  /**
   * Speichert die Mitarbeiterbelegung der konkreten Tagesschicht.
   */
  async save(): Promise<void> {
    if (this.form.invalid || this.store.inProgress()) return;
    const mitarbeiterId = this.form.controls.mitarbeiterId.value;
    if (!this.daten.mitarbeiter.some((mitarbeiter) => mitarbeiter.id === mitarbeiterId)) return;
    const daten = {
      datum: this.daten.tagesschicht.datum,
      mitarbeiterId,
      tagesschichtId: this.daten.tagesschicht.id,
    };
    try {
      if (this.daten.schicht) {
        await this.store.updateSchicht(this.daten.pfad, this.daten.schicht.id, daten);
      } else {
        await this.store.createSchicht(this.daten.pfad, daten);
      }
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error ? error.message : 'Die Tagesschicht konnte nicht belegt werden.',
      );
    }
  }

  /**
   * Löscht die ausgewählte Mitarbeiterbelegung der Tagesschicht.
   */
  async deleteSchicht(): Promise<void> {
    if (!this.daten.schicht || this.store.inProgress()) return;
    try {
      await this.store.deleteSchicht(this.daten.pfad, this.daten.schicht.id);
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error ? error.message : 'Die Belegung konnte nicht gelöscht werden.',
      );
    }
  }
}
