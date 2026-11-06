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
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import {
  ISchichtrastermodellBestand,
  ISchichttagesmodellBestand,
  TPlanungsart,
} from '../../../commons/models/domain/schichtmodell';
import { IDienstplanKalendertag } from '../../../commons/models/domain/dienstplan-kalendertag';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { firstValueFrom } from 'rxjs';
import { DienstplanTagesstrukturBearbeitenDialog } from '../dienstplan-tagesstruktur-bearbeiten-dialog/dienstplan-tagesstruktur-bearbeiten-dialog';

export type TDienstplanAnlegenDialogDaten = {
  readonly pfad: IFilialPfad;
  readonly monat: string;
  readonly schichtmodelle: readonly ISchichtrastermodellBestand[];
  readonly schichttagesmodelle?: readonly ISchichttagesmodellBestand[];
  readonly kalendertage?: readonly IDienstplanKalendertag[];
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
  private readonly dialog = inject(MatDialog);
  readonly daten = inject<TDienstplanAnlegenDialogDaten>(MAT_DIALOG_DATA);
  readonly dienstplanStore = inject(DienstplanStore);

  // ===== Öffentliche Werte ====================

  readonly dienstplanForm = new FormGroup({
    planungsart: new FormControl<TPlanungsart>('schichtrastermodell', {
      nonNullable: true,
      validators: [Validators.required],
    }),
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
    this.error.set(null);
    try {
      if (this.dienstplanForm.controls.planungsart.value === 'schichtrastermodell') {
        const schichtmodell = this.daten.schichtmodelle.find((bestand) => {
          return bestand.schichtmodell.id === schichtmodellId;
        });
        if (!schichtmodell) throw new Error('Schicht-Rastermodell ungültig.');
        await this.dienstplanStore.createDienstplan(
          this.daten.pfad,
          this.daten.monat,
          schichtmodell,
        );
      } else {
        const schichtmodell = this.daten.schichttagesmodelle?.find((bestand) => {
          return bestand.schichtmodell.id === schichtmodellId;
        });
        if (!schichtmodell) throw new Error('Schicht-Tagesmodell ungültig.');
        const freieSondertagsschichten = await firstValueFrom(
          this.dialog
            .open(DienstplanTagesstrukturBearbeitenDialog, {
              data: { kalendertage: this.daten.kalendertage ?? [] },
              panelClass: ['pur-dialog__panel', 'pur-dialog__panel--large'],
            })
            .afterClosed(),
        );
        if (!freieSondertagsschichten) return;
        await this.dienstplanStore.createDienstplanAusTagesmodell(
          this.daten.pfad,
          this.daten.monat,
          schichtmodell,
          freieSondertagsschichten,
        );
      }
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error.set(
        this.dienstplanStore.error() ??
          (error instanceof Error ? error.message : 'Der Dienstplan konnte nicht angelegt werden.'),
      );
    }
  }
}
