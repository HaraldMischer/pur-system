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
import { merge } from 'rxjs';

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
    if (!beginn || !ende) return null;
    return beginn !== ende ? null : { ungueltigeZeitfolge: true };
  };
}

function calculateStandardpauseMinuten(
  beginnLokalzeit: string,
  endeLokalzeit: string,
): number | null {
  const dauerMinuten = calculateSchichtdauerMinuten(beginnLokalzeit, endeLokalzeit);
  if (dauerMinuten === null) return null;
  if (dauerMinuten <= 0) return null;
  if (dauerMinuten <= 6 * 60) return 0;
  if (dauerMinuten <= 9 * 60) return 30;
  return 45;
}

function calculateSchichtdauerMinuten(
  beginnLokalzeit: string,
  endeLokalzeit: string,
): number | null {
  const beginnMinuten = getLokalzeitMinuten(beginnLokalzeit);
  const endeMinuten = getLokalzeitMinuten(endeLokalzeit);
  if (beginnMinuten === null || endeMinuten === null || beginnMinuten === endeMinuten) {
    return null;
  }
  return endeMinuten + (endeMinuten < beginnMinuten ? 24 * 60 : 0) - beginnMinuten;
}

function getLokalzeitMinuten(lokalzeit: string): number | null {
  const treffer = /^(\d{2}):(\d{2})$/.exec(lokalzeit);
  if (!treffer) return null;
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  if (stunden > 23 || minuten > 59) return null;
  return stunden * 60 + minuten;
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
  readonly schichtdauerStunden = signal('0');
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
      standardpauseMinuten: new FormControl(this.daten.schichtvorlage?.standardpauseMinuten ?? 0, {
        nonNullable: true,
        validators: [Validators.min(0), Validators.max(1439)],
      }),
      aktiv: new FormControl(
        { value: this.daten.schichtvorlage?.aktiv ?? true, disabled: !this.istBearbeitung },
        { nonNullable: true },
      ),
    },
    { validators: [zeitfolgeValidator()] },
  );

  constructor() {
    this.urspruenglicheAktualisierung = this.daten.schichtvorlage
      ? JSON.stringify(this.getAktualisierung())
      : null;
    this.updateSchichtdauer();
    merge(
      this.schichtvorlageForm.controls.beginnLokalzeit.valueChanges,
      this.schichtvorlageForm.controls.endeLokalzeit.valueChanges,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.updateSchichtdauer();
        this.updateStandardpause();
      });
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
          if (!this.istBearbeitung) {
            this.schichtvorlageForm.controls.aktiv.disable({ emitEvent: false });
          }
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
  private updateSchichtdauer(): void {
    const dauerMinuten = calculateSchichtdauerMinuten(
      this.schichtvorlageForm.controls.beginnLokalzeit.value,
      this.schichtvorlageForm.controls.endeLokalzeit.value,
    );
    this.schichtdauerStunden.set(
      dauerMinuten === null
        ? '0'
        : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(dauerMinuten / 60),
    );
  }

  private updateStandardpause(): void {
    const standardpauseMinuten = calculateStandardpauseMinuten(
      this.schichtvorlageForm.controls.beginnLokalzeit.value,
      this.schichtvorlageForm.controls.endeLokalzeit.value,
    );
    if (standardpauseMinuten === null) return;
    this.schichtvorlageForm.controls.standardpauseMinuten.setValue(standardpauseMinuten);
  }

  private getAnlage(): ISchichtvorlageAnlage {
    const formwert = this.schichtvorlageForm.getRawValue();
    return {
      bezeichnung: formwert.bezeichnung.trim(),
      beginnLokalzeit: formwert.beginnLokalzeit,
      endeLokalzeit: formwert.endeLokalzeit,
      endetAmFolgetag: formwert.endeLokalzeit < formwert.beginnLokalzeit,
      standardpauseMinuten: formwert.standardpauseMinuten,
    };
  }

  private getAktualisierung(): ISchichtvorlageAktualisierung {
    return {
      ...this.getAnlage(),
      aktiv: this.schichtvorlageForm.controls.aktiv.getRawValue(),
    };
  }
}
