// pur-system/src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.ts

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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import {
  ISchichtvorlageAktualisierung,
  ISchichtvorlageAnlage,
  ISchichtvorlageEintrag,
} from '../../../commons/models/domain/schichtvorlage';
import { nichtLeerValidator } from '../../../commons/validators/nicht-leer.validator';
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';

// ===== Top-Level Helper =====================

export type TSchichtvorlageBearbeitenDialogDaten = {
  readonly pfad: IFilialPfad;
  readonly schichtvorlage?: ISchichtvorlageEintrag;
};

function zeitfolgeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const beginn = control.get('beginnLokalzeit')?.value as string | undefined;
    const ende = control.get('endeLokalzeit')?.value as string | undefined;
    const endetAmFolgetag = control.get('endetAmFolgetag')?.value as boolean | undefined;
    if (!beginn || !ende || endetAmFolgetag) return null;
    return beginn < ende ? null : { ungueltigeZeitfolge: true };
  };
}

@Component({
  selector: 'app-schichtvorlage-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './schichtvorlage-bearbeiten-dialog.html',
  styleUrl: './schichtvorlage-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtvorlageBearbeitenDialog {
  // ===== Interne Dependency Injection =========
  private readonly dialogRef = inject(MatDialogRef<SchichtvorlageBearbeitenDialog, boolean>);
  readonly daten = inject<TSchichtvorlageBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  readonly schichtvorlageStore = inject(SchichtvorlageStore);

  // ===== Interner State =======================
  private readonly urspruenglicheAktualisierung: string | null;

  // ===== Öffentliche Werte ====================
  readonly istBearbeitung = Boolean(this.daten.schichtvorlage);
  readonly submitError = signal<string | null>(null);
  readonly hatAenderungen = signal(!this.istBearbeitung);
  readonly schichtvorlageForm = new FormGroup(
    {
      bezeichnung: new FormControl(this.daten.schichtvorlage?.bezeichnung ?? '', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator, Validators.maxLength(80)],
      }),
      beginnLokalzeit: new FormControl(this.daten.schichtvorlage?.beginnLokalzeit ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeLokalzeit: new FormControl(this.daten.schichtvorlage?.endeLokalzeit ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endetAmFolgetag: new FormControl(this.daten.schichtvorlage?.endetAmFolgetag ?? false, {
        nonNullable: true,
      }),
      standardpauseMinuten: new FormControl<number | null>(
        this.daten.schichtvorlage?.standardpauseMinuten ?? null,
        [Validators.min(0), Validators.max(1439)],
      ),
      aktiv: new FormControl(this.daten.schichtvorlage?.aktiv ?? true, { nonNullable: true }),
    },
    { validators: [zeitfolgeValidator()] },
  );

  constructor() {
    this.urspruenglicheAktualisierung = this.daten.schichtvorlage
      ? JSON.stringify(this.getAktualisierung())
      : null;
    this.schichtvorlageForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hatAenderungen.set(
        this.urspruenglicheAktualisierung !== JSON.stringify(this.getAktualisierung()),
      );
    });

    effect(() => {
      const inProgress = this.schichtvorlageStore.inProgress();
      untracked(() => {
        if (inProgress) {
          this.schichtvorlageForm.disable({ emitEvent: false });
        } else {
          this.schichtvorlageForm.enable({ emitEvent: false });
        }
      });
    });
  }

  // ===== Öffentliche Aktionen =================
  /**
   * Validiert und speichert die eingegebene Schichtvorlage.
   */
  async saveSchichtvorlage(): Promise<void> {
    if (this.schichtvorlageForm.invalid || this.schichtvorlageStore.inProgress()) {
      this.schichtvorlageForm.markAllAsTouched();
      return;
    }
    if (this.istBearbeitung && !this.hatAenderungen()) return;

    this.submitError.set(null);
    this.dialogRef.disableClose = true;
    try {
      const schichtvorlage = this.daten.schichtvorlage;
      if (schichtvorlage) {
        await this.schichtvorlageStore.updateSchichtvorlage(
          this.daten.pfad,
          schichtvorlage.id,
          this.getAktualisierung(),
        );
      } else {
        await this.schichtvorlageStore.createSchichtvorlage(this.daten.pfad, this.getAnlage());
      }
      this.dialogRef.close(true);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  // ===== Interne Helfer =======================
  private getAnlage(): ISchichtvorlageAnlage {
    const formwert = this.schichtvorlageForm.getRawValue();
    return {
      bezeichnung: formwert.bezeichnung.trim(),
      beginnLokalzeit: formwert.beginnLokalzeit,
      endeLokalzeit: formwert.endeLokalzeit,
      endetAmFolgetag: formwert.endetAmFolgetag,
      ...(formwert.standardpauseMinuten === null
        ? {}
        : { standardpauseMinuten: formwert.standardpauseMinuten }),
    };
  }

  private getAktualisierung(): ISchichtvorlageAktualisierung {
    return {
      ...this.getAnlage(),
      aktiv: this.schichtvorlageForm.controls.aktiv.getRawValue(),
    };
  }
}
