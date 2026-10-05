// pur-system/src/app/pages/systemverwaltung-page/datenstruktur-page/unternehmer-anlegen-dialog/unternehmer-anlegen-dialog.ts

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  IUnternehmerAnlage,
  IUnternehmerAnlageErgebnis,
} from '../../../../commons/models/domain/unternehmer';
import { nichtLeerValidator } from '../../../../commons/validators/nicht-leer.validator';
import { UnternehmerStore } from '../../../../stores/domain/unternehmer.store';

@Component({
  selector: 'app-unternehmer-anlegen-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './unternehmer-anlegen-dialog.html',
  styleUrl: './unternehmer-anlegen-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnternehmerAnlegenDialog {
  private readonly dialogRef = inject(
    MatDialogRef<UnternehmerAnlegenDialog, IUnternehmerAnlageErgebnis | undefined>,
  );
  readonly unternehmerStore = inject(UnternehmerStore);

  readonly unternehmerForm = new FormGroup({
    anzeigename: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    person: new FormGroup({
      vorname: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      nachname: new FormControl('', {
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
    }),
  });

  async onSubmit(): Promise<void> {
    const emailControl = this.unternehmerForm.controls.person.controls.kontakt.controls.email;
    emailControl.setValue(emailControl.getRawValue().trim().toLowerCase());
    this.unternehmerForm.updateValueAndValidity();

    if (this.unternehmerForm.invalid || this.unternehmerStore.inProgress()) {
      this.unternehmerForm.markAllAsTouched();
      return;
    }

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.unternehmerStore.createUnternehmer(this.getUnternehmerAnlage());
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  private getUnternehmerAnlage(): IUnternehmerAnlage {
    const value = this.unternehmerForm.getRawValue();
    const email = value.person.kontakt.email.trim().toLowerCase();
    const telefon = value.person.kontakt.telefon.trim();
    const strasse = value.person.adresse.strasse.trim();
    const hausnummer = value.person.adresse.hausnummer.trim();
    const postleitzahl = value.person.adresse.postleitzahl.trim();
    const ort = value.person.adresse.ort.trim();
    const adresse = {
      ...(strasse ? { strasse } : {}),
      ...(hausnummer ? { hausnummer } : {}),
      ...(postleitzahl ? { postleitzahl } : {}),
      ...(ort ? { ort } : {}),
    };

    return {
      anzeigename: value.anzeigename.trim(),
      person: {
        vorname: value.person.vorname.trim(),
        nachname: value.person.nachname.trim(),
        ...(Object.keys(adresse).length > 0 ? { adresse } : {}),
        kontakt: {
          ...(email ? { email } : {}),
          ...(telefon ? { telefon } : {}),
        },
      },
    };
  }
}
