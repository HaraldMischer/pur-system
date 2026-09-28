// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { IFilialeEintrag } from '../../../../commons/models/domain/filiale';
import {
  IMitarbeiterAktualisierung,
  IMitarbeiterEintrag,
  TMitarbeiterRolle,
} from '../../../../commons/models/domain/mitarbeiter';
import { EGender } from '../../../../commons/models/domain/person';
import { hatMitarbeiterVerwaltungszugriffAufFirma } from '../../../../commons/utils/mitarbeiter/mitarbeiter-berechtigung';
import { BenutzerStore } from '../../../../stores/app/benutzer.store';
import { MitarbeiterStore } from '../../../../stores/domain/mitarbeiter.store';

// ===== Top-Level Helper =====================

const nichtLeerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return String(control.value).trim() ? null : { required: true };
};

export interface IMitarbeiterBearbeitenDialogDaten {
  unternehmerId: string;
  unternehmerName: string;
  firmaId: string;
  firmaName: string;
  filialen: readonly IFilialeEintrag[];
  mitarbeiter: IMitarbeiterEintrag;
}

@Component({
  selector: 'app-mitarbeiter-bearbeiten-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './mitarbeiter-bearbeiten-dialog.html',
  styleUrl: './mitarbeiter-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MitarbeiterBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(
    MatDialogRef<MitarbeiterBearbeitenDialog, IMitarbeiterEintrag | undefined>,
  );
  readonly dialogDaten = inject<IMitarbeiterBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  readonly benutzerStore = inject(BenutzerStore);
  readonly mitarbeiterStore = inject(MitarbeiterStore);

  // ===== Konstanten & Typen ===================

  private readonly erlaubteFilialIds = new Set(
    this.dialogDaten.filialen.map((filiale) => filiale.id),
  );
  private readonly fremdeFilialIds = this.dialogDaten.mitarbeiter.filialIds.filter((filialId) => {
    return !this.erlaubteFilialIds.has(filialId);
  });

  // ===== Öffentliche Werte ====================

  readonly geschlechter = Object.values(EGender);
  readonly rollen: readonly { value: TMitarbeiterRolle; label: string }[] = [
    { value: 'service', label: 'Service' },
    { value: 'kasse', label: 'Kasse' },
    { value: 'admin', label: 'Administration' },
  ];
  readonly weitereFilialzuordnungen = this.fremdeFilialIds.length;
  readonly submitError = signal<string | null>(null);
  readonly mitarbeiterForm = new FormGroup({
    person: new FormGroup({
      vorname: new FormControl(this.dialogDaten.mitarbeiter.person.vorname, {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      nachname: new FormControl(this.dialogDaten.mitarbeiter.person.nachname, {
        nonNullable: true,
        validators: [Validators.required, nichtLeerValidator],
      }),
      geburtstag: new FormControl(this.dialogDaten.mitarbeiter.person.geburtstag ?? '', {
        nonNullable: true,
      }),
      geschlecht: new FormControl<EGender | null>(
        this.dialogDaten.mitarbeiter.person.geschlecht ?? null,
      ),
      adresse: new FormGroup({
        strasse: new FormControl(this.dialogDaten.mitarbeiter.person.adresse.strasse, {
          nonNullable: true,
          validators: [Validators.required, nichtLeerValidator],
        }),
        hausnummer: new FormControl(this.dialogDaten.mitarbeiter.person.adresse.hausnummer, {
          nonNullable: true,
          validators: [Validators.required, nichtLeerValidator],
        }),
        postleitzahl: new FormControl(this.dialogDaten.mitarbeiter.person.adresse.postleitzahl, {
          nonNullable: true,
          validators: [Validators.required, nichtLeerValidator],
        }),
        ort: new FormControl(this.dialogDaten.mitarbeiter.person.adresse.ort, {
          nonNullable: true,
          validators: [Validators.required, nichtLeerValidator],
        }),
      }),
      kontakt: new FormGroup({
        email: new FormControl(this.dialogDaten.mitarbeiter.person.kontakt.email ?? '', {
          nonNullable: true,
          validators: [Validators.email],
        }),
        telefon: new FormControl(this.dialogDaten.mitarbeiter.person.kontakt.telefon ?? '', {
          nonNullable: true,
        }),
        mobil: new FormControl(this.dialogDaten.mitarbeiter.person.kontakt.mobil ?? '', {
          nonNullable: true,
        }),
        webseite: new FormControl(this.dialogDaten.mitarbeiter.person.kontakt.webseite ?? '', {
          nonNullable: true,
        }),
      }),
    }),
    rolle: new FormControl<TMitarbeiterRolle>(this.dialogDaten.mitarbeiter.rolle, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    filialIds: new FormControl<string[]>(
      this.dialogDaten.mitarbeiter.filialIds.filter((filialId) => {
        return this.erlaubteFilialIds.has(filialId);
      }),
      { nonNullable: true },
    ),
    aktiv: new FormControl(this.dialogDaten.mitarbeiter.aktiv, { nonNullable: true }),
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
   * Validiert und aktualisiert den ausgewählten Mitarbeiter.
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
      const aktualisierung = this.getMitarbeiterAktualisierung();
      await this.mitarbeiterStore.updateMitarbeiter(
        this.dialogDaten.unternehmerId,
        this.dialogDaten.firmaId,
        this.dialogDaten.mitarbeiter.id,
        aktualisierung,
      );
      this.dialogRef.close({
        id: this.dialogDaten.mitarbeiter.id,
        unternehmerId: this.dialogDaten.unternehmerId,
        firmaId: this.dialogDaten.firmaId,
        ...aktualisierung,
      });
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

  private getMitarbeiterAktualisierung(): IMitarbeiterAktualisierung {
    const value = this.mitarbeiterForm.getRawValue();
    const kontakt = value.person.kontakt;
    const geburtstag = value.person.geburtstag.trim();

    const verpflichtendeFilialId = this.getVerpflichtendeFilialId();
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
        ...(value.person.geschlecht ? { geschlecht: value.person.geschlecht } : {}),
      },
      rolle: value.rolle,
      filialIds: [
        ...new Set([
          ...this.fremdeFilialIds,
          ...value.filialIds,
          ...(verpflichtendeFilialId ? [verpflichtendeFilialId] : []),
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
