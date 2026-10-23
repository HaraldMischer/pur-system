// pur-system/src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { IDienstplanRasterzeit } from '../../../commons/models/domain/dienstplan-kalendertag';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import { IModellschichtMomentaufnahmeEintrag } from '../../../commons/models/domain/schichtmodell';
import { createMitarbeiterbelegungReferenzSchluessel } from '../../../commons/utils/dienstplan/mitarbeiterbelegung';
import { createSchichtZeitstempelAusLokalzeiten } from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterbelegungStore } from '../../../stores/domain/mitarbeiterbelegung.store';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';

export type TSchichtBearbeitenDialogDaten = {
  readonly pfad: IDienstplanVersionPfad;
  readonly zeitzone: string;
  readonly datum: string;
  readonly mitarbeiter: readonly IMitarbeiterEintrag[];
  readonly modellschicht: IModellschichtMomentaufnahmeEintrag;
  readonly rasterzeit: IDienstplanRasterzeit;
  readonly verschiebeziele: readonly TSchichtVerschiebeziel[];
  readonly schicht?: ISchichtEintrag;
};

export type TSchichtVerschiebeziel = {
  readonly datum: string;
  readonly modellschicht: IModellschichtMomentaufnahmeEintrag;
  readonly rasterzeit: IDienstplanRasterzeit;
  readonly schichtIds: readonly string[];
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
    EingabeZeit,
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
  readonly mitarbeiterbelegungStore = inject(MitarbeiterbelegungStore);

  // ===== Interner State =======================

  private readonly urspruenglicherFormwert: string;
  private readonly selectedMitarbeiterId = signal(this.daten.schicht?.mitarbeiterId ?? '');
  private readonly selectedDatum = signal(this.daten.datum);
  private readonly selectedModellschichtId = signal(this.daten.modellschicht.id);

  // ===== Öffentliche Werte ====================

  readonly verschiebemodus = signal(false);
  readonly beginnLokalzeitControl = new FormControl(this.daten.rasterzeit.beginnLokalzeit, {
    nonNullable: true,
  });
  readonly endeLokalzeitControl = new FormControl(this.daten.rasterzeit.endeLokalzeit, {
    nonNullable: true,
  });
  readonly schichtForm = new FormGroup({
    mitarbeiterId: new FormControl(this.daten.schicht?.mitarbeiterId ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
        auswahlValidator(this.daten.mitarbeiter.map((eintrag) => eintrag.id)),
      ],
    }),
    datum: new FormControl(this.daten.datum, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    modellschichtId: new FormControl(this.daten.modellschicht.id, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  readonly istBearbeitung = Boolean(this.daten.schicht);
  readonly error = signal<string | null>(null);
  readonly hatAenderungen = signal(!this.istBearbeitung);

  // ===== Öffentliche Ableitungen ==============

  readonly verschiebedaten = computed(() => {
    const daten = new Map<string, string>();
    this.daten.verschiebeziele.forEach((ziel) => {
      daten.set(ziel.datum, formatIsoDatum(ziel.datum));
    });
    return [...daten].map(([datum, bezeichnung]) => ({ datum, bezeichnung }));
  });
  readonly modellschichtenAmTag = computed(() => {
    const datum = this.selectedDatum();
    return this.daten.verschiebeziele.filter((ziel) => ziel.datum === datum);
  });
  readonly ausgewaehltesZiel = computed(() => {
    const datum = this.selectedDatum();
    const modellschichtId = this.selectedModellschichtId();
    return (
      this.daten.verschiebeziele.find((ziel) => {
        return ziel.datum === datum && ziel.modellschicht.id === modellschichtId;
      }) ?? null
    );
  });
  readonly datumAnzeige = computed(() => formatIsoDatum(this.selectedDatum()));
  readonly modellschichtBezeichnung = computed(() => {
    return this.ausgewaehltesZiel()?.modellschicht.bezeichnung ?? '';
  });
  readonly zielIstBelegt = computed(() => {
    const ziel = this.ausgewaehltesZiel();
    if (!ziel || ziel.modellschicht.mehrfachbelegungErlaubt) return false;
    return ziel.schichtIds.some((id) => id !== this.daten.schicht?.id);
  });
  readonly hatZeitkonflikt = computed(() => {
    const mitarbeiterId = this.selectedMitarbeiterId();
    const ziel = this.ausgewaehltesZiel();
    if (!mitarbeiterId || !ziel) return false;
    let schichtZeitdaten;
    try {
      schichtZeitdaten = createSchichtZeitstempelAusLokalzeiten(
        ziel.datum,
        ziel.rasterzeit,
        this.daten.zeitzone,
      );
    } catch {
      return false;
    }
    const ausgenommenerSchichtSchluessel = this.daten.schicht
      ? createMitarbeiterbelegungReferenzSchluessel({
          ...this.daten.pfad,
          schichtId: this.daten.schicht.id,
        })
      : undefined;
    return this.mitarbeiterbelegungStore.hatMitarbeiterZeitkonflikt(
      mitarbeiterId,
      schichtZeitdaten,
      ausgenommenerSchichtSchluessel,
    );
  });

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
      this.selectedMitarbeiterId.set(this.schichtForm.controls.mitarbeiterId.value);
      this.selectedDatum.set(this.schichtForm.controls.datum.value);
      this.selectedModellschichtId.set(this.schichtForm.controls.modellschichtId.value);
      const ziel = this.ausgewaehltesZiel();
      if (ziel) {
        this.beginnLokalzeitControl.setValue(ziel.rasterzeit.beginnLokalzeit);
        this.endeLokalzeitControl.setValue(ziel.rasterzeit.endeLokalzeit);
      }
      this.hatAenderungen.set(
        JSON.stringify(this.schichtForm.getRawValue()) !== this.urspruenglicherFormwert,
      );
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Blendet die Auswahl eines anderen Rasterziels ein oder setzt sie zurück.
   */
  toggleVerschiebemodus(): void {
    const aktiv = !this.verschiebemodus();
    this.verschiebemodus.set(aktiv);
    if (aktiv) return;
    this.schichtForm.patchValue({
      datum: this.daten.datum,
      modellschichtId: this.daten.modellschicht.id,
    });
  }

  /**
   * Übernimmt den ersten verfügbaren Modellschichtwert des gewählten Tages.
   */
  handleDatumChange(): void {
    const erstesZiel = this.daten.verschiebeziele.find((ziel) => {
      return ziel.datum === this.schichtForm.controls.datum.value;
    });
    if (erstesZiel) {
      this.schichtForm.controls.modellschichtId.setValue(erstesZiel.modellschicht.id);
    }
  }

  /**
   * Speichert die Mitarbeiterzuordnung und gegebenenfalls das ausgewählte Rasterziel.
   */
  async saveSchicht(): Promise<void> {
    if (
      this.schichtForm.invalid ||
      this.dienstplanStore.inProgress() ||
      this.hatZeitkonflikt() ||
      this.zielIstBelegt() ||
      !this.ausgewaehltesZiel()
    ) {
      this.schichtForm.markAllAsTouched();
      return;
    }
    if (this.istBearbeitung && !this.hatAenderungen()) return;
    const mitarbeiterId = this.schichtForm.controls.mitarbeiterId.value;
    if (!this.daten.mitarbeiter.some((eintrag) => eintrag.id === mitarbeiterId)) return;
    try {
      const aktualisierung = {
        datum: this.schichtForm.controls.datum.value,
        mitarbeiterId,
        modellschichtId: this.schichtForm.controls.modellschichtId.value,
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
