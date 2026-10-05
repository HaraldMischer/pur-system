// pur-system/src/app/pages/verwaltung-page/filiale-bearbeiten-dialog/filiale-bearbeiten-dialog.ts

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { IFilialeAktualisierung, IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { nichtLeerValidator } from '../../../commons/validators/nicht-leer.validator';
import { VerwaltungStore } from '../../../stores/domain/verwaltung.store';

export interface IFilialeBearbeitenDialogDaten {
  filiale: IFilialeEintrag;
}

@Component({
  selector: 'app-filiale-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './filiale-bearbeiten-dialog.html',
  styleUrl: './filiale-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilialeBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(
    MatDialogRef<FilialeBearbeitenDialog, IFilialeEintrag | undefined>,
  );
  private readonly dialogDaten = inject<IFilialeBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  readonly verwaltungStore = inject(VerwaltungStore);

  // ===== Interner State =======================

  private urspruenglicherDatenwert = '';

  // ===== Öffentliche Werte ====================

  readonly hatAenderungen = signal(false);
  readonly filialeForm = new FormGroup({
    anzeigename: new FormControl(this.dialogDaten.filiale.anzeigename, {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    filialname: new FormControl(this.dialogDaten.filiale.filialname, {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    adresse: new FormGroup({
      strasse: new FormControl(this.dialogDaten.filiale.adresse?.strasse ?? '', {
        nonNullable: true,
      }),
      hausnummer: new FormControl(this.dialogDaten.filiale.adresse?.hausnummer ?? '', {
        nonNullable: true,
      }),
      postleitzahl: new FormControl(this.dialogDaten.filiale.adresse?.postleitzahl ?? '', {
        nonNullable: true,
      }),
      ort: new FormControl(this.dialogDaten.filiale.adresse?.ort ?? '', {
        nonNullable: true,
      }),
    }),
    kontakt: new FormGroup({
      email: new FormControl(this.dialogDaten.filiale.kontakt.email ?? '', {
        nonNullable: true,
        validators: [Validators.email],
      }),
      telefon: new FormControl(this.dialogDaten.filiale.kontakt.telefon ?? '', {
        nonNullable: true,
      }),
      mobil: new FormControl(this.dialogDaten.filiale.kontakt.mobil ?? '', {
        nonNullable: true,
      }),
      webseite: new FormControl(this.dialogDaten.filiale.kontakt.webseite ?? '', {
        nonNullable: true,
      }),
    }),
  });

  constructor() {
    this.urspruenglicherDatenwert = JSON.stringify(this.getFilialeAktualisierung());
    this.filialeForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updateAenderungsstatus();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Validiert das Formular, aktualisiert die Filiale und schließt den Dialog mit dem Ergebnis.
   *
   * @returns Ein Promise, das nach Abschluss des Aktualisierungsversuchs aufgelöst wird.
   */
  async onSubmit(): Promise<void> {
    const emailControl = this.filialeForm.controls.kontakt.controls.email;
    emailControl.setValue(emailControl.getRawValue().trim().toLowerCase());
    this.filialeForm.updateValueAndValidity();

    if (this.filialeForm.invalid || this.verwaltungStore.inProgress()) {
      this.filialeForm.markAllAsTouched();
      return;
    }
    if (!this.hatAenderungen()) return;

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.verwaltungStore.updateFiliale(this.getFilialeAktualisierung());
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
      JSON.stringify(this.getFilialeAktualisierung()) !== this.urspruenglicherDatenwert,
    );
  }

  private getFilialeAktualisierung(): IFilialeAktualisierung {
    const value = this.filialeForm.getRawValue();
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
      filialname: value.filialname.trim(),
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
