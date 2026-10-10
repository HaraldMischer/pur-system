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
import { ISchichtvorlageEintrag } from '../../../commons/models/domain/schichtvorlage';
import {
  createSchichtZeitstempelAusVorlage,
  formatSchichtDatum,
  formatSchichtUhrzeit,
} from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';

export type TSchichtBearbeitenDialogDaten = {
  readonly pfad: IDienstplanVersionPfad;
  readonly zeitzone: string;
  readonly datum: string;
  readonly zeitraumStart: string;
  readonly zeitraumEnde: string;
  readonly mitarbeiter: readonly IMitarbeiterEintrag[];
  readonly schichtvorlagen: readonly ISchichtvorlageEintrag[];
  readonly schicht?: ISchichtEintrag;
};

// ===== Top-Level Helper =====================

function auswahlValidator(erlaubteIds: readonly string[], fehler: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const id = control.value as string;
    return !id || erlaubteIds.includes(id) ? null : { [fehler]: true };
  };
}

function datumValidator(zeitraumStart: string, zeitraumEnde: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const datum = control.value as string;
    if (!datum) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(datum) && datum >= zeitraumStart && datum <= zeitraumEnde
      ? null
      : { datumAusserhalbZeitraum: true };
  };
}

function pauseValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const pauseMinuten = control.value as number;
    return Number.isInteger(pauseMinuten) && pauseMinuten >= 0 ? null : { ungueltigePause: true };
  };
}

function schichtzeitValidator(daten: TSchichtBearbeitenDialogDaten): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const datum = control.get('datum')?.value as string | undefined;
    const schichtvorlageId = control.get('schichtvorlageId')?.value as string | undefined;
    const pauseMinuten = control.get('pauseMinuten')?.value as number | undefined;
    if (!datum || !schichtvorlageId || pauseMinuten === undefined) return null;
    if (control.get('datum')?.invalid || control.get('schichtvorlageId')?.invalid) return null;
    if (control.get('pauseMinuten')?.invalid) return null;

    try {
      const vorlage = getVorlagenMomentaufnahme(daten, schichtvorlageId);
      const { beginn, ende } = createSchichtZeitstempelAusVorlage(datum, vorlage, daten.zeitzone);
      const dauerMinuten = (ende.toMillis() - beginn.toMillis()) / 60_000;
      if (dauerMinuten <= 0) return { ungueltigeZeitwerte: true };
      return pauseMinuten < dauerMinuten ? null : { pauseNichtUnterSchichtdauer: true };
    } catch {
      return { ungueltigeZeitwerte: true };
    }
  };
}

function getVorlagenMomentaufnahme(
  daten: TSchichtBearbeitenDialogDaten,
  schichtvorlageId: string,
): {
  bezeichnung: string;
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
} {
  const schicht = daten.schicht;
  if (schicht?.schichtvorlageId === schichtvorlageId) {
    return {
      bezeichnung: schicht.schichtvorlageBezeichnung,
      beginnLokalzeit: formatSchichtUhrzeit(schicht.beginn, daten.zeitzone),
      endeLokalzeit: formatSchichtUhrzeit(schicht.ende, daten.zeitzone),
      endetAmFolgetag:
        formatSchichtDatum(schicht.beginn, daten.zeitzone) !==
        formatSchichtDatum(schicht.ende, daten.zeitzone),
    };
  }

  const vorlage = daten.schichtvorlagen.find((eintrag) => {
    return eintrag.id === schichtvorlageId && eintrag.aktiv;
  });
  if (!vorlage) throw new Error('Die ausgewählte Schichtvorlage ist nicht mehr aktiv.');
  return vorlage;
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
  readonly schichtvorlagen = this.daten.schichtvorlagen.filter((vorlage) => {
    return vorlage.aktiv || vorlage.id === this.daten.schicht?.schichtvorlageId;
  });
  readonly hatGespeicherteVorlageOhneEintrag = Boolean(
    this.daten.schicht &&
    !this.schichtvorlagen.some((vorlage) => {
      return vorlage.id === this.daten.schicht?.schichtvorlageId;
    }),
  );
  readonly schichtForm = new FormGroup(
    {
      mitarbeiterId: new FormControl(this.daten.schicht?.mitarbeiterId ?? '', {
        nonNullable: true,
        validators: [
          Validators.required,
          auswahlValidator(
            this.daten.mitarbeiter.map((eintrag) => eintrag.id),
            'ungueltigerMitarbeiter',
          ),
        ],
      }),
      datum: new FormControl(
        this.daten.schicht
          ? formatSchichtDatum(this.daten.schicht.beginn, this.daten.zeitzone)
          : this.daten.datum,
        {
          nonNullable: true,
          validators: [
            Validators.required,
            datumValidator(this.daten.zeitraumStart, this.daten.zeitraumEnde),
          ],
        },
      ),
      schichtvorlageId: new FormControl(this.daten.schicht?.schichtvorlageId ?? '', {
        nonNullable: true,
        validators: [
          Validators.required,
          auswahlValidator(
            [
              ...this.daten.schichtvorlagen
                .filter((vorlage) => vorlage.aktiv)
                .map((vorlage) => vorlage.id),
              ...(this.daten.schicht ? [this.daten.schicht.schichtvorlageId] : []),
            ],
            'ungueltigeSchichtvorlage',
          ),
        ],
      }),
      pauseMinuten: new FormControl(this.daten.schicht?.pauseMinuten ?? 0, {
        nonNullable: true,
        validators: [Validators.required, pauseValidator()],
      }),
    },
    { validators: [schichtzeitValidator(this.daten)] },
  );
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
    this.schichtForm.controls.schichtvorlageId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((schichtvorlageId) => {
        const pauseMinuten =
          schichtvorlageId === this.daten.schicht?.schichtvorlageId
            ? this.daten.schicht.pauseMinuten
            : (this.daten.schichtvorlagen.find((vorlage) => {
                return vorlage.id === schichtvorlageId;
              })?.standardpauseMinuten ?? 0);
        this.schichtForm.controls.pauseMinuten.setValue(pauseMinuten);
      });
  }

  // ===== Öffentliche Aktionen =================
  /**
   * Speichert die gültige Schichteingabe.
   */
  async saveSchicht(): Promise<void> {
    if (this.schichtForm.invalid || this.dienstplanStore.inProgress()) {
      this.schichtForm.markAllAsTouched();
      return;
    }
    if (this.istBearbeitung && !this.hatAenderungen()) return;
    const value = this.schichtForm.getRawValue();
    const mitarbeiter = this.daten.mitarbeiter.find(
      (eintrag) => eintrag.id === value.mitarbeiterId,
    );
    if (!mitarbeiter) return;
    try {
      const vorlagenMomentaufnahme = getVorlagenMomentaufnahme(this.daten, value.schichtvorlageId);
      const { beginn, ende } = createSchichtZeitstempelAusVorlage(
        value.datum,
        vorlagenMomentaufnahme,
        this.daten.zeitzone,
      );
      const aktualisierung = {
        mitarbeiterId: mitarbeiter.id,
        schichtvorlageId: value.schichtvorlageId,
        schichtvorlageBezeichnung: vorlagenMomentaufnahme.bezeichnung,
        beginn,
        ende,
        pauseMinuten: value.pauseMinuten,
      };
      if (this.daten.schicht)
        await this.dienstplanStore.updateSchicht(
          this.daten.pfad,
          this.daten.schicht.id,
          aktualisierung,
        );
      else await this.dienstplanStore.createSchicht(this.daten.pfad, aktualisierung);
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
