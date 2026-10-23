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
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { filter, firstValueFrom, take } from 'rxjs';

import { MAX_RANDMINUTEN } from '../../../commons/constants/schichtmodell.constants';
import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { ISchliesszeitraum } from '../../../commons/models/domain/filialeinstellung';
import {
  IModellschichtSchreibdaten,
  ISchichtrastermodellAktualisierung,
  ISchichtrastermodellAnlage,
  ISchichtrastermodellBestand,
  TModellschichtTag,
} from '../../../commons/models/domain/schichtmodell';
import {
  getLokalzeitMinuten,
  getModellschichtTagFuerLokalzeit,
} from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { nichtLeerValidator } from '../../../commons/validators/nicht-leer.validator';
import { hatModellschichtLuecken } from '../../../commons/validators/schichtmodell.validator';
import { schichtZeitfolgeValidator } from '../../../commons/validators/schicht-zeitfolge.validator';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { BestaetigungDialog } from '../../shared/bestaetigung-dialog/bestaetigung-dialog';
import { EingabeMinuten } from '../../shared/eingabe-minuten/eingabe-minuten';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';

// ===== Top-Level Helper =====================

export type TSchichtmodellBearbeitenDialogDaten = {
  readonly pfad: IFilialPfad;
  readonly schliesszeitraum: ISchliesszeitraum;
  readonly bestand?: ISchichtrastermodellBestand;
};

