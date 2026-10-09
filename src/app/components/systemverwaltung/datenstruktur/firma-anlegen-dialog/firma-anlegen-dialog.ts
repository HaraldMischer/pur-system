// pur-system/src/app/components/systemverwaltung/datenstruktur/firma-anlegen-dialog/firma-anlegen-dialog.ts

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { IFirmaAnlage, IFirmaAnlageErgebnis } from '../../../../commons/models/domain/firma';
import { nichtLeerValidator } from '../../../../commons/validators/nicht-leer.validator';
import { FirmaStore } from '../../../../stores/domain/firma.store';

export interface IFirmaAnlegenDialogDaten {
  unternehmerId: string;
}

@Component({
  selector: 'app-firma-anlegen-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './firma-anlegen-dialog.html',
  styleUrl: './firma-anlegen-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirmaAnlegenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(
    MatDialogRef<FirmaAnlegenDialog, IFirmaAnlageErgebnis | undefined>,
  );
  private readonly dialogDaten = inject<IFirmaAnlegenDialogDaten>(MAT_DIALOG_DATA);
  readonly firmaStore = inject(FirmaStore);

  // ===== Öffentliche Werte ====================

  readonly firmaForm = new FormGroup({
    anzeigename: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    firmenname: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    adresse: new FormGroup({
      strasse: new FormControl('', { nonNullable: true }),
      hausnummer: new FormControl('', { nonNullable: true }),
      postleitzahl: new FormControl('', { nonNullable: true }),
      ort: new FormControl('', { nonNullable: true }),
    }),
    kontakt: new FormGroup({
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.email],
      }),
      telefon: new FormControl('', { nonNullable: true }),
    }),
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Validiert das Formular, legt die Firma an und schließt den Dialog mit dem Ergebnis.
   *
   * @returns Ein Promise, das nach Abschluss des Anlageversuchs aufgelöst wird.
   */
  async onSubmit(): Promise<void> {
    const emailControl = this.firmaForm.controls.kontakt.controls.email;
    emailControl.setValue(emailControl.getRawValue().trim().toLowerCase());
    this.firmaForm.updateValueAndValidity();

    if (this.firmaForm.invalid || this.firmaStore.inProgress()) {
      this.firmaForm.markAllAsTouched();
      return;
    }

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.firmaStore.createFirma(
        this.dialogDaten.unternehmerId,
        this.getFirmaAnlage(),
      );
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  // ===== Interne Helfer =======================

  private getFirmaAnlage(): IFirmaAnlage {
    const value = this.firmaForm.getRawValue();
    const email = value.kontakt.email.trim().toLowerCase();
    const telefon = value.kontakt.telefon.trim();
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
      },
    };
  }
}
