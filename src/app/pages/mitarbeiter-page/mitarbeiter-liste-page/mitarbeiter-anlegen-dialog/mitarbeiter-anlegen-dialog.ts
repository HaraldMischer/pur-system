// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { IFilialeEintrag } from '../../../../commons/models/domain/filiale';
import {
  IMitarbeiterAnlage,
  IMitarbeiterAnlageErgebnis,
  TMitarbeiterRolle,
} from '../../../../commons/models/domain/mitarbeiter';
import { hatMitarbeiterVerwaltungszugriffAufFirma } from '../../../../commons/utils/mitarbeiter/mitarbeiter-berechtigung';
import { nichtLeerValidator } from '../../../../commons/validators/nicht-leer.validator';
import { BenutzerStore } from '../../../../stores/app/benutzer.store';
import { MitarbeiterStore } from '../../../../stores/domain/mitarbeiter.store';

export interface IMitarbeiterAnlegenDialogDaten {
  unternehmerId: string;
  firmaId: string;
  filialen: readonly IFilialeEintrag[];
}

@Component({
  selector: 'app-mitarbeiter-anlegen-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './mitarbeiter-anlegen-dialog.html',
  styleUrl: './mitarbeiter-anlegen-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MitarbeiterAnlegenDialog {
  // ===== Interne Dependency Injection =========
  private readonly dialogRef = inject(
    MatDialogRef<MitarbeiterAnlegenDialog, IMitarbeiterAnlageErgebnis | undefined>,
  );
  readonly dialogDaten = inject<IMitarbeiterAnlegenDialogDaten>(MAT_DIALOG_DATA);
  readonly benutzerStore = inject(BenutzerStore);
  readonly mitarbeiterStore = inject(MitarbeiterStore);

  // ===== Interner State =======================
  private readonly verpflichtendeFilialId = this.getVerpflichtendeFilialId();

  // ===== Öffentliche Werte ====================
  readonly rollen: readonly { value: TMitarbeiterRolle; label: string }[] = [
    { value: 'filialkasse', label: 'Filialkasse' },
    { value: 'servicekraft', label: 'Servicekraft' },
    { value: 'administrator', label: 'Administrator' },
    { value: 'kassierer', label: 'Kassierer' },
    { value: 'techniker', label: 'Techniker' },
    { value: 'dienstplaner', label: 'Dienstplaner' },
  ];
  readonly submitError = signal<string | null>(null);
  readonly mitarbeiterForm = new FormGroup({
    person: new FormGroup({
      vorname: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      nachname: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      geburtstag: new FormControl('', { nonNullable: true }),
      adresse: new FormGroup({
        strasse: new FormControl('', { nonNullable: true }),
        hausnummer: new FormControl('', { nonNullable: true }),
        postleitzahl: new FormControl('', { nonNullable: true }),
        ort: new FormControl('', { nonNullable: true }),
      }),
      kontakt: new FormGroup({
        email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
        telefon: new FormControl('', { nonNullable: true }),
        mobil: new FormControl('', { nonNullable: true }),
        webseite: new FormControl('', { nonNullable: true }),
      }),
    }),
    rollen: new FormControl<TMitarbeiterRolle[]>(['servicekraft'], {
      nonNullable: true,
      validators: [Validators.required],
    }),
    filialIds: new FormControl<string[]>(
      this.verpflichtendeFilialId ? [this.verpflichtendeFilialId] : [],
      {
        nonNullable: true,
        validators: [Validators.required],
      },
    ),
    aktiv: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const inProgress = this.mitarbeiterStore.inProgress();
      untracked(() => {
        if (inProgress) {
          this.mitarbeiterForm.disable({ emitEvent: false });
        } else {
          this.mitarbeiterForm.enable({ emitEvent: false });
        }
      });
    });
  }

  // ===== Öffentliche Aktionen =================
  /**
   * Validiert und speichert einen neuen Mitarbeiter für die ausgewählte Firma.
   */
  async onSubmit(): Promise<void> {
    this.normalisiereEmail();
    if (this.mitarbeiterForm.invalid || this.mitarbeiterStore.inProgress()) {
      this.mitarbeiterForm.markAllAsTouched();
      return;
    }
    if (!this.hatAktuellenFirmenzugriff()) {
      this.submitError.set('Der Zugriff auf die ausgewählte Firma ist nicht mehr erlaubt.');
      return;
    }

    this.submitError.set(null);
    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.mitarbeiterStore.createMitarbeiter(
        this.dialogDaten.unternehmerId,
        this.dialogDaten.firmaId,
        this.getMitarbeiterAnlage(),
      );
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  // ===== Interne Helfer =======================
  private hatAktuellenFirmenzugriff(): boolean {
    const profil = this.benutzerStore.benutzerProfil();
    return Boolean(
      profil &&
      hatMitarbeiterVerwaltungszugriffAufFirma(
        profil,
        this.dialogDaten.unternehmerId,
        this.dialogDaten.firmaId,
      ),
    );
  }
  private normalisiereEmail(): void {
    const control = this.mitarbeiterForm.controls.person.controls.kontakt.controls.email;
    control.setValue(control.getRawValue().trim().toLowerCase());
    this.mitarbeiterForm.updateValueAndValidity();
  }
  private getMitarbeiterAnlage(): IMitarbeiterAnlage {
    const value = this.mitarbeiterForm.getRawValue();
    const kontakt = value.person.kontakt;
    const geburtstag = value.person.geburtstag.trim();

    return {
      person: {
        vorname: value.person.vorname.trim(),
        nachname: value.person.nachname.trim(),
        adresse: {
          strasse: value.person.adresse.strasse.trim(),
          hausnummer: value.person.adresse.hausnummer.trim(),
          postleitzahl: value.person.adresse.postleitzahl.trim(),
          ort: value.person.adresse.ort.trim(),
        },
        kontakt: {
          ...(kontakt.email.trim() ? { email: kontakt.email.trim().toLowerCase() } : {}),
          ...(kontakt.telefon.trim() ? { telefon: kontakt.telefon.trim() } : {}),
          ...(kontakt.mobil.trim() ? { mobil: kontakt.mobil.trim() } : {}),
          ...(kontakt.webseite.trim() ? { webseite: kontakt.webseite.trim() } : {}),
        },
        ...(geburtstag ? { geburtstag } : {}),
      },
      rollen: value.rollen,
      filialIds: [
        ...new Set([
          ...value.filialIds,
          ...(this.verpflichtendeFilialId ? [this.verpflichtendeFilialId] : []),
        ]),
      ],
      aktiv: value.aktiv,
    };
  }
  private getVerpflichtendeFilialId(): string | undefined {
    const profil = this.benutzerStore.benutzerProfil();
    if (profil?.userRole !== 'filiale') return undefined;

    const filialIds = profil.zugriffe[this.dialogDaten.unternehmerId]?.[this.dialogDaten.firmaId];
    return Array.isArray(filialIds) && filialIds.length === 1 ? filialIds[0] : undefined;
  }
}
