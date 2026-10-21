// pur-system/src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
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

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeinstellungSondertagEintrag } from '../../../commons/models/domain/filialeinstellung';
import {
  IBesondereRasterzeit,
  IModellschichtSchreibdaten,
  ISchichtrastermodellAktualisierung,
  ISchichtrastermodellAnlage,
  ISchichtrastermodellBestand,
} from '../../../commons/models/domain/schichtmodell';
import { compareModellschichtenNachBeginn } from '../../../commons/utils/dienstplan/modellschicht-sortierung';
import { calculateSchichtdauerMinuten } from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { nichtLeerValidator } from '../../../commons/validators/nicht-leer.validator';
import { schichtZeitfolgeValidator } from '../../../commons/validators/schicht-zeitfolge.validator';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { LokalzeitEingabe } from '../../shared/lokalzeit-eingabe/lokalzeit-eingabe';
import {
  IRasterzeitAbweichung,
  IRasterzeitAbweichungTag,
  RasterzeitAbweichungen,
} from '../rasterzeit-abweichungen/rasterzeit-abweichungen';

// ===== Top-Level Helper =====================

export type TSchichtmodellBearbeitenDialogDaten = {
  readonly pfad: IFilialPfad;
  readonly sondertage?: readonly IFilialeinstellungSondertagEintrag[];
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
    LokalzeitEingabe,
    RasterzeitAbweichungen,
    ReactiveFormsModule,
  ],
  templateUrl: './schichtmodell-bearbeiten-dialog.html',
  styleUrl: './schichtmodell-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtmodellBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(MatDialogRef<SchichtmodellBearbeitenDialog, boolean>);
  readonly daten = inject<TSchichtmodellBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  readonly schichtmodellStore = inject(SchichtmodellStore);

  // ===== Interner State =======================

  private readonly urspruenglicheAktualisierung: string | null;

  // ===== Öffentliche Werte ====================

  readonly istBearbeitung = Boolean(this.daten.bestand);
  readonly hatAenderungen = signal(!this.istBearbeitung);
  readonly rasterzeitAbweichungenGueltig = signal(true);
  readonly besondereRasterzeiten = signal<readonly IBesondereRasterzeit[]>(
    this.daten.bestand?.schichtmodell.besondereRasterzeiten ?? [],
  );
  readonly besondereTage: readonly IRasterzeitAbweichungTag[] =
    this.daten.sondertage?.flatMap((sondertag) => {
      return sondertag.oeffnungsregel.geoeffnet
        ? [
            {
              id: sondertag.id,
              bezeichnung: sondertag.bezeichnung,
              oeffnungsregel: sondertag.oeffnungsregel,
            },
          ]
        : [];
    }) ?? [];
  readonly initialeRasterzeitAbweichungen: readonly IRasterzeitAbweichung[] =
    this.daten.bestand?.schichtmodell.besondereRasterzeiten.map((rasterzeit) => {
      return { ...rasterzeit, tagId: rasterzeit.sondertagId };
    }) ?? [];
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
   * Fügt am Anfang des Modells eine leere Modellschicht hinzu.
   */
  addModellschicht(): void {
    const modellschichten = this.schichtmodellForm.controls.modellschichten;
    const bisherigeVorbereitungsminuten =
      modellschichten.at(0)?.controls.vorbereitungsminuten.value ?? 0;
    modellschichten.at(0)?.controls.vorbereitungsminuten.setValue(0);
    const neueModellschicht = this.createModellschichtForm();
    neueModellschicht.controls.vorbereitungsminuten.setValue(bisherigeVorbereitungsminuten);
    modellschichten.insert(0, neueModellschicht);
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
    if (
      this.schichtmodellForm.invalid ||
      !this.rasterzeitAbweichungenGueltig() ||
      this.schichtmodellStore.inProgress()
    ) {
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

  /**
   * Übernimmt die optionalen inneren Rasterzeitabweichungen aktiver Sondertage.
   */
  updateBesondereRasterzeiten(abweichungen: readonly IRasterzeitAbweichung[]): void {
    const sichtbareSondertagIds = new Set(this.besondereTage.map((tag) => tag.id));
    this.besondereRasterzeiten.set([
      ...this.besondereRasterzeiten().filter((rasterzeit) => {
        return !sichtbareSondertagIds.has(rasterzeit.sondertagId);
      }),
      ...abweichungen.map((abweichung) => {
        return {
          sondertagId: abweichung.tagId,
          modellschichtId: abweichung.modellschichtId,
          beginnLokalzeit: abweichung.beginnLokalzeit,
          endeLokalzeit: abweichung.endeLokalzeit,
          endetAmFolgetag: abweichung.endetAmFolgetag,
        };
      }),
    ]);
    this.updateHatAenderungen();
  }

  // ===== Interne Helfer =======================

  private createModellschichtForm(modellschicht?: IModellschichtSchreibdaten) {
    return new FormGroup(
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
        mehrfachbelegungErlaubt: new FormControl(modellschicht?.mehrfachbelegungErlaubt ?? false, {
          nonNullable: true,
        }),
        vorbereitungsminuten: new FormControl(modellschicht?.vorbereitungsminuten ?? 0, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
        }),
        nachbereitungsminuten: new FormControl(modellschicht?.nachbereitungsminuten ?? 0, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
        }),
      },
      { validators: [schichtZeitfolgeValidator] },
    );
  }

  private getModellschichten(): IModellschichtSchreibdaten[] {
    const formen = this.schichtmodellForm.controls.modellschichten.controls;
    const vorbereitungsminuten = formen.at(0)?.controls.vorbereitungsminuten.value ?? 0;
    const nachbereitungsminuten = formen.at(-1)?.controls.nachbereitungsminuten.value ?? 0;
    const modellschichten = formen
      .map((form) => {
        const wert = form.getRawValue();
        return {
          ...(wert.id ? { id: wert.id } : {}),
          bezeichnung: wert.bezeichnung.trim(),
          beginnLokalzeit: wert.beginnLokalzeit,
          endeLokalzeit: wert.endeLokalzeit,
          endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
          mehrfachbelegungErlaubt: wert.mehrfachbelegungErlaubt,
          vorbereitungsminuten: 0,
          nachbereitungsminuten: 0,
        };
      })
      .sort(compareModellschichtenNachBeginn);
    const ersteModellschicht = modellschichten.at(0);
    const letzteModellschicht = modellschichten.at(-1);
    if (ersteModellschicht) ersteModellschicht.vorbereitungsminuten = vorbereitungsminuten;
    if (letzteModellschicht) letzteModellschicht.nachbereitungsminuten = nachbereitungsminuten;
    return modellschichten;
  }

  private getAnlage(): ISchichtrastermodellAnlage {
    const modellschichten = this.getModellschichten();
    const modellschichtIds = new Set(
      modellschichten.flatMap((modellschicht) => (modellschicht.id ? [modellschicht.id] : [])),
    );
    return {
      bezeichnung: this.schichtmodellForm.controls.bezeichnung.value.trim(),
      modellschichten,
      besondereRasterzeiten: this.besondereRasterzeiten().filter((rasterzeit) => {
        return modellschichtIds.has(rasterzeit.modellschichtId);
      }),
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