@Component({
  selector: 'app-schichtmodell-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    EingabeMinuten,
    EingabeZeit,
    ReactiveFormsModule,
  ],
  templateUrl: './schichtmodell-bearbeiten-dialog.html',
  styleUrl: './schichtmodell-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtmodellBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<SchichtmodellBearbeitenDialog, boolean>);
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
    this.updateModellschichtPositionen();
    this.urspruenglicheAktualisierung = this.daten.bestand
      ? JSON.stringify(this.getAktualisierung())
      : null;
    this.schichtmodellForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updateHatAenderungen();
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
   *
   * Der erstmals eingegebene Beginn belegt einmalig das Ende der bisherigen letzten Schicht vor.
   */
  addModellschicht(): void {
    const modellschichten = this.schichtmodellForm.controls.modellschichten;
    const bisherigeLetzteModellschicht = modellschichten.at(-1);
    const bisherigeNachbereitungsminuten =
      bisherigeLetzteModellschicht?.controls.nachbereitungsminuten.value ?? 0;
    bisherigeLetzteModellschicht?.controls.nachbereitungsminuten.setValue(0);
    const neueModellschicht = this.createModellschichtForm();
    neueModellschicht.controls.nachbereitungsminuten.setValue(bisherigeNachbereitungsminuten);
    modellschichten.push(neueModellschicht);
    this.updateModellschichtPositionen();
    neueModellschicht.controls.beginnLokalzeit.valueChanges
      .pipe(
        filter((lokalzeit) => getLokalzeitMinuten(lokalzeit) !== null),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lokalzeit) => {
        bisherigeLetzteModellschicht?.controls.endeLokalzeit.setValue(lokalzeit);
      });
  }

  /**
   * Entfernt eine Modellschicht, sofern mindestens eine erhalten bleibt.
   *
   * @param index - Position der zu entfernenden Modellschicht.
   */
  removeModellschicht(index: number): void {
    const modellschichten = this.schichtmodellForm.controls.modellschichten;
    if (modellschichten.length <= 1) return;
    if (index === 0) {
      modellschichten
        .at(1)
        .controls.vorbereitungsminuten.setValue(
          modellschichten.at(0).controls.vorbereitungsminuten.value,
        );
    }
    if (index === modellschichten.length - 1) {
      modellschichten
        .at(index - 1)
        .controls.nachbereitungsminuten.setValue(
          modellschichten.at(index).controls.nachbereitungsminuten.value,
        );
    }
    modellschichten.removeAt(index);
    this.updateModellschichtPositionen();
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
    const anlage = this.getAnlage();
    if (hatModellschichtLuecken(anlage.modellschichten)) {
      const bestaetigt = await firstValueFrom(
        this.dialog
          .open(BestaetigungDialog, {
            data: {
              titel: 'Schichtmodell mit Lücken speichern?',
              nachricht:
                'Zwischen den Modellschichten bestehen zeitliche Lücken. In diesen Zeiten ist im Dienstplan keine Rasterbelegung vorgesehen.',
              bestaetigenText: 'Trotzdem speichern',
            },
            panelClass: ['pur-dialog__panel'],
          })
          .afterClosed(),
      );
      if (!bestaetigt) return;
    }
    this.dialogRef.disableClose = true;
    try {
      const bestand = this.daten.bestand;
      if (bestand) {
        await this.schichtmodellStore.updateSchichtmodell(
          this.daten.pfad,
          bestand.schichtmodell.id,
          {
            ...anlage,
            aktiv: this.schichtmodellForm.controls.aktiv.getRawValue(),
          },
        );
      } else {
        await this.schichtmodellStore.createSchichtmodell(this.daten.pfad, anlage);
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
    const beginnTag = modellschicht?.beginn
      ? (getModellschichtTagFuerLokalzeit(
          modellschicht.beginn.lokalzeit,
          this.daten.schliesszeitraum,
        ) ?? modellschicht.beginn.tag)
      : 'starttag';
    const endeTag = modellschicht?.ende
      ? (getModellschichtTagFuerLokalzeit(
          modellschicht.ende.lokalzeit,
          this.daten.schliesszeitraum,
        ) ?? modellschicht.ende.tag)
      : 'starttag';
    const form = new FormGroup({
      id: new FormControl(modellschicht?.id ?? '', { nonNullable: true }),
      bezeichnung: new FormControl(modellschicht?.bezeichnung ?? '', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator, Validators.maxLength(80)],
      }),
      beginnLokalzeit: new FormControl(modellschicht?.beginn?.lokalzeit ?? '', {
        nonNullable: true,
      }),
      beginnTag: new FormControl<TModellschichtTag>(beginnTag, {
        nonNullable: true,
      }),
      endeLokalzeit: new FormControl(modellschicht?.ende?.lokalzeit ?? '', {
        nonNullable: true,
      }),
      endeTag: new FormControl<TModellschichtTag>(endeTag, {
        nonNullable: true,
      }),
      mehrfachbelegungErlaubt: new FormControl(modellschicht?.mehrfachbelegungErlaubt ?? false, {
        nonNullable: true,
      }),
      vorbereitungsminuten: new FormControl(modellschicht?.vorbereitungsminuten ?? 0, {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.min(0),
          Validators.max(MAX_RANDMINUTEN),
          Validators.pattern(/^\d+$/),
        ],
      }),
      nachbereitungsminuten: new FormControl(modellschicht?.nachbereitungsminuten ?? 0, {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.min(0),
          Validators.max(MAX_RANDMINUTEN),
          Validators.pattern(/^\d+$/),
        ],
      }),
    });
    form.controls.beginnLokalzeit.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lokalzeit) => {
        const tag = getModellschichtTagFuerLokalzeit(lokalzeit, this.daten.schliesszeitraum);
        if (tag) form.controls.beginnTag.setValue(tag);
      });
    form.controls.endeLokalzeit.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lokalzeit) => {
        const tag = getModellschichtTagFuerLokalzeit(lokalzeit, this.daten.schliesszeitraum);
        if (tag) form.controls.endeTag.setValue(tag);
      });
    return form;
  }

  private updateModellschichtPositionen(): void {
    const formen = this.schichtmodellForm.controls.modellschichten.controls;
    const letzterIndex = formen.length - 1;
    formen.forEach((form, index) => {
      form.controls.beginnLokalzeit.setValidators(index > 0 ? [Validators.required] : null);
      form.controls.endeLokalzeit.setValidators(
        index < letzterIndex ? [Validators.required] : null,
      );
      form.setValidators(index > 0 && index < letzterIndex ? [schichtZeitfolgeValidator] : null);
      form.controls.beginnLokalzeit.updateValueAndValidity({ emitEvent: false });
      form.controls.endeLokalzeit.updateValueAndValidity({ emitEvent: false });
      form.updateValueAndValidity({ emitEvent: false });
    });
  }

  private getModellschichten(): IModellschichtSchreibdaten[] {
    const formen = this.schichtmodellForm.controls.modellschichten.controls;
    const vorbereitungsminuten = formen.at(0)?.controls.vorbereitungsminuten.value ?? 0;
    const nachbereitungsminuten = formen.at(-1)?.controls.nachbereitungsminuten.value ?? 0;
    const letzterIndex = formen.length - 1;
    const modellschichten = formen.map((form, index) => {
      const wert = form.getRawValue();
      return {
        ...(wert.id ? { id: wert.id } : {}),
        bezeichnung: wert.bezeichnung.trim(),
        reihenfolge: index,
        ...(index > 0 ? { beginn: { lokalzeit: wert.beginnLokalzeit, tag: wert.beginnTag } } : {}),
        ...(index < letzterIndex
          ? {
              ende: {
                lokalzeit: wert.endeLokalzeit,
                tag: wert.endeTag,
              },
            }
          : {}),
        mehrfachbelegungErlaubt: wert.mehrfachbelegungErlaubt,
        vorbereitungsminuten: 0,
        nachbereitungsminuten: 0,
      };
    });
    const ersteModellschicht = modellschichten.at(0);
    const letzteModellschicht = modellschichten.at(-1);
    if (ersteModellschicht) ersteModellschicht.vorbereitungsminuten = vorbereitungsminuten;
    if (letzteModellschicht) letzteModellschicht.nachbereitungsminuten = nachbereitungsminuten;
    return modellschichten;
  }

  private getAnlage(): ISchichtrastermodellAnlage {
    return {
      bezeichnung: this.schichtmodellForm.controls.bezeichnung.value.trim(),
      modellschichten: this.getModellschichten(),
    };
  }

  private getAktualisierung(): ISchichtrastermodellAktualisierung {
    return {
      ...this.getAnlage(),
      aktiv: this.schichtmodellForm.controls.aktiv.getRawValue(),
    };
  }

  private updateHatAenderungen(): void {
    this.hatAenderungen.set(
      this.urspruenglicheAktualisierung !== JSON.stringify(this.getAktualisierung()),
    );
  }
}
