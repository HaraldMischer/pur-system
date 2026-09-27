// pur-system/src/app/pages/systemverwaltung-page/datenstruktur-page/filiale-anlegen-dialog/filiale-anlegen-dialog.ts

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

import { IFilialeAnlage, IFilialeAnlageErgebnis } from '../../../../commons/models/domain/filiale';
import { FilialeStore } from '../../../../stores/domain/filiale.store';

// ===== Top-Level Helper =====================

const nichtLeerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return String(control.value).trim() ? null : { required: true };
};

export interface IFilialeAnlegenDialogDaten {
  unternehmerId: string;
  firmaId: string;
}

@Component({
  selector: 'app-filiale-anlegen-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './filiale-anlegen-dialog.html',
  styleUrl: './filiale-anlegen-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilialeAnlegenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(
    MatDialogRef<FilialeAnlegenDialog, IFilialeAnlageErgebnis | undefined>,
  );
  private readonly dialogDaten = inject<IFilialeAnlegenDialogDaten>(MAT_DIALOG_DATA);
  readonly filialeStore = inject(FilialeStore);

  // ===== Öffentliche Werte ====================

  readonly filialeForm = new FormGroup({
    anzeigename: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    filialname: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    adresse: new FormGroup({
      strasse: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      hausnummer: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      postleitzahl: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      ort: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
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
   * Validiert das Formular, legt die Filiale an und schließt den Dialog mit dem Ergebnis.
   *
   * @returns Ein Promise, das nach Abschluss des Anlageversuchs aufgelöst wird.
   */
  async onSubmit(): Promise<void> {
    const emailControl = this.filialeForm.controls.kontakt.controls.email;
    emailControl.setValue(emailControl.getRawValue().trim().toLowerCase());
    this.filialeForm.updateValueAndValidity();

    if (this.filialeForm.invalid || this.filialeStore.inProgress()) {
      this.filialeForm.markAllAsTouched();
      return;
    }

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.filialeStore.createFiliale(
        this.dialogDaten.unternehmerId,
        this.dialogDaten.firmaId,
        this.getFilialeAnlage(),
      );
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  // ===== Interne Helfer =======================

  private getFilialeAnlage(): IFilialeAnlage {
    const value = this.filialeForm.getRawValue();
    const email = value.kontakt.email.trim().toLowerCase();
    const telefon = value.kontakt.telefon.trim();

    return {
      anzeigename: value.anzeigename.trim(),
      filialname: value.filialname.trim(),
      adresse: {
        strasse: value.adresse.strasse.trim(),
        hausnummer: value.adresse.hausnummer.trim(),
        postleitzahl: value.adresse.postleitzahl.trim(),
        ort: value.adresse.ort.trim(),
      },
      kontakt: {
        ...(email ? { email } : {}),
        ...(telefon ? { telefon } : {}),
      },
    };
  }
}
