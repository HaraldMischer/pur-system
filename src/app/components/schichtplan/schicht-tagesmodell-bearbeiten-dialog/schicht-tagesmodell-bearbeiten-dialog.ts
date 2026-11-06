// pur-system/src/app/components/schichtplan/schicht-tagesmodell-bearbeiten-dialog/schicht-tagesmodell-bearbeiten-dialog.ts

import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { MAX_RANDMINUTEN } from '../../../commons/constants/schichtmodell.constants';
import type { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import type { IGeoeffneteOeffnungsregel } from '../../../commons/models/domain/filialeinstellung';
import type {
  ISchichttagesmodellBestand,
  ITagesvorlagenschichtEintrag,
  ITagesvorlagenschichtSchreibdaten,
  TModellschichtTag,
  TTagesvorlageTyp,
} from '../../../commons/models/domain/schichtmodell';
import { nichtLeerValidator } from '../../../commons/validators/nicht-leer.validator';
import { SchichtTagesmodellStore } from '../../../stores/domain/schicht-tagesmodell.store';
import { EingabeMinuten } from '../../shared/eingabe-minuten/eingabe-minuten';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';

type TSchichtForm = FormGroup<{
  id: FormControl<string>;
  bezeichnung: FormControl<string>;
  beginnLokalzeit: FormControl<string>;
  beginnTag: FormControl<TModellschichtTag>;
  endeLokalzeit: FormControl<string>;
  endeTag: FormControl<TModellschichtTag>;
  vorbereitungsminuten: FormControl<number>;
  nachbereitungsminuten: FormControl<number>;
  mehrfachbelegungErlaubt: FormControl<boolean>;
}>;

export type TSchichtTagesmodellBearbeitenDialogDaten = {
  readonly pfad: IFilialPfad;
  readonly oeffnungen: Readonly<Record<TTagesvorlageTyp, IGeoeffneteOeffnungsregel>>;
  readonly bestand?: ISchichttagesmodellBestand;
};

@Component({
  selector: 'app-schicht-tagesmodell-bearbeiten-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    EingabeMinuten,
    EingabeZeit,
  ],
  templateUrl: './schicht-tagesmodell-bearbeiten-dialog.html',
  styleUrl: './schicht-tagesmodell-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtTagesmodellBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(MatDialogRef<SchichtTagesmodellBearbeitenDialog, boolean>);
  readonly daten = inject<TSchichtTagesmodellBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  readonly store = inject(SchichtTagesmodellStore);

  // ===== Öffentliche Werte ====================

  readonly istBearbeitung = Boolean(this.daten.bestand);
  readonly form = new FormGroup({
    bezeichnung: new FormControl(this.daten.bestand?.schichtmodell.bezeichnung ?? '', {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator, Validators.maxLength(80)],
    }),
    aktiv: new FormControl(
      { value: this.daten.bestand?.schichtmodell.aktiv ?? true, disabled: !this.istBearbeitung },
      { nonNullable: true },
    ),
    wochentag: new FormArray<TSchichtForm>(this.createVorlage('wochentag')),
    sonntag: new FormArray<TSchichtForm>(this.createVorlage('sonntag')),
  });

  constructor() {
    effect(() => {
      const inProgress = this.store.inProgress();
      untracked(() => {
        if (inProgress) this.form.disable({ emitEvent: false });
        else {
          this.form.enable({ emitEvent: false });
          if (!this.istBearbeitung) this.form.controls.aktiv.disable({ emitEvent: false });
        }
      });
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Fügt der ausgewählten Tagesvorlage eine frei konfigurierbare Schicht hinzu.
   */
  addSchicht(vorlage: TTagesvorlageTyp): void {
    this.form.controls[vorlage].push(this.createSchichtForm());
  }

  /**
   * Liefert die typisierte Schichtliste der ausgewählten Tagesvorlage.
   *
   * @param vorlage - Wochentags- oder Sonntagsvorlage.
   */
  getVorlageForm(vorlage: TTagesvorlageTyp): FormArray<TSchichtForm> {
    return this.form.controls[vorlage];
  }

  /**
   * Entfernt eine Schicht aus der ausgewählten Tagesvorlage.
   */
  removeSchicht(vorlage: TTagesvorlageTyp, index: number): void {
    const schichten = this.form.controls[vorlage];
    if (schichten.length <= 1) return;
    schichten.removeAt(index);
  }

  /**
   * Speichert beide Vorlagen des Schicht-Tagesmodells.
   */
  async save(): Promise<void> {
    if (this.form.invalid || this.store.inProgress()) return;
    const tagesvorlagenschichten = [...this.mapVorlage('wochentag'), ...this.mapVorlage('sonntag')];
    try {
      if (this.daten.bestand) {
        await this.store.updateSchichtTagesmodell(
          this.daten.pfad,
          this.daten.bestand.schichtmodell.id,
          {
            bezeichnung: this.form.controls.bezeichnung.value.trim(),
            aktiv: this.form.controls.aktiv.value,
            tagesvorlagenschichten,
          },
          this.daten.oeffnungen,
        );
      } else {
        await this.store.createSchichtTagesmodell(
          this.daten.pfad,
          {
            bezeichnung: this.form.controls.bezeichnung.value.trim(),
            tagesvorlagenschichten,
          },
          this.daten.oeffnungen,
        );
      }
      this.dialogRef.close(true);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    }
  }

  // ===== Interne Helfer =======================

  private createVorlage(vorlage: TTagesvorlageTyp): TSchichtForm[] {
    const schichten = this.daten.bestand?.tagesvorlagenschichten.filter((schicht) => {
      return schicht.vorlage === vorlage;
    });
    return (schichten?.length ? schichten : [undefined]).map((schicht) => {
      return this.createSchichtForm(schicht);
    });
  }

  private createSchichtForm(schicht?: ITagesvorlagenschichtEintrag): TSchichtForm {
    return new FormGroup({
      id: new FormControl(schicht?.id ?? '', { nonNullable: true }),
      bezeichnung: new FormControl(schicht?.bezeichnung ?? '', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator, Validators.maxLength(80)],
      }),
      beginnLokalzeit: new FormControl(schicht?.beginn.lokalzeit ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      beginnTag: new FormControl<TModellschichtTag>(schicht?.beginn.tag ?? 'starttag', {
        nonNullable: true,
      }),
      endeLokalzeit: new FormControl(schicht?.ende.lokalzeit ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeTag: new FormControl<TModellschichtTag>(schicht?.ende.tag ?? 'starttag', {
        nonNullable: true,
      }),
      vorbereitungsminuten: new FormControl(schicht?.vorbereitungsminuten ?? 0, {
        nonNullable: true,
        validators: [Validators.min(0), Validators.max(MAX_RANDMINUTEN)],
      }),
      nachbereitungsminuten: new FormControl(schicht?.nachbereitungsminuten ?? 0, {
        nonNullable: true,
        validators: [Validators.min(0), Validators.max(MAX_RANDMINUTEN)],
      }),
      mehrfachbelegungErlaubt: new FormControl(schicht?.mehrfachbelegungErlaubt ?? false, {
        nonNullable: true,
      }),
    });
  }

  private mapVorlage(vorlage: TTagesvorlageTyp): ITagesvorlagenschichtSchreibdaten[] {
    return this.form.controls[vorlage].controls.map((schicht, reihenfolge) => {
      const wert = schicht.getRawValue();
      return {
        ...(wert.id ? { id: wert.id } : {}),
        vorlage,
        bezeichnung: wert.bezeichnung.trim(),
        reihenfolge,
        beginn: { lokalzeit: wert.beginnLokalzeit, tag: wert.beginnTag },
        ende: { lokalzeit: wert.endeLokalzeit, tag: wert.endeTag },
        vorbereitungsminuten: wert.vorbereitungsminuten,
        nachbereitungsminuten: wert.nachbereitungsminuten,
        mehrfachbelegungErlaubt: wert.mehrfachbelegungErlaubt,
      };
    });
  }
}
