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
import { firstValueFrom } from 'rxjs';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IDienstplanKalendertag } from '../../../commons/models/domain/dienstplan-kalendertag';
import { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import {
  assertSchichtmodellPasstZuKalendertagen,
  SchichtmodellOeffnungszeitenFehler,
} from '../../../commons/utils/dienstplan/dienstplan-tagesschichten';
import { DienstplanFachfehler } from '../../../services/domain/dienstplan.service';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { HinweisDialog } from '../../shared/hinweis-dialog/hinweis-dialog';
import { DienstplanAbweichendeTageDialog } from '../dienstplan-abweichende-tage-dialog/dienstplan-abweichende-tage-dialog';

export type TDienstplanAnlegenDialogDaten = {
  readonly pfad: IFilialPfad;
  readonly monat: string;
  readonly schichtmodelle: readonly ISchichtmodellBestand[];
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
    this.error.set(null);

    if (!schichtmodell) {
      this.error.set('Das ausgewählte Schichtmodell ist ungültig.');
      return;
    }

    try {
      assertSchichtmodellPasstZuKalendertagen(this.daten.kalendertage ?? [], schichtmodell);
      const freieTagesschichten = await firstValueFrom(
        this.dialog
          .open(DienstplanAbweichendeTageDialog, {
            data: { kalendertage: this.daten.kalendertage ?? [] },
            panelClass: ['pur-dialog__panel', 'pur-dialog__panel--large'],
          })
          .afterClosed(),
      );
      if (!freieTagesschichten) return;
      await this.dienstplanStore.createDienstplan(
        this.daten.pfad,
        this.daten.monat,
        schichtmodell,
        freieTagesschichten,
      );
      this.dialogRef.close(true);
    } catch (error: unknown) {
      if (
        error instanceof SchichtmodellOeffnungszeitenFehler ||
        (error instanceof DienstplanFachfehler && error.code === 'schichtmodell-oeffnungszeiten')
      ) {
        this.dialog.open(HinweisDialog, {
          panelClass: ['pur-dialog__panel'],
          data: {
            titel: 'Der Dienstplan wurde nicht angelegt',
            nachricht: `Das Schichtmodell „${schichtmodell.schichtmodell.bezeichnung}“ passt nicht mehr zu den aktuellen Öffnungszeiten. Bitte passen Sie die Schichtgrenzen an.`,
          },
        });
        return;
      }
      const fehlermeldung =
        this.dienstplanStore.error() ??
        (error instanceof Error ? error.message : 'Der Dienstplan konnte nicht angelegt werden.');
      this.error.set(fehlermeldung);
    }
  }
}
