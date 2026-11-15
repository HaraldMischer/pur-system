// pur-system/src/app/components/schichtplan/schichtmodell-formular/schichtmodell-formular.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { MAX_RANDMINUTEN } from '../../../commons/constants/schicht.constants';
import type { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import type {
  ISchichtmodellAktualisierung,
  ISchichtmodellAnlage,
  ISchichtmodellBestand,
  ITagesvorlagenschichtEintrag,
  ITagesvorlagenschichtSchreibdaten,
  TSchichtZeitgrenzeTag,
  TTagesvorlageTyp,
} from '../../../commons/models/domain/schichtmodell';
import { getNaechsteSchichtbezeichnung } from '../../../commons/utils/dienstplan/schicht-bezeichnung';
import {
  getGleichmaessigeLokalzeitGrenzen,
  getSchichtTagFuerLokalzeit,
} from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import type { ISchichtmodellVorlage } from '../../../commons/utils/dienstplan/schichtmodell-vorlagen';
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
  mehrfachbelegungErlaubt: FormControl<boolean>;
}>;

type TVorlageForm = FormGroup<{
  vorlage: FormControl<TTagesvorlageTyp>;
  schichten: FormArray<TSchichtForm>;
}>;

@Component({
  selector: 'app-schichtmodell-formular',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    EingabeMinuten,
    EingabeZeit,
  ],
  templateUrl: './schichtmodell-formular.html',
  styleUrl: './schichtmodell-formular.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtmodellFormular implements OnInit {
  // ===== Interne Dependency Injection =========

  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(SchichtmodellStore);

  // ===== Öffentliche API ======================

  readonly pfad = input.required<IFilialPfad>();
  readonly vorlagen = input.required<readonly ISchichtmodellVorlage[]>();
  readonly bestand = input<ISchichtmodellBestand>();
  readonly gespeichert = output<ISchichtmodellBestand>();
  readonly abgebrochen = output<void>();

  // ===== Interner State =======================

  private urspruenglicherDatenwert = '';

  // ===== Öffentliche Werte ====================

  form!: FormGroup<{
    bezeichnung: FormControl<string>;
    aktiv: FormControl<boolean>;
    vorbereitungsminuten: FormControl<number>;
    nachbereitungsminuten: FormControl<number>;
    vorlagen: FormArray<TVorlageForm>;
  }>;
  readonly hatAenderungen = signal(false);

  constructor() {
    effect(() => {
      const inProgress = this.store.inProgress();
      untracked(() => {
        if (!this.form) return;
        if (inProgress) this.form.disable({ emitEvent: false });
        else {
          this.form.enable({ emitEvent: false });
          if (!this.istBearbeitung) this.form.controls.aktiv.disable({ emitEvent: false });
        }
      });
    });
  }

  // ===== Öffentliche Ableitungen ==============

  get istBearbeitung(): boolean {
    return Boolean(this.bestand());
  }

  // ===== Lifecycle Hooks ======================

  ngOnInit(): void {
    this.form = this.createForm();
    this.urspruenglicherDatenwert = JSON.stringify(this.getSchreibwert());
    this.hatAenderungen.set(!this.istBearbeitung);
    this.updateHatAenderungen();
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateHatAenderungen();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Fügt der ausgewählten Tagesvorlage eine frei konfigurierbare Schicht hinzu.
   *
   * Alle inneren Grenzen werden anschließend gleichmäßig auf dem 15-Minuten-Raster neu verteilt.
   */
  addSchicht(vorlage: TTagesvorlageTyp): void {
    const schichten = this.getVorlageForm(vorlage);
    const neueSchicht = this.createSchichtForm(
      vorlage,
      undefined,
      false,
      true,
      getNaechsteSchichtbezeichnung(
        schichten.controls.map((schicht) => {
          return schicht.controls.bezeichnung.value;
        }),
      ),
    );
    schichten.push(neueSchicht);
    this.verteileSchichtenGleichmaessig(vorlage);
  }

  /**
   * Liefert die typisierte Schichtliste der ausgewählten Tagesvorlage.
   *
   * @param vorlage - Eindeutige Referenz der Modellvorlage.
   */
  getVorlageForm(vorlage: TTagesvorlageTyp): FormArray<TSchichtForm> {
    const vorlageForm = this.form.controls.vorlagen.controls.find((eintrag) => {
      return eintrag.controls.vorlage.value === vorlage;
    });
    if (!vorlageForm) throw new Error(`Die Tagesvorlage „${vorlage}“ wurde nicht gefunden.`);
    return vorlageForm.controls.schichten;
  }

  /**
   * Entfernt eine Schicht aus der ausgewählten Tagesvorlage.
   */
  removeSchicht(vorlage: TTagesvorlageTyp, index: number): void {
    const schichten = this.getVorlageForm(vorlage);
    if (schichten.length <= 1) return;
    schichten.removeAt(index);
    const oeffnung = this.getVorlage(vorlage).oeffnung;
    schichten.at(0).controls.beginnLokalzeit.setValue(oeffnung.beginnLokalzeit);
    schichten.at(-1).controls.endeLokalzeit.setValue(oeffnung.endeLokalzeit);
  }

  /**
   * Speichert alle aktuell erforderlichen Vorlagen des Schichtmodells.
   */
  async save(): Promise<void> {
    if (this.form.invalid || this.store.inProgress() || !this.hatAenderungen()) return;
    try {
      const bestand = this.bestand();
      const gespeichert = bestand
        ? await this.store.updateSchichtmodell(
            this.pfad(),
            bestand.schichtmodell.id,
            this.getAktualisierung(),
            this.vorlagen(),
          )
        : await this.store.createSchichtmodell(this.pfad(), this.getAnlage(), this.vorlagen());
      this.urspruenglicherDatenwert = JSON.stringify(this.getSchreibwert());
      this.hatAenderungen.set(false);
      this.gespeichert.emit(gespeichert);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    }
  }

  /**
   * Bricht die aktuelle Modellbearbeitung oder Neuanlage ab.
   */
  cancel(): void {
    if (this.store.inProgress()) return;
    this.abgebrochen.emit();
  }

  // ===== Interne Helfer =======================

  private createForm(): SchichtmodellFormular['form'] {
    const bestand = this.bestand();
    return new FormGroup({
      bezeichnung: new FormControl(bestand?.schichtmodell.bezeichnung ?? '', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator, Validators.maxLength(80)],
      }),
      aktiv: new FormControl(
        { value: bestand?.schichtmodell.aktiv ?? true, disabled: !bestand },
        { nonNullable: true },
      ),
      vorbereitungsminuten: new FormControl(bestand?.schichtmodell.vorbereitungsminuten ?? 0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0), Validators.max(MAX_RANDMINUTEN)],
      }),
      nachbereitungsminuten: new FormControl(bestand?.schichtmodell.nachbereitungsminuten ?? 0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0), Validators.max(MAX_RANDMINUTEN)],
      }),
      vorlagen: new FormArray<TVorlageForm>(
        this.vorlagen().map((vorlage) => {
          return this.createVorlageForm(vorlage);
        }),
      ),
    });
  }

  private createVorlageForm(definition: ISchichtmodellVorlage): TVorlageForm {
    return new FormGroup({
      vorlage: new FormControl<TTagesvorlageTyp>(definition.vorlage, { nonNullable: true }),
      schichten: new FormArray<TSchichtForm>(this.createVorlage(definition)),
    });
  }

  private createVorlage(definition: ISchichtmodellVorlage): TSchichtForm[] {
    const vorlage = definition.vorlage;
    const schichten = this.bestand()?.tagesvorlagenschichten.filter((schicht) => {
      return schicht.vorlage === vorlage;
    });
    const schichtdaten = schichten?.length ? schichten : [undefined];
    return schichtdaten.map((schicht, index) => {
      return this.createSchichtForm(
        vorlage,
        schicht,
        index === 0,
        index === schichtdaten.length - 1,
        `Schicht ${index + 1}`,
      );
    });
  }

  private verteileSchichtenGleichmaessig(vorlage: TTagesvorlageTyp): void {
    const schichten = this.getVorlageForm(vorlage);
    const oeffnung = this.getVorlage(vorlage).oeffnung;
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
    vorlage: TTagesvorlageTyp,
    schicht?: ITagesvorlagenschichtEintrag,
    istErsteSchicht = false,
    istLetzteSchicht = false,
    standardbezeichnung = '',
  ): TSchichtForm {
    const oeffnung = this.getVorlage(vorlage).oeffnung;
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
      bezeichnung: new FormControl(schicht?.bezeichnung ?? standardbezeichnung, {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator, Validators.maxLength(80)],
      }),
      beginnLokalzeit: new FormControl(beginnLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      beginnTag: new FormControl<TSchichtZeitgrenzeTag>(beginnTag, { nonNullable: true }),
      endeLokalzeit: new FormControl(endeLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeTag: new FormControl<TSchichtZeitgrenzeTag>(endeTag, { nonNullable: true }),
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

  private getAnlage(): ISchichtmodellAnlage {
    return {
      bezeichnung: this.form.controls.bezeichnung.value.trim(),
      vorbereitungsminuten: this.form.controls.vorbereitungsminuten.value,
      nachbereitungsminuten: this.form.controls.nachbereitungsminuten.value,
      tagesvorlagenschichten: this.vorlagen().flatMap((vorlage) => {
        return this.mapVorlage(vorlage.vorlage);
      }),
    };
  }

  private getAktualisierung(): ISchichtmodellAktualisierung {
    return {
      ...this.getAnlage(),
      aktiv: this.form.controls.aktiv.value,
    };
  }

  private getSchreibwert(): ISchichtmodellAnlage | ISchichtmodellAktualisierung {
    return this.istBearbeitung ? this.getAktualisierung() : this.getAnlage();
  }

  private mapVorlage(vorlage: TTagesvorlageTyp): ITagesvorlagenschichtSchreibdaten[] {
    const schichten = this.getVorlageForm(vorlage).controls;
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
        mehrfachbelegungErlaubt: wert.mehrfachbelegungErlaubt,
      };
    });
  }

  private updateHatAenderungen(): void {
    if (!this.istBearbeitung) return;
    this.hatAenderungen.set(
      this.hatAbweichendenVorlagenbestand() ||
        JSON.stringify(this.getAktualisierung()) !== this.urspruenglicherDatenwert,
    );
  }

  private hatAbweichendenVorlagenbestand(): boolean {
    const erforderlicheVorlagen = new Set(this.vorlagen().map((vorlage) => vorlage.vorlage));
    const vorhandeneVorlagen = new Set(
      this.bestand()?.tagesvorlagenschichten.map((schicht) => schicht.vorlage) ?? [],
    );
    return (
      [...erforderlicheVorlagen].some((vorlage) => !vorhandeneVorlagen.has(vorlage)) ||
      [...vorhandeneVorlagen].some((vorlage) => !erforderlicheVorlagen.has(vorlage))
    );
  }

  private getVorlage(vorlage: TTagesvorlageTyp): ISchichtmodellVorlage {
    const definition = this.vorlagen().find((eintrag) => {
      return eintrag.vorlage === vorlage;
    });
    if (!definition) throw new Error(`Die Tagesvorlage „${vorlage}“ wurde nicht gefunden.`);
    return definition;
  }
}
