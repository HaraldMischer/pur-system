// pur-system/src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { MAX_RANDMINUTEN } from '../../../commons/constants/schicht.constants';
import type { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import type { IGeoeffneteOeffnungsregel } from '../../../commons/models/domain/filialeinstellung';
import type {
  ISchichtmodellBestand,
  ITagesvorlagenschichtEintrag,
  ITagesvorlagenschichtSchreibdaten,
  TSchichtZeitgrenzeTag,
  TTagesvorlageTyp,
} from '../../../commons/models/domain/schichtmodell';
import {
  addLokalzeitMinuten,
  getLokalzeitMinuten,
  getSchichtTagFuerLokalzeit,
} from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { nichtLeerValidator } from '../../../commons/validators/nicht-leer.validator';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { EingabeMinuten } from '../../shared/eingabe-minuten/eingabe-minuten';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';

type TSchichtForm = FormGroup<{
  id: FormControl<string>;
  bezeichnung: FormControl<string>;
  beginnLokalzeit: FormControl<string>;
  beginnTag: FormControl<TSchichtZeitgrenzeTag>;
  endeLokalzeit: FormControl<string>;
  endeTag: FormControl<TSchichtZeitgrenzeTag>;
  vorbereitungsminuten: FormControl<number>;
  nachbereitungsminuten: FormControl<number>;
  mehrfachbelegungErlaubt: FormControl<boolean>;
}>;

export type TSchichtmodellBearbeitenDialogDaten = {
  readonly pfad: IFilialPfad;
  readonly oeffnungen: Readonly<Record<TTagesvorlageTyp, IGeoeffneteOeffnungsregel>>;
  readonly bestand?: ISchichtmodellBestand;
};

@Component({
  selector: 'app-schichtmodell-bearbeiten-dialog',
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
  templateUrl: './schichtmodell-bearbeiten-dialog.html',
  styleUrl: './schichtmodell-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtmodellBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<SchichtmodellBearbeitenDialog, boolean>);
  readonly daten = inject<TSchichtmodellBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  readonly store = inject(SchichtmodellStore);

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
   *
   * Die neue innere Grenze halbiert den verbleibenden Zeitraum bis zum Schichtende.
   */
  addSchicht(vorlage: TTagesvorlageTyp): void {
    const schichten = this.form.controls[vorlage];
    const bisherigeLetzteSchicht = schichten.at(-1);
    const automatischeGrenze = this.getHalbierteLetzteSchichtgrenze(
      vorlage,
      bisherigeLetzteSchicht,
    );
    const bisherigeNachbereitungsminuten =
      bisherigeLetzteSchicht?.controls.nachbereitungsminuten.value ?? 0;
    bisherigeLetzteSchicht?.controls.nachbereitungsminuten.setValue(0);
    bisherigeLetzteSchicht?.controls.endeLokalzeit.setValue(automatischeGrenze);
    const neueSchicht = this.createSchichtForm(vorlage, undefined, false, true);
    neueSchicht.controls.beginnLokalzeit.setValue(automatischeGrenze);
    neueSchicht.controls.nachbereitungsminuten.setValue(bisherigeNachbereitungsminuten);
    schichten.push(neueSchicht);
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
    if (index === 0) {
      schichten
        .at(1)
        .controls.vorbereitungsminuten.setValue(
          schichten.at(0).controls.vorbereitungsminuten.value,
        );
    }
    if (index === schichten.length - 1) {
      schichten
        .at(index - 1)
        .controls.nachbereitungsminuten.setValue(
          schichten.at(index).controls.nachbereitungsminuten.value,
        );
    }
    schichten.removeAt(index);
    const oeffnung = this.daten.oeffnungen[vorlage];
    schichten.at(0).controls.beginnLokalzeit.setValue(oeffnung.beginnLokalzeit);
    schichten.at(-1).controls.endeLokalzeit.setValue(oeffnung.endeLokalzeit);
  }

  /**
   * Speichert beide Vorlagen des Schichtmodells.
   */
  async save(): Promise<void> {
    if (this.form.invalid || this.store.inProgress()) return;
    const tagesvorlagenschichten = [...this.mapVorlage('wochentag'), ...this.mapVorlage('sonntag')];
    try {
      if (this.daten.bestand) {
        await this.store.updateSchichtmodell(
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
        await this.store.createSchichtmodell(
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
    const schichtdaten = schichten?.length ? schichten : [undefined];
    const formen = schichtdaten.map((schicht, index) => {
      return this.createSchichtForm(
        vorlage,
        schicht,
        index === 0,
        index === schichtdaten.length - 1,
      );
    });
    const letzterIndex = formen.length - 1;
    formen.forEach((form, index) => {
      if (index > 0) form.controls.vorbereitungsminuten.setValue(0, { emitEvent: false });
      if (index < letzterIndex) {
        form.controls.nachbereitungsminuten.setValue(0, { emitEvent: false });
      }
    });
    return formen;
  }

  private getHalbierteLetzteSchichtgrenze(
    vorlage: TTagesvorlageTyp,
    letzteSchicht: TSchichtForm | undefined,
  ): string {
    const oeffnung = this.daten.oeffnungen[vorlage];
    const beginn = getLokalzeitMinuten(
      letzteSchicht?.controls.beginnLokalzeit.value ?? oeffnung.beginnLokalzeit,
    );
    const ende = getLokalzeitMinuten(oeffnung.endeLokalzeit);
    if (beginn === null || ende === null) return '';
    const absoluterBeginn =
      beginn + (letzteSchicht?.controls.beginnTag.value === 'folgetag' ? 24 * 60 : 0);
    const absolutesEnde = ende + (oeffnung.endetAmFolgetag ? 24 * 60 : 0);
    if (absolutesEnde <= absoluterBeginn) return '';
    return (
      addLokalzeitMinuten(
        '00:00',
        absoluterBeginn + Math.floor((absolutesEnde - absoluterBeginn) / 2),
      ) ?? ''
    );
  }

  private createSchichtForm(
    vorlage: TTagesvorlageTyp,
    schicht?: ITagesvorlagenschichtEintrag,
    istErsteSchicht = false,
    istLetzteSchicht = false,
  ): TSchichtForm {
    const oeffnung = this.daten.oeffnungen[vorlage];
    const beginnLokalzeit = istErsteSchicht
      ? oeffnung.beginnLokalzeit
      : (schicht?.beginn?.lokalzeit ?? '');
    const endeLokalzeit = istLetzteSchicht
      ? oeffnung.endeLokalzeit
      : (schicht?.ende?.lokalzeit ?? '');
    const beginnTag = istErsteSchicht
      ? 'starttag'
      : schicht?.beginn
        ? (getSchichtTagFuerLokalzeit(schicht.beginn.lokalzeit, oeffnung) ?? schicht.beginn.tag)
        : 'starttag';
    const endeTag = istLetzteSchicht
      ? oeffnung.endetAmFolgetag
        ? 'folgetag'
        : 'starttag'
      : schicht?.ende
        ? (getSchichtTagFuerLokalzeit(schicht.ende.lokalzeit, oeffnung) ?? schicht.ende.tag)
        : 'starttag';
    const form = new FormGroup({
      id: new FormControl(schicht?.id ?? '', { nonNullable: true }),
      bezeichnung: new FormControl(schicht?.bezeichnung ?? '', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator, Validators.maxLength(80)],
      }),
      beginnLokalzeit: new FormControl(beginnLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      beginnTag: new FormControl<TSchichtZeitgrenzeTag>(beginnTag, {
        nonNullable: true,
      }),
      endeLokalzeit: new FormControl(endeLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeTag: new FormControl<TSchichtZeitgrenzeTag>(endeTag, {
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
    form.controls.beginnLokalzeit.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lokalzeit) => {
        const tag = getSchichtTagFuerLokalzeit(lokalzeit, oeffnung);
        if (tag) form.controls.beginnTag.setValue(tag);
      });
    form.controls.endeLokalzeit.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lokalzeit) => {
        const tag = getSchichtTagFuerLokalzeit(lokalzeit, oeffnung);
        if (tag) form.controls.endeTag.setValue(tag);
      });
    return form;
  }

  private mapVorlage(vorlage: TTagesvorlageTyp): ITagesvorlagenschichtSchreibdaten[] {
    const schichten = this.form.controls[vorlage].controls;
    const letzterIndex = schichten.length - 1;
    return schichten.map((schicht, reihenfolge) => {
      const wert = schicht.getRawValue();
      return {
        ...(wert.id ? { id: wert.id } : {}),
        vorlage,
        bezeichnung: wert.bezeichnung.trim(),
        reihenfolge,
        ...(reihenfolge > 0
          ? { beginn: { lokalzeit: wert.beginnLokalzeit, tag: wert.beginnTag } }
          : {}),
        ...(reihenfolge < letzterIndex
          ? { ende: { lokalzeit: wert.endeLokalzeit, tag: wert.endeTag } }
          : {}),
        vorbereitungsminuten: reihenfolge === 0 ? wert.vorbereitungsminuten : 0,
        nachbereitungsminuten: reihenfolge === letzterIndex ? wert.nachbereitungsminuten : 0,
        mehrfachbelegungErlaubt: wert.mehrfachbelegungErlaubt,
      };
    });
  }
}
