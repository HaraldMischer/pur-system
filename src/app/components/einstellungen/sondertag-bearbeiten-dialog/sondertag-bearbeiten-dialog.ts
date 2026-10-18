// pur-system/src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import {
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungSondertagEintrag,
  TOeffnungsregel,
} from '../../../commons/models/domain/filialeinstellung';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';

// ===== Konstanten & Typen ===================

export interface ISondertagBearbeitenDialogDaten {
  readonly pfad: IFilialPfad;
  readonly sondertag?: IFilialeinstellungSondertagEintrag;
  readonly ausnahme?: IFilialeinstellungAusnahmeEintrag;
}

function oeffnungszeitValidator(control: AbstractControl): ValidationErrors | null {
  const geoeffnet = control.get('geoeffnet')?.value;
  const beginn = control.get('beginnLokalzeit')?.value;
  const ende = control.get('endeLokalzeit')?.value;
  return geoeffnet && beginn === ende ? { identischeOeffnungszeiten: true } : null;
}

@Component({
  selector: 'app-sondertag-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './sondertag-bearbeiten-dialog.html',
  styleUrl: './sondertag-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SondertagBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  readonly daten = inject<ISondertagBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SondertagBearbeitenDialog>);
  readonly store = inject(FilialeinstellungStore);

  // ===== Öffentliche Werte ====================

  readonly istSystemtag = this.daten.sondertag?.herkunft === 'system';
  readonly istGesetzlicherFeiertag =
    this.daten.sondertag?.datumsregel.typ === 'gesetzlicherFeiertag';
  readonly istBestehenderEintrag = Boolean(this.daten.sondertag ?? this.daten.ausnahme);
  readonly form = new FormGroup(
    {
      bezeichnung: new FormControl(
        this.daten.sondertag?.bezeichnung ?? this.daten.ausnahme?.bezeichnung ?? '',
        {
          nonNullable: true,
          validators: [Validators.required, Validators.maxLength(80)],
        },
      ),
      jaehrlichWiederkehrend: new FormControl(Boolean(this.daten.sondertag), {
        nonNullable: true,
      }),
      datum: new FormControl(this.daten.ausnahme?.datum ?? '', { nonNullable: true }),
      monat: new FormControl(this.getMonat(), {
        nonNullable: true,
      }),
      tag: new FormControl(this.getTag(), {
        nonNullable: true,
      }),
      aktiv: new FormControl(this.daten.sondertag?.aktiv ?? true, { nonNullable: true }),
      geoeffnet: new FormControl(
        this.daten.sondertag?.oeffnungsregel.geoeffnet ??
          this.daten.ausnahme?.oeffnungsregel.geoeffnet ??
          false,
        { nonNullable: true },
      ),
      beginnLokalzeit: new FormControl(this.getBeginn(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeLokalzeit: new FormControl(this.getEnde(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [oeffnungszeitValidator] },
  );
  readonly hatAenderungen = signal(!this.istBestehenderEintrag);
  readonly inProgress = computed(() => {
    return this.store.getFilialeinstellungKontext(this.daten.pfad)?.inProgress ?? false;
  });

  constructor() {
    this.updateDatumsvalidierung();
    if (this.istBestehenderEintrag) {
      this.form.controls.jaehrlichWiederkehrend.disable({ emitEvent: false });
    }
    if (this.daten.ausnahme) this.form.controls.datum.disable({ emitEvent: false });
    const ursprung = JSON.stringify(this.form.getRawValue());
    this.form.controls.jaehrlichWiederkehrend.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.updateDatumsvalidierung();
      });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hatAenderungen.set(JSON.stringify(this.form.getRawValue()) !== ursprung);
    });
    effect(() => {
      if (this.inProgress()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        if (this.istBestehenderEintrag) {
          this.form.controls.jaehrlichWiederkehrend.disable({ emitEvent: false });
        }
        if (this.daten.ausnahme) this.form.controls.datum.disable({ emitEvent: false });
      }
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Speichert den neuen oder bearbeiteten Sondertag.
   */
  async save(): Promise<void> {
    if (this.form.invalid || this.inProgress() || !this.hatAenderungen()) return;
    const wert = this.form.getRawValue();
    const oeffnungsregel = this.buildOeffnungsregel();
    try {
      if (this.daten.ausnahme) {
        await this.store.updateAusnahme(this.daten.pfad, this.daten.ausnahme.datum, {
          datum: wert.datum,
          bezeichnung: wert.bezeichnung.trim(),
          oeffnungsregel,
        });
      } else if (!this.daten.sondertag && !wert.jaehrlichWiederkehrend) {
        await this.store.createAusnahme(this.daten.pfad, {
          datum: wert.datum,
          bezeichnung: wert.bezeichnung.trim(),
          oeffnungsregel,
        });
      } else if (!this.daten.sondertag) {
        await this.store.createSondertag(this.daten.pfad, {
          bezeichnung: wert.bezeichnung.trim(),
          aktiv: wert.aktiv,
          datumsregel: { typ: 'jaehrlichFestesDatum', monat: wert.monat, tag: wert.tag },
          oeffnungsregel,
        });
      } else if (this.istSystemtag) {
        await this.store.updateSystemSondertag(this.daten.pfad, this.daten.sondertag.id, {
          aktiv: wert.aktiv,
          oeffnungsregel,
        });
      } else {
        await this.store.updateSondertag(this.daten.pfad, this.daten.sondertag.id, {
          bezeichnung: wert.bezeichnung.trim(),
          aktiv: wert.aktiv,
          datumsregel: { typ: 'jaehrlichFestesDatum', monat: wert.monat, tag: wert.tag },
          oeffnungsregel,
        });
      }
      this.dialogRef.close(true);
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  // ===== Interne Helfer =======================

  private getMonat(): number {
    const regel = this.daten.sondertag?.datumsregel;
    return regel?.typ === 'jaehrlichFestesDatum' ? regel.monat : 1;
  }

  private getTag(): number {
    const regel = this.daten.sondertag?.datumsregel;
    return regel?.typ === 'jaehrlichFestesDatum' ? regel.tag : 1;
  }

  private getBeginn(): string {
    const regel = this.daten.sondertag?.oeffnungsregel ?? this.daten.ausnahme?.oeffnungsregel;
    return regel?.geoeffnet ? regel.beginnLokalzeit : '08:00';
  }

  private getEnde(): string {
    const regel = this.daten.sondertag?.oeffnungsregel ?? this.daten.ausnahme?.oeffnungsregel;
    return regel?.geoeffnet ? regel.endeLokalzeit : '18:00';
  }

  private buildOeffnungsregel(): TOeffnungsregel {
    const wert = this.form.getRawValue();
    if (!wert.geoeffnet) return { geoeffnet: false };
    return {
      geoeffnet: true,
      beginnLokalzeit: wert.beginnLokalzeit,
      endeLokalzeit: wert.endeLokalzeit,
      endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
    };
  }

  private updateDatumsvalidierung(): void {
    const jaehrlich = this.form.controls.jaehrlichWiederkehrend.getRawValue();
    this.form.controls.datum.setValidators(jaehrlich ? [] : [Validators.required]);
    this.form.controls.monat.setValidators(
      jaehrlich ? [Validators.required, Validators.min(1), Validators.max(12)] : [],
    );
    this.form.controls.tag.setValidators(
      jaehrlich ? [Validators.required, Validators.min(1), Validators.max(31)] : [],
    );
    this.form.controls.datum.updateValueAndValidity({ emitEvent: false });
    this.form.controls.monat.updateValueAndValidity({ emitEvent: false });
    this.form.controls.tag.updateValueAndValidity({ emitEvent: false });
  }
}
