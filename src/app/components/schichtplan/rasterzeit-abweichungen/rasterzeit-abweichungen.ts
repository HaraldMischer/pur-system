// pur-system/src/app/components/schichtplan/rasterzeit-abweichungen/rasterzeit-abweichungen.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

import type { IGeoeffneteOeffnungsregel } from '../../../commons/models/domain/filialeinstellung';
import type { IModellschichtDaten } from '../../../commons/models/domain/schichtmodell';
import { addLokalzeitMinuten } from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { schichtZeitfolgeValidator } from '../../../commons/validators/schicht-zeitfolge.validator';
import { LokalzeitEingabe } from '../../shared/lokalzeit-eingabe/lokalzeit-eingabe';

export interface IRasterzeitAbweichungTag {
  readonly id: string;
  readonly bezeichnung: string;
  readonly oeffnungsregel: IGeoeffneteOeffnungsregel;
}

export interface IRasterzeitAbweichung {
  readonly tagId: string;
  readonly modellschichtId: string;
  readonly beginnLokalzeit: string;
  readonly endeLokalzeit: string;
  readonly endetAmFolgetag: boolean;
}

type TModellschicht = IModellschichtDaten & { readonly id: string };
type TRasterzeitForm = FormGroup<{
  modellschichtId: FormControl<string>;
  beginnLokalzeit: FormControl<string>;
  endeLokalzeit: FormControl<string>;
}>;
type TTagForm = FormGroup<{
  tagId: FormControl<string>;
  aktiviert: FormControl<boolean>;
  rasterzeiten: FormArray<TRasterzeitForm>;
}>;

@Component({
  selector: 'app-rasterzeit-abweichungen',
  imports: [MatCheckboxModule, ReactiveFormsModule, LokalzeitEingabe],
  templateUrl: './rasterzeit-abweichungen.html',
  styleUrl: './rasterzeit-abweichungen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RasterzeitAbweichungen {
  // ===== Interne Dependency Injection =========

  private readonly destroyRef = inject(DestroyRef);

  // ===== Öffentliche API ======================

  readonly tage = input<readonly IRasterzeitAbweichungTag[]>([]);
  readonly modellschichten = input<readonly TModellschicht[]>([]);
  readonly abweichungen = input<readonly IRasterzeitAbweichung[]>([]);
  readonly deaktiviert = input(false);
  readonly abweichungenChange = output<readonly IRasterzeitAbweichung[]>();
  readonly gueltigChange = output<boolean>();

  // ===== Öffentliche Werte ====================

  readonly form = new FormArray<TTagForm>([]);

  constructor() {
    effect(() => {
      const tage = this.tage();
      const modellschichten = this.modellschichten();
      const abweichungen = this.abweichungen();
      untracked(() => {
        this.rebuildForm(tage, modellschichten, abweichungen);
      });
    });
    effect(() => {
      this.deaktiviert();
      untracked(() => {
        this.updateFormStatus();
      });
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateZeitfelderStatus();
      this.emitWert();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Liefert den Tag zu einem Formularabschnitt.
   */
  getTag(index: number): IRasterzeitAbweichungTag | undefined {
    const tagId = this.form.at(index)?.controls.tagId.value;
    return this.tage().find((tag) => tag.id === tagId);
  }

  /**
   * Liefert die Modellschicht zu einer Rasterzeitzeile.
   */
  getModellschicht(index: number): TModellschicht | undefined {
    return this.modellschichten()[index];
  }

  /**
   * Liefert den automatisch bestimmten äußeren Beginn.
   */
  getAutomatischerBeginn(tagIndex: number): string {
    const tag = this.getTag(tagIndex);
    const modellschicht = this.modellschichten()[0];
    return tag && modellschicht
      ? (addLokalzeitMinuten(
          tag.oeffnungsregel.beginnLokalzeit,
          -(modellschicht.vorbereitungsminuten ?? 0),
        ) ?? 'Nicht abbildbar')
      : '';
  }

  /**
   * Liefert das automatisch bestimmte äußere Ende.
   */
  getAutomatischesEnde(tagIndex: number): string {
    const tag = this.getTag(tagIndex);
    const modellschicht = this.modellschichten().at(-1);
    return tag && modellschicht
      ? (addLokalzeitMinuten(
          tag.oeffnungsregel.endeLokalzeit,
          modellschicht.nachbereitungsminuten ?? 0,
        ) ?? 'Nicht abbildbar')
      : '';
  }

  // ===== Interne Helfer =======================

  private rebuildForm(
    tage: readonly IRasterzeitAbweichungTag[],
    modellschichten: readonly TModellschicht[],
    abweichungen: readonly IRasterzeitAbweichung[],
  ): void {
    this.form.clear({ emitEvent: false });
    for (const tag of tage) {
      const tagAbweichungen = abweichungen.filter((eintrag) => eintrag.tagId === tag.id);
      const tagForm = new FormGroup({
        tagId: new FormControl(tag.id, { nonNullable: true }),
        aktiviert: new FormControl(tagAbweichungen.length > 0, { nonNullable: true }),
        rasterzeiten: new FormArray(
          modellschichten.map((modellschicht) => {
            const abweichung = tagAbweichungen.find((eintrag) => {
              return eintrag.modellschichtId === modellschicht.id;
            });
            return new FormGroup(
              {
                modellschichtId: new FormControl(modellschicht.id, { nonNullable: true }),
                beginnLokalzeit: new FormControl(
                  abweichung?.beginnLokalzeit ?? modellschicht.beginnLokalzeit,
                  { nonNullable: true, validators: [Validators.required] },
                ),
                endeLokalzeit: new FormControl(
                  abweichung?.endeLokalzeit ?? modellschicht.endeLokalzeit,
                  { nonNullable: true, validators: [Validators.required] },
                ),
              },
              { validators: [schichtZeitfolgeValidator] },
            );
          }),
        ),
      });
      this.form.push(tagForm, { emitEvent: false });
    }
    this.updateFormStatus();
    this.gueltigChange.emit(this.form.valid);
  }

  private updateZeitfelderStatus(): void {
    for (const tagForm of this.form.controls) {
      const aktiv = tagForm.controls.aktiviert.value && !this.deaktiviert();
      const rasterzeiten = tagForm.controls.rasterzeiten;
      if (aktiv && rasterzeiten.disabled) rasterzeiten.enable({ emitEvent: false });
      if (!aktiv && rasterzeiten.enabled) rasterzeiten.disable({ emitEvent: false });
    }
  }

  private updateFormStatus(): void {
    if (this.deaktiviert() && this.form.enabled) {
      this.form.disable({ emitEvent: false });
      return;
    }
    if (!this.deaktiviert() && this.form.disabled) {
      this.form.enable({ emitEvent: false });
    }
    this.updateZeitfelderStatus();
  }

  private emitWert(): void {
    const ergebnis = this.form.controls.flatMap((tagForm) => {
      if (!tagForm.controls.aktiviert.getRawValue()) return [];
      const tagId = tagForm.controls.tagId.getRawValue();
      return tagForm.controls.rasterzeiten.controls.map((rasterzeitForm) => {
        const wert = rasterzeitForm.getRawValue();
        return {
          tagId,
          modellschichtId: wert.modellschichtId,
          beginnLokalzeit: wert.beginnLokalzeit,
          endeLokalzeit: wert.endeLokalzeit,
          endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
        };
      });
    });
    this.abweichungenChange.emit(ergebnis);
    this.gueltigChange.emit(this.form.valid);
  }
}
