// pur-system/src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
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
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import {
  IModellschichtSchreibdaten,
  ISchichtmodellAktualisierung,
  ISchichtmodellAnlage,
  ISchichtmodellBestand,
} from '../../../commons/models/domain/schichtmodell';
import { nichtLeerValidator } from '../../../commons/validators/nicht-leer.validator';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';

// ===== Top-Level Helper =====================

export type TSchichtmodellBearbeitenDialogDaten = {
  readonly pfad: IFilialPfad;
  readonly bestand?: ISchichtmodellBestand;
};

function zeitfolgeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const beginn = control.get('beginnLokalzeit')?.value as string | undefined;
    const ende = control.get('endeLokalzeit')?.value as string | undefined;
    if (!beginn || !ende) return null;
    return beginn !== ende ? null : { ungueltigeZeitfolge: true };
  };
}

function getLokalzeitMinuten(lokalzeit: string): number | null {
  const treffer = /^(\d{2}):(\d{2})$/.exec(lokalzeit);
  if (!treffer) return null;
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  if (stunden > 23 || minuten > 59) return null;
  return stunden * 60 + minuten;
}

function calculateSchichtdauerMinuten(beginn: string, ende: string): number | null {
  const beginnMinuten = getLokalzeitMinuten(beginn);
  const endeMinuten = getLokalzeitMinuten(ende);
  if (beginnMinuten === null || endeMinuten === null || beginnMinuten === endeMinuten) return null;
  return endeMinuten + (endeMinuten < beginnMinuten ? 24 * 60 : 0) - beginnMinuten;
}

function calculateStandardpauseMinuten(beginn: string, ende: string): number {
  const dauerMinuten = calculateSchichtdauerMinuten(beginn, ende);
  if (dauerMinuten === null || dauerMinuten <= 6 * 60) return 0;
  return dauerMinuten <= 9 * 60 ? 30 : 45;
}

