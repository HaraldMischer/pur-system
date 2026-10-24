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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import {
  IFilialeinstellungSondertagEintrag,
  ISchliesszeitraum,
  TOeffnungsregel,
} from '../../../commons/models/domain/filialeinstellung';
import {
  getGesetzlicherFeiertagDatum,
  getGesetzlicherFeiertagKatalogeintrag,
} from '../../../commons/utils/filialeinstellung/feiertag';
import { getMaximalerOeffnungsrahmen } from '../../../commons/utils/filialeinstellung/schliesszeitraum';
import { createOeffnungsregelZeitraumValidator } from '../../../commons/validators/oeffnungsregel-zeitraum.validator';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { EingabeDatum } from '../../shared/eingabe-datum/eingabe-datum';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';

// ===== Konstanten & Typen ===================

export interface ISondertagBearbeitenDialogDaten {
  readonly pfad: IFilialPfad;
  readonly schliesszeitraum: ISchliesszeitraum;
  readonly sondertag?: IFilialeinstellungSondertagEintrag;
}

@Component({
  selector: 'app-sondertag-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    EingabeDatum,
    EingabeZeit,
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
  readonly istBestehenderEintrag = Boolean(this.daten.sondertag);
  readonly kalenderjahr = new Date().getFullYear();
  readonly istBerechneterFeiertag = this.getIstBerechneterFeiertag();
  readonly datumModus = this.istBerechneterFeiertag ? ('datum' as const) : ('monat-tag' as const);
  readonly dialogTitel = this.istGesetzlicherFeiertag
    ? 'Gesetzlichen Feiertag bearbeiten'
    : this.istBestehenderEintrag
      ? 'Jährlichen Sondertag bearbeiten'
      : 'Jährlichen Sondertag anlegen';
  readonly systemtagHinweis = this.getSystemtagHinweis();
  readonly form = new FormGroup(
    {
      bezeichnung: new FormControl(this.daten.sondertag?.bezeichnung ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      monatTag: new FormControl(this.getDatum(), {
        nonNullable: true,
        validators: this.istSystemtag ? [] : [Validators.required],
      }),
      aktiv: new FormControl(this.daten.sondertag?.aktiv ?? true, { nonNullable: true }),
      geoeffnet: new FormControl(this.daten.sondertag?.oeffnungsregel.geoeffnet ?? false, {
        nonNullable: true,
      }),
      beginnLokalzeit: new FormControl(this.getBeginn(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeLokalzeit: new FormControl(this.getEnde(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [createOeffnungsregelZeitraumValidator(this.daten.schliesszeitraum)] },
  );
  readonly hatAenderungen = signal(!this.istBestehenderEintrag);
  readonly inProgress = computed(() => {
    return this.store.getFilialeinstellungKontext(this.daten.pfad)?.inProgress ?? false;
  });
  readonly fehler = computed(() => {
    return this.store.getFilialeinstellungKontext(this.daten.pfad)?.error ?? null;
  });

  constructor() {
    this.store.clearError(this.daten.pfad);
    this.updateOeffnungszeitenStatus();
    const ursprung = JSON.stringify(this.form.getRawValue());
    this.form.controls.geoeffnet.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updateOeffnungszeitenStatus();
    });
    this.form.controls.aktiv.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updateOeffnungszeitenStatus();
    });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hatAenderungen.set(JSON.stringify(this.form.getRawValue()) !== ursprung);
    });
    effect(() => {
      if (this.inProgress()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        this.updateOeffnungszeitenStatus();
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
    const [monat, tag] = wert.monatTag.split('-').map(Number);
    try {
      if (!this.daten.sondertag) {
        await this.store.createSondertag(this.daten.pfad, {
          bezeichnung: wert.bezeichnung.trim(),
          aktiv: wert.aktiv,
          datumsregel: { typ: 'jaehrlichFestesDatum', monat, tag },
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
          datumsregel: { typ: 'jaehrlichFestesDatum', monat, tag },
          oeffnungsregel,
        });
      }
      this.dialogRef.close(true);
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  // ===== Interne Helfer =======================

  private getSystemtagHinweis(): string {
    const datumsregel = this.daten.sondertag?.datumsregel;
    if (datumsregel?.typ !== 'gesetzlicherFeiertag') return 'Sondertag mit festem Datum.';
    const katalogeintrag = getGesetzlicherFeiertagKatalogeintrag(datumsregel.feiertagSchluessel);
    return katalogeintrag.datumsart === 'berechnet'
      ? 'Gesetzlicher Feiertag mit berechnetem Datum.'
      : 'Gesetzlicher Feiertag mit festem Datum.';
  }

  private getIstBerechneterFeiertag(): boolean {
    const datumsregel = this.daten.sondertag?.datumsregel;
    if (datumsregel?.typ !== 'gesetzlicherFeiertag') return false;
    return (
      getGesetzlicherFeiertagKatalogeintrag(datumsregel.feiertagSchluessel).datumsart ===
      'berechnet'
    );
  }

  private getDatum(): string {
    const regel = this.daten.sondertag?.datumsregel;
    if (regel?.typ === 'jaehrlichFestesDatum') {
      const monat = String(regel.monat).padStart(2, '0');
      const tag = String(regel.tag).padStart(2, '0');
      return `${monat}-${tag}`;
    }
    if (regel?.typ !== 'gesetzlicherFeiertag') return '';
    const datum = getGesetzlicherFeiertagDatum(this.kalenderjahr, regel.feiertagSchluessel);
    if (!datum || this.istBerechneterFeiertag) return datum ?? '';
    return datum.slice(5);
  }

  private getBeginn(): string {
    const regel = this.daten.sondertag?.oeffnungsregel;
    return (
      regel?.beginnLokalzeit ??
      getMaximalerOeffnungsrahmen(this.daten.schliesszeitraum).beginnLokalzeit
    );
  }

  private getEnde(): string {
    const regel = this.daten.sondertag?.oeffnungsregel;
    return (
      regel?.endeLokalzeit ?? getMaximalerOeffnungsrahmen(this.daten.schliesszeitraum).endeLokalzeit
    );
  }

  private buildOeffnungsregel(): TOeffnungsregel {
    const wert = this.form.getRawValue();
    if (!wert.geoeffnet) {
      return {
        geoeffnet: false,
        beginnLokalzeit: wert.beginnLokalzeit,
        endeLokalzeit: wert.endeLokalzeit,
        endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
      };
    }
    return {
      geoeffnet: true,
      beginnLokalzeit: wert.beginnLokalzeit,
      endeLokalzeit: wert.endeLokalzeit,
      endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
    };
  }

  private updateOeffnungszeitenStatus(): void {
    if (this.istSystemtag) {
      this.form.controls.bezeichnung.disable({ emitEvent: false });
    }
    const aktiv = this.form.controls.aktiv.getRawValue();
    const geoeffnet = this.form.controls.geoeffnet.getRawValue();
    if (aktiv) {
      this.form.controls.geoeffnet.enable({ emitEvent: false });
    } else {
      this.form.controls.geoeffnet.disable({ emitEvent: false });
    }
    if (aktiv && geoeffnet) {
      this.form.controls.beginnLokalzeit.enable({ emitEvent: false });
      this.form.controls.endeLokalzeit.enable({ emitEvent: false });
      return;
    }
    this.form.controls.beginnLokalzeit.disable({ emitEvent: false });
    this.form.controls.endeLokalzeit.disable({ emitEvent: false });
  }
}
