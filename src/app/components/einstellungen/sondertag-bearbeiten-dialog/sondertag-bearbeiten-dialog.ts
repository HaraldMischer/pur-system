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
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { STANDARD_OEFFNUNGSREGEL } from '../../../commons/constants/filialeinstellung.constants';
import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeinstellungSondertagEintrag } from '../../../commons/models/domain/filialeinstellung';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { EingabeDatum } from '../../shared/eingabe-datum/eingabe-datum';

// ===== Konstanten & Typen ===================

export interface ISondertagBearbeitenDialogDaten {
  readonly pfad: IFilialPfad;
  readonly sondertag?: IFilialeinstellungSondertagEintrag;
}

@Component({
  selector: 'app-sondertag-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    EingabeDatum,
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

  readonly istBestehenderEintrag = Boolean(this.daten.sondertag);
  readonly datumModus = 'monat-tag' as const;
  readonly dialogTitel = this.istBestehenderEintrag
    ? 'Jährlichen Sondertag bearbeiten'
    : 'Jährlichen Sondertag anlegen';
  readonly form = new FormGroup(
    {
      bezeichnung: new FormControl(this.daten.sondertag?.bezeichnung ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      monatTag: new FormControl(this.getDatum(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
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
    const ursprung = JSON.stringify(this.form.getRawValue());
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hatAenderungen.set(JSON.stringify(this.form.getRawValue()) !== ursprung);
    });
    effect(() => {
      if (this.inProgress()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
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
    const [monat, tag] = wert.monatTag.split('-').map(Number);
    try {
      if (!this.daten.sondertag) {
        await this.store.createSondertag(this.daten.pfad, {
          bezeichnung: wert.bezeichnung.trim(),
          aktiv: false,
          datumsregel: { typ: 'jaehrlichFestesDatum', monat, tag },
          oeffnungsregel: {
            geoeffnet: false,
            beginnLokalzeit: STANDARD_OEFFNUNGSREGEL.beginnLokalzeit,
            endeLokalzeit: STANDARD_OEFFNUNGSREGEL.endeLokalzeit,
            endetAmFolgetag: STANDARD_OEFFNUNGSREGEL.endetAmFolgetag,
          },
        });
      } else {
        const sondertag = this.daten.sondertag;
        if (
          sondertag.herkunft !== 'benutzer' ||
          sondertag.datumsregel.typ !== 'jaehrlichFestesDatum'
        )
          return;
        await this.store.updateSondertag(this.daten.pfad, this.daten.sondertag.id, {
          bezeichnung: wert.bezeichnung.trim(),
          aktiv: sondertag.aktiv,
          datumsregel: { typ: 'jaehrlichFestesDatum', monat, tag },
          oeffnungsregel: sondertag.oeffnungsregel,
        });
      }
      this.dialogRef.close(true);
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  // ===== Interne Helfer =======================

  private getDatum(): string {
    const regel = this.daten.sondertag?.datumsregel;
    if (regel?.typ === 'jaehrlichFestesDatum') {
      const monat = String(regel.monat).padStart(2, '0');
      const tag = String(regel.tag).padStart(2, '0');
      return `${monat}-${tag}`;
    }
    return '';
  }
}
