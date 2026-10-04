// pur-system/src/app/pages/verwaltung-page/firma-bearbeiten-dialog/firma-bearbeiten-dialog.ts

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

import { IFirmaAktualisierung, IFirmaEintrag } from '../../../commons/models/domain/firma';
import { VerwaltungStore } from '../../../stores/domain/verwaltung.store';

// ===== Top-Level Helper =====================

const nichtLeerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return String(control.value).trim() ? null : { required: true };
};

export interface IFirmaBearbeitenDialogDaten {
  firma: IFirmaEintrag;
}

@Component({
  selector: 'app-firma-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './firma-bearbeiten-dialog.html',
  styleUrl: './firma-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirmaBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(
    MatDialogRef<FirmaBearbeitenDialog, IFirmaEintrag | undefined>,
  );
  private readonly dialogDaten = inject<IFirmaBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  readonly verwaltungStore = inject(VerwaltungStore);

  // ===== Interner State =======================

  private urspruenglicherDatenwert = '';

  // ===== Öffentliche Werte ====================

  readonly hatAenderungen = signal(false);
  readonly firmaForm = new FormGroup({
    anzeigename: new FormControl(this.dialogDaten.firma.anzeigename, {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    firmenname: new FormControl(this.dialogDaten.firma.firmenname, {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    adresse: new FormGroup({
      strasse: new FormControl(this.dialogDaten.firma.adresse?.strasse ?? '', {
        nonNullable: true,
      }),
      hausnummer: new FormControl(this.dialogDaten.firma.adresse?.hausnummer ?? '', {
        nonNullable: true,
      }),
      postleitzahl: new FormControl(this.dialogDaten.firma.adresse?.postleitzahl ?? '', {
        nonNullable: true,
      }),
      ort: new FormControl(this.dialogDaten.firma.adresse?.ort ?? '', {
        nonNullable: true,
      }),
    }),
    kontakt: new FormGroup({
      email: new FormControl(this.dialogDaten.firma.kontakt.email ?? '', {
        nonNullable: true,
        validators: [Validators.email],
      }),
      telefon: new FormControl(this.dialogDaten.firma.kontakt.telefon ?? '', {
        nonNullable: true,
      }),
      mobil: new FormControl(this.dialogDaten.firma.kontakt.mobil ?? '', {
        nonNullable: true,
      }),
      webseite: new FormControl(this.dialogDaten.firma.kontakt.webseite ?? '', {
        nonNullable: true,
      }),
    }),
  });

  constructor() {
    this.urspruenglicherDatenwert = JSON.stringify(this.getFirmaAktualisierung());
    this.firmaForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updateAenderungsstatus();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Validiert das Formular, aktualisiert die Firma und schließt den Dialog mit dem Ergebnis.
   *
   * @returns Ein Promise, das nach Abschluss des Aktualisierungsversuchs aufgelöst wird.
   */
  async onSubmit(): Promise<void> {
    const emailControl = this.firmaForm.controls.kontakt.controls.email;
    emailControl.setValue(emailControl.getRawValue().trim().toLowerCase());
    this.firmaForm.updateValueAndValidity();

    if (this.firmaForm.invalid || this.verwaltungStore.inProgress()) {
      this.firmaForm.markAllAsTouched();
      return;
    }
    if (!this.hatAenderungen()) return;

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.verwaltungStore.updateFirma(this.getFirmaAktualisierung());
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  // ===== Interne Helfer =======================

  private updateAenderungsstatus(): void {
    this.hatAenderungen.set(
      JSON.stringify(this.getFirmaAktualisierung()) !== this.urspruenglicherDatenwert,
    );
  }

  private getFirmaAktualisierung(): IFirmaAktualisierung {
    const value = this.firmaForm.getRawValue();
    const email = value.kontakt.email.trim().toLowerCase();
    const telefon = value.kontakt.telefon.trim();
    const mobil = value.kontakt.mobil.trim();
    const webseite = value.kontakt.webseite.trim();
    const strasse = value.adresse.strasse.trim();
    const hausnummer = value.adresse.hausnummer.trim();
    const postleitzahl = value.adresse.postleitzahl.trim();
    const ort = value.adresse.ort.trim();
    const hatAdresse = Boolean(strasse || hausnummer || postleitzahl || ort);

    return {
      anzeigename: value.anzeigename.trim(),
      firmenname: value.firmenname.trim(),
      ...(hatAdresse
        ? {
            adresse: {
              ...(strasse ? { strasse } : {}),
              ...(hausnummer ? { hausnummer } : {}),
              ...(postleitzahl ? { postleitzahl } : {}),
              ...(ort ? { ort } : {}),
            },
          }
        : {}),
      kontakt: {
        ...(email ? { email } : {}),
        ...(telefon ? { telefon } : {}),
        ...(mobil ? { mobil } : {}),
        ...(webseite ? { webseite } : {}),
      },
    };
  }
}