@Component({
  selector: 'app-schichtmodell-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './schichtmodell-bearbeiten-dialog.html',
  styleUrl: './schichtmodell-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtmodellBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(MatDialogRef<SchichtmodellBearbeitenDialog, boolean>);
  private readonly destroyRef = inject(DestroyRef);
  readonly daten = inject<TSchichtmodellBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  readonly schichtmodellStore = inject(SchichtmodellStore);

  // ===== Interner State =======================

  private readonly urspruenglicheAktualisierung: string | null;

  // ===== Öffentliche Werte ====================

  readonly istBearbeitung = Boolean(this.daten.bestand);
  readonly hatAenderungen = signal(!this.istBearbeitung);
  readonly schichtmodellForm = new FormGroup({
    bezeichnung: new FormControl(this.daten.bestand?.schichtmodell.bezeichnung ?? '', {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator, Validators.maxLength(80)],
    }),
    aktiv: new FormControl(
      {
        value: this.daten.bestand?.schichtmodell.aktiv ?? true,
        disabled: !this.istBearbeitung,
      },
      { nonNullable: true },
    ),
    modellschichten: new FormArray(
      (this.daten.bestand?.modellschichten.length
        ? this.daten.bestand.modellschichten
        : [undefined]
      ).map((modellschicht) => this.createModellschichtForm(modellschicht)),
    ),
  });

  constructor() {
    this.urspruenglicheAktualisierung = this.daten.bestand
      ? JSON.stringify(this.getAktualisierung())
      : null;
    this.schichtmodellForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hatAenderungen.set(
        this.urspruenglicheAktualisierung !== JSON.stringify(this.getAktualisierung()),
      );
    });
    effect(() => {
      const inProgress = this.schichtmodellStore.inProgress();
      untracked(() => {
        if (inProgress) {
          this.schichtmodellForm.disable({ emitEvent: false });
        } else {
          this.schichtmodellForm.enable({ emitEvent: false });
          if (!this.istBearbeitung) {
            this.schichtmodellForm.controls.aktiv.disable({ emitEvent: false });
          }
        }
      });
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Fügt am Ende des Modells eine leere Modellschicht hinzu.
   */
  addModellschicht(): void {
    this.schichtmodellForm.controls.modellschichten.push(this.createModellschichtForm());
  }

  /**
   * Entfernt eine Modellschicht, sofern mindestens eine erhalten bleibt.
   *
   * @param index - Position der zu entfernenden Modellschicht.
   */
  removeModellschicht(index: number): void {
    if (this.schichtmodellForm.controls.modellschichten.length <= 1) return;
    this.schichtmodellForm.controls.modellschichten.removeAt(index);
  }

  /**
   * Verschiebt eine Modellschicht um eine Position nach oben.
   *
   * @param index - Aktuelle Position der Modellschicht.
   */
  moveModellschichtUp(index: number): void {
    this.moveModellschicht(index, index - 1);
  }

  /**
   * Verschiebt eine Modellschicht um eine Position nach unten.
   *
   * @param index - Aktuelle Position der Modellschicht.
   */
  moveModellschichtDown(index: number): void {
    this.moveModellschicht(index, index + 1);
  }

  /**
   * Liefert die formatierte Dauer einer Modellschicht.
   *
   * @param index - Position der Modellschicht.
   * @returns Dauer in Stunden oder `0` bei noch ungültigen Zeitwerten.
   */
  getSchichtdauerStunden(index: number): string {
    const form = this.schichtmodellForm.controls.modellschichten.at(index);
    const dauerMinuten = calculateSchichtdauerMinuten(
      form.controls.beginnLokalzeit.value,
      form.controls.endeLokalzeit.value,
    );
    return dauerMinuten === null
      ? '0'
      : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(dauerMinuten / 60);
  }

  /**
   * Validiert und speichert das vollständige Schichtmodell.
   */
  async saveSchichtmodell(): Promise<void> {
    if (this.schichtmodellForm.invalid || this.schichtmodellStore.inProgress()) {
      this.schichtmodellForm.markAllAsTouched();
      return;
    }
    if (this.istBearbeitung && !this.hatAenderungen()) return;
    this.dialogRef.disableClose = true;
    try {
      const bestand = this.daten.bestand;
      if (bestand) {
        await this.schichtmodellStore.updateSchichtmodell(
          this.daten.pfad,
          bestand.schichtmodell.id,
          this.getAktualisierung(),
        );
      } else {
        await this.schichtmodellStore.createSchichtmodell(this.daten.pfad, this.getAnlage());
      }
      this.dialogRef.close(true);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  // ===== Interne Helfer =======================

  private createModellschichtForm(modellschicht?: IModellschichtSchreibdaten) {
    const form = new FormGroup(
      {
        id: new FormControl(modellschicht?.id ?? '', { nonNullable: true }),
        bezeichnung: new FormControl(modellschicht?.bezeichnung ?? '', {
          nonNullable: true,
          validators: [Validators.required, nichtLeerValidator, Validators.maxLength(80)],
        }),
        beginnLokalzeit: new FormControl(modellschicht?.beginnLokalzeit ?? '', {
          nonNullable: true,
          validators: [Validators.required],
        }),
        endeLokalzeit: new FormControl(modellschicht?.endeLokalzeit ?? '', {
          nonNullable: true,
          validators: [Validators.required],
        }),
        standardpauseMinuten: new FormControl(modellschicht?.standardpauseMinuten ?? 0, {
          nonNullable: true,
        }),
      },
      { validators: [zeitfolgeValidator()] },
    );
    form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const pause = calculateStandardpauseMinuten(
        form.controls.beginnLokalzeit.value,
        form.controls.endeLokalzeit.value,
      );
      if (form.controls.standardpauseMinuten.value !== pause) {
        form.controls.standardpauseMinuten.setValue(pause, { emitEvent: false });
      }
    });
    return form;
  }

  private moveModellschicht(von: number, nach: number): void {
    const forms = this.schichtmodellForm.controls.modellschichten;
    if (nach < 0 || nach >= forms.length) return;
    const form = forms.at(von);
    forms.removeAt(von, { emitEvent: false });
    forms.insert(nach, form);
    forms.markAsDirty();
    forms.updateValueAndValidity();
  }

  private getModellschichten(): IModellschichtSchreibdaten[] {
    return this.schichtmodellForm.controls.modellschichten.controls.map((form, index) => {
      const wert = form.getRawValue();
      return {
        ...(wert.id ? { id: wert.id } : {}),
        bezeichnung: wert.bezeichnung.trim(),
        reihenfolge: index,
        beginnLokalzeit: wert.beginnLokalzeit,
        endeLokalzeit: wert.endeLokalzeit,
        endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
        standardpauseMinuten: wert.standardpauseMinuten,
      };
    });
  }

  private getAnlage(): ISchichtmodellAnlage {
    return {
      bezeichnung: this.schichtmodellForm.controls.bezeichnung.value.trim(),
      modellschichten: this.getModellschichten(),
    };
  }

  private getAktualisierung(): ISchichtmodellAktualisierung {
    return {
      ...this.getAnlage(),
      aktiv: this.schichtmodellForm.controls.aktiv.getRawValue(),
    };
  }
}
