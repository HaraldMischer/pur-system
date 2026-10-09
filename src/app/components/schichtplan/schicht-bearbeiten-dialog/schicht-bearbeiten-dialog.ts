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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  readonly schichtForm = new FormGroup({
    mitarbeiterId: new FormControl(this.daten.schicht?.mitarbeiterId ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    datum: new FormControl(
      this.daten.schicht
        ? formatSchichtDatum(this.daten.schicht.beginn, this.daten.zeitzone)
        : this.daten.datum,
      { nonNullable: true, validators: [Validators.required] },
    ),
    schichtvorlageId: new FormControl(this.daten.schicht?.schichtvorlageId ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    pauseMinuten: new FormControl(this.daten.schicht?.pauseMinuten ?? 0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
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
    if (value.datum < this.daten.zeitraumStart || value.datum > this.daten.zeitraumEnde) {
      this.error.set('Das Schichtdatum muss innerhalb des ausgewählten Monats liegen.');
      return;
    }
    const mitarbeiter = this.daten.mitarbeiter.find(
      (eintrag) => eintrag.id === value.mitarbeiterId,
    );
    if (!mitarbeiter) return;
    try {
      const vorlagenMomentaufnahme = this.getVorlagenMomentaufnahme(value.schichtvorlageId);
      const { beginn, ende } = createSchichtZeitstempelAusVorlage(
        value.datum,
        vorlagenMomentaufnahme,
        this.daten.zeitzone,
      );
      const aktualisierung = {
        mitarbeiterId: mitarbeiter.id,
        mitarbeiterAnzeigename: getMitarbeiterName(mitarbeiter),
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

  // ===== Interne Helfer =======================
  private getVorlagenMomentaufnahme(schichtvorlageId: string): {
    bezeichnung: string;
    beginnLokalzeit: string;
    endeLokalzeit: string;
    endetAmFolgetag: boolean;
  } {
    const schicht = this.daten.schicht;
    if (schicht?.schichtvorlageId === schichtvorlageId) {
      return {
        bezeichnung: schicht.schichtvorlageBezeichnung,
        beginnLokalzeit: formatSchichtUhrzeit(schicht.beginn, this.daten.zeitzone),
        endeLokalzeit: formatSchichtUhrzeit(schicht.ende, this.daten.zeitzone),
        endetAmFolgetag:
          formatSchichtDatum(schicht.beginn, this.daten.zeitzone) !==
          formatSchichtDatum(schicht.ende, this.daten.zeitzone),
      };
    }

    const vorlage = this.daten.schichtvorlagen.find((eintrag) => {
      return eintrag.id === schichtvorlageId && eintrag.aktiv;
    });
    if (!vorlage) throw new Error('Die ausgewählte Schichtvorlage ist nicht mehr aktiv.');
    return vorlage;
  }
}

function getMitarbeiterName(mitarbeiter: IMitarbeiterEintrag): string {
  return `${mitarbeiter.person.nachname}, ${mitarbeiter.person.vorname}`.trim();
}
