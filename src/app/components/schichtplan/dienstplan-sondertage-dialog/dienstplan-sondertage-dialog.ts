// pur-system/src/app/components/schichtplan/dienstplan-sondertage-dialog/dienstplan-sondertage-dialog.ts

import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import type { IDienstplanKalendertag } from '../../../commons/models/domain/dienstplan-kalendertag';
import type {
  IFreieTagesschichtSchreibdaten,
  TSchichtZeitgrenzeTag,
} from '../../../commons/models/domain/schichtmodell';
import { getNaechsteSchichtbezeichnung } from '../../../commons/utils/dienstplan/schicht-bezeichnung';
import {
  getGleichmaessigeLokalzeitGrenzen,
  getSchichtTagFuerLokalzeit,
} from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { nichtLeerValidator } from '../../../commons/validators/nicht-leer.validator';
import { EingabeMinuten } from '../../shared/eingabe-minuten/eingabe-minuten';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';

type TSchichtForm = FormGroup<{
  bezeichnung: FormControl<string>;
  beginnLokalzeit: FormControl<string>;
  beginnTag: FormControl<TSchichtZeitgrenzeTag>;
  endeLokalzeit: FormControl<string>;
  endeTag: FormControl<TSchichtZeitgrenzeTag>;
  vorbereitungsminuten: FormControl<number>;
  nachbereitungsminuten: FormControl<number>;
  mehrfachbelegungErlaubt: FormControl<boolean>;
}>;

type TTagForm = FormGroup<{
  datum: FormControl<string>;
  schichten: FormArray<TSchichtForm>;
}>;

export type TDienstplanSondertageDialogDaten = {
  readonly kalendertage: readonly IDienstplanKalendertag[];
};

@Component({
  selector: 'app-dienstplan-sondertage-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    EingabeMinuten,
    EingabeZeit,
  ],
  templateUrl: './dienstplan-sondertage-dialog.html',
  styleUrl: './dienstplan-sondertage-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanSondertageDialog {
  // ===== Interne Dependency Injection =========

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(
    MatDialogRef<DienstplanSondertageDialog, readonly IFreieTagesschichtSchreibdaten[]>,
  );
  readonly daten = inject<TDienstplanSondertageDialogDaten>(MAT_DIALOG_DATA);

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
    const schichten = this.form.controls.tage.at(tagIndex).controls.schichten;
    const bisherigeLetzteSchicht = schichten.at(-1);
    const bisherigeNachbereitungsminuten =
      bisherigeLetzteSchicht.controls.nachbereitungsminuten.value;
    bisherigeLetzteSchicht.controls.nachbereitungsminuten.setValue(0);
    const neueSchicht = this.createSchichtForm(
      this.sondertage[tagIndex],
      getNaechsteSchichtbezeichnung(
        schichten.controls.map((schicht) => {
          return schicht.controls.bezeichnung.value;
        }),
      ),
    );
    neueSchicht.controls.nachbereitungsminuten.setValue(bisherigeNachbereitungsminuten);
    schichten.push(neueSchicht);
    this.verteileSchichtenGleichmaessig(tagIndex);
  }

  /**
   * Entfernt eine Schicht aus dem ausgewählten Sondertag.
   */
  removeSchicht(tagIndex: number, schichtIndex: number): void {
    const schichten = this.form.controls.tage.at(tagIndex).controls.schichten;
    if (schichten.length <= 1) return;
    if (schichtIndex === 0) {
      schichten
        .at(1)
        .controls.vorbereitungsminuten.setValue(
          schichten.at(0).controls.vorbereitungsminuten.value,
        );
    }
    if (schichtIndex === schichten.length - 1) {
      schichten
        .at(schichtIndex - 1)
        .controls.nachbereitungsminuten.setValue(
          schichten.at(schichtIndex).controls.nachbereitungsminuten.value,
        );
    }
    schichten.removeAt(schichtIndex);
  }

  /**
   * Bestätigt alle frei konfigurierten Sondertagsschichten.
   */
  save(): void {
    if (this.form.invalid) return;
    const schichten = this.form.controls.tage.controls.flatMap((tag) => {
      const tagesschichten = tag.controls.schichten.controls;
      const letzterIndex = tagesschichten.length - 1;
      return tagesschichten.map((schicht, reihenfolge) => {
        const wert = schicht.getRawValue();
        return {
          datum: tag.controls.datum.value,
          bezeichnung: wert.bezeichnung.trim(),
          reihenfolge,
          beginn: { lokalzeit: wert.beginnLokalzeit, tag: wert.beginnTag },
          ende: { lokalzeit: wert.endeLokalzeit, tag: wert.endeTag },
          vorbereitungsminuten: reihenfolge === 0 ? wert.vorbereitungsminuten : 0,
          nachbereitungsminuten: reihenfolge === letzterIndex ? wert.nachbereitungsminuten : 0,
          mehrfachbelegungErlaubt: wert.mehrfachbelegungErlaubt,
        } satisfies IFreieTagesschichtSchreibdaten;
      });
    });
    this.dialogRef.close(schichten);
  }

  // ===== Interne Helfer =======================

  private verteileSchichtenGleichmaessig(tagIndex: number): void {
    const schichten = this.form.controls.tage.at(tagIndex).controls.schichten;
    const oeffnung = this.sondertage[tagIndex]?.oeffnungsregel;
    if (!oeffnung?.geoeffnet) return;
    const grenzen = getGleichmaessigeLokalzeitGrenzen(oeffnung, schichten.length, 15);
    if (grenzen.length !== schichten.length - 1) return;
    schichten.controls.forEach((schicht, index) => {
      schicht.controls.beginnLokalzeit.setValue(
        index === 0 ? oeffnung.beginnLokalzeit : grenzen[index - 1],
      );
      schicht.controls.endeLokalzeit.setValue(
        index === schichten.length - 1 ? oeffnung.endeLokalzeit : grenzen[index],
      );
    });
  }

  private createSchichtForm(
    tag?: IDienstplanKalendertag,
    standardbezeichnung = 'Schicht 1',
  ): TSchichtForm {
    const oeffnung = tag?.oeffnungsregel;
    const geoeffnet = oeffnung?.geoeffnet === true ? oeffnung : null;
    const form = new FormGroup({
      bezeichnung: new FormControl(standardbezeichnung, {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      beginnLokalzeit: new FormControl(geoeffnet?.beginnLokalzeit ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      beginnTag: new FormControl<TSchichtZeitgrenzeTag>('starttag', { nonNullable: true }),
      endeLokalzeit: new FormControl(geoeffnet?.endeLokalzeit ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeTag: new FormControl<TSchichtZeitgrenzeTag>(
        geoeffnet?.endetAmFolgetag ? 'folgetag' : 'starttag',
        { nonNullable: true },
      ),
      vorbereitungsminuten: new FormControl(0, { nonNullable: true }),
      nachbereitungsminuten: new FormControl(0, { nonNullable: true }),
      mehrfachbelegungErlaubt: new FormControl(false, { nonNullable: true }),
    });
    if (geoeffnet) {
      form.controls.beginnLokalzeit.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((lokalzeit) => {
          const tag = getSchichtTagFuerLokalzeit(lokalzeit, geoeffnet);
          if (tag) form.controls.beginnTag.setValue(tag);
        });
      form.controls.endeLokalzeit.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((lokalzeit) => {
          const tag = getSchichtTagFuerLokalzeit(lokalzeit, geoeffnet);
          if (tag) form.controls.endeTag.setValue(tag);
        });
    }
    return form;
  }
}
