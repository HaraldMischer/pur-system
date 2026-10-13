// pur-system/src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { IDienstplanVersionPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import { IModellschichtMomentaufnahmeEintrag } from '../../../commons/models/domain/schichtmodell';
import {
  createSchichtZeitstempelAusLokalzeiten,
  formatSchichtDatum,
} from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';

export type TSchichtBearbeitenDialogDaten = {
  readonly pfad: IDienstplanVersionPfad;
  readonly zeitzone: string;
  readonly datum: string;
  readonly mitarbeiter: readonly IMitarbeiterEintrag[];
  readonly modellschicht: IModellschichtMomentaufnahmeEintrag;
  readonly schicht?: ISchichtEintrag;
};

// ===== Top-Level Helper =====================

function auswahlValidator(erlaubteIds: readonly string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const id = control.value as string;
    return !id || erlaubteIds.includes(id) ? null : { ungueltigerMitarbeiter: true };
  };
}

function formatIsoDatum(datum: string): string {
  const [jahr, monat, tag] = datum.split('-');
  return `${tag}.${monat}.${jahr}`;
}

@Component({
  selector: 'app-schicht-bearbeiten-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './schicht-bearbeiten-dialog.html',
  styleUrl: './schicht-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(MatDialogRef<SchichtBearbeitenDialog>);
  readonly daten = inject<TSchichtBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  readonly dienstplanStore = inject(DienstplanStore);

  // ===== Interner State =======================

  private readonly urspruenglicherFormwert: string;

  // ===== Öffentliche Werte ====================

  readonly datum = this.daten.schicht
    ? formatSchichtDatum(this.daten.schicht.beginn, this.daten.zeitzone)
    : this.daten.datum;
  readonly datumAnzeige = formatIsoDatum(this.datum);
  readonly schichtForm = new FormGroup({
    mitarbeiterId: new FormControl(this.daten.schicht?.mitarbeiterId ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
        auswahlValidator(this.daten.mitarbeiter.map((eintrag) => eintrag.id)),
      ],
    }),
  });
  readonly istBearbeitung = Boolean(this.daten.schicht);
  readonly error = signal<string | null>(null);
  readonly hatAenderungen = signal(!this.istBearbeitung);

  // ===== Interne Ableitungen ==================

  private readonly formStatusEffect = effect(() => {
    const inProgress = this.dienstplanStore.inProgress();
    untracked(() => {
      if (inProgress) this.schichtForm.disable({ emitEvent: false });
      else this.schichtForm.enable({ emitEvent: false });
    });
  });

  constructor() {
    this.urspruenglicherFormwert = JSON.stringify(this.schichtForm.getRawValue());
    this.schichtForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hatAenderungen.set(
        JSON.stringify(this.schichtForm.getRawValue()) !== this.urspruenglicherFormwert,
      );
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Speichert die Mitarbeiterzuordnung der festgelegten Rasterzelle.
   */
  async saveSchicht(): Promise<void> {
    if (this.schichtForm.invalid || this.dienstplanStore.inProgress()) {
      this.schichtForm.markAllAsTouched();
      return;
    }
    if (this.istBearbeitung && !this.hatAenderungen()) return;
    const mitarbeiterId = this.schichtForm.controls.mitarbeiterId.value;
    if (!this.daten.mitarbeiter.some((eintrag) => eintrag.id === mitarbeiterId)) return;
    try {
      const { beginn, ende } = createSchichtZeitstempelAusLokalzeiten(
        this.datum,
        this.daten.modellschicht,
        this.daten.zeitzone,
      );
      const aktualisierung = {
        mitarbeiterId,
        modellschichtId: this.daten.modellschicht.id,
        beginn,
        ende,
        pauseMinuten: this.daten.modellschicht.standardpauseMinuten,
      };
      if (this.daten.schicht) {
        await this.dienstplanStore.updateSchicht(
          this.daten.pfad,
          this.daten.schicht.id,
          aktualisierung,
        );
      } else {
        await this.dienstplanStore.createSchicht(this.daten.pfad, aktualisierung);
      }
      this.dialogRef.close(true);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Die Schicht konnte nicht gespeichert werden.',
      );
    }
  }

  /**
   * Löscht die aktuell bearbeitete Schicht.
   */
  async deleteSchicht(): Promise<void> {
    if (!this.daten.schicht || this.dienstplanStore.inProgress()) return;
    try {
      await this.dienstplanStore.deleteSchicht(this.daten.pfad, this.daten.schicht.id);
      this.dialogRef.close(true);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Die Schicht konnte nicht gelöscht werden.',
      );
    }
  }
}
