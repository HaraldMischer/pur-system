// pur-system/src/app/components/schichtplan/dienstplan-tagesstruktur-bearbeiten-dialog/dienstplan-tagesstruktur-bearbeiten-dialog.ts

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import type { IDienstplanKalendertag } from '../../../commons/models/domain/dienstplan-kalendertag';
import type {
  IFreieTagesschichtSchreibdaten,
  TModellschichtTag,
} from '../../../commons/models/domain/schichtmodell';
import { nichtLeerValidator } from '../../../commons/validators/nicht-leer.validator';
import { EingabeMinuten } from '../../shared/eingabe-minuten/eingabe-minuten';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';

type TSchichtForm = FormGroup<{
  bezeichnung: FormControl<string>;
  beginnLokalzeit: FormControl<string>;
  beginnTag: FormControl<TModellschichtTag>;
  endeLokalzeit: FormControl<string>;
  endeTag: FormControl<TModellschichtTag>;
  vorbereitungsminuten: FormControl<number>;
  nachbereitungsminuten: FormControl<number>;
  mehrfachbelegungErlaubt: FormControl<boolean>;
}>;

type TTagForm = FormGroup<{
  datum: FormControl<string>;
  schichten: FormArray<TSchichtForm>;
}>;

export type TDienstplanTagesstrukturBearbeitenDialogDaten = {
  readonly kalendertage: readonly IDienstplanKalendertag[];
};

@Component({
  selector: 'app-dienstplan-tagesstruktur-bearbeiten-dialog',
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
  templateUrl: './dienstplan-tagesstruktur-bearbeiten-dialog.html',
  styleUrl: './dienstplan-tagesstruktur-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanTagesstrukturBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(
    MatDialogRef<
      DienstplanTagesstrukturBearbeitenDialog,
      readonly IFreieTagesschichtSchreibdaten[]
    >,
  );
  readonly daten = inject<TDienstplanTagesstrukturBearbeitenDialogDaten>(MAT_DIALOG_DATA);

  // ===== Öffentliche Werte ====================

  readonly sondertage = this.daten.kalendertage.filter((tag) => {
    return tag.oeffnungsregelQuelle === 'sondertag' && tag.oeffnungsregel.geoeffnet;
  });
  readonly form = new FormGroup({
    tage: new FormArray<TTagForm>(
      this.sondertage.map((tag) => {
        return new FormGroup({
          datum: new FormControl(tag.datum, { nonNullable: true }),
          schichten: new FormArray<TSchichtForm>([this.createSchichtForm(tag)]),
        });
      }),
    ),
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Fügt dem ausgewählten Sondertag eine weitere frei konfigurierbare Schicht hinzu.
   */
  addSchicht(tagIndex: number): void {
    this.form.controls.tage.at(tagIndex).controls.schichten.push(this.createSchichtForm());
  }

  /**
   * Entfernt eine Schicht aus dem ausgewählten Sondertag.
   */
  removeSchicht(tagIndex: number, schichtIndex: number): void {
    const schichten = this.form.controls.tage.at(tagIndex).controls.schichten;
    if (schichten.length <= 1) return;
    schichten.removeAt(schichtIndex);
  }

  /**
   * Bestätigt alle frei konfigurierten Sondertagsschichten.
   */
  save(): void {
    if (this.form.invalid) return;
    const schichten = this.form.controls.tage.controls.flatMap((tag) => {
      return tag.controls.schichten.controls.map((schicht, reihenfolge) => {
        const wert = schicht.getRawValue();
        return {
          datum: tag.controls.datum.value,
          bezeichnung: wert.bezeichnung.trim(),
          reihenfolge,
          beginn: { lokalzeit: wert.beginnLokalzeit, tag: wert.beginnTag },
          ende: { lokalzeit: wert.endeLokalzeit, tag: wert.endeTag },
          vorbereitungsminuten: wert.vorbereitungsminuten,
          nachbereitungsminuten: wert.nachbereitungsminuten,
          mehrfachbelegungErlaubt: wert.mehrfachbelegungErlaubt,
        } satisfies IFreieTagesschichtSchreibdaten;
      });
    });
    this.dialogRef.close(schichten);
  }

  // ===== Interne Helfer =======================

  private createSchichtForm(tag?: IDienstplanKalendertag): TSchichtForm {
    const oeffnung = tag?.oeffnungsregel;
    const geoeffnet = oeffnung?.geoeffnet === true ? oeffnung : null;
    return new FormGroup({
      bezeichnung: new FormControl('Schicht', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      beginnLokalzeit: new FormControl(geoeffnet?.beginnLokalzeit ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      beginnTag: new FormControl<TModellschichtTag>('starttag', { nonNullable: true }),
      endeLokalzeit: new FormControl(geoeffnet?.endeLokalzeit ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeTag: new FormControl<TModellschichtTag>(
        geoeffnet?.endetAmFolgetag ? 'folgetag' : 'starttag',
        { nonNullable: true },
      ),
      vorbereitungsminuten: new FormControl(0, { nonNullable: true }),
      nachbereitungsminuten: new FormControl(0, { nonNullable: true }),
      mehrfachbelegungErlaubt: new FormControl(false, { nonNullable: true }),
    });
  }
}
