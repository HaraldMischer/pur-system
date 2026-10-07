// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-bearbeiten-dialog.ts

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

import {
  IBenutzerDatenzuordnung,
  IBenutzerMitarbeiterZuordnung,
  IBenutzerProfilAktualisierung,
  IBenutzerProfilEintrag,
} from '../../../../../commons/models/domain/benutzer';
import { IUnternehmerAuswahl } from '../../../../../commons/models/domain/datenzugriff';
import {
  buildErlaubteBereiche,
  getWaehlbareAppBereiche,
  TWaehlbarerAppBereich,
} from '../../../../../commons/utils/benutzer/erlaubte-bereiche';
import { nichtLeerValidator } from '../../../../../commons/validators/nicht-leer.validator';
import { AuthService } from '../../../../../services/firebase/auth.service';
import { StammdatenStore } from '../../../../../stores/app/stammdaten.store';
import { BenutzerVerwaltungStore } from '../../../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerDatenzuordnung } from './benutzer-datenzuordnung/benutzer-datenzuordnung';

// ===== Top-Level Helper =====================

type TErlaubteBereicheForm = { [K in TWaehlbarerAppBereich]: FormControl<boolean> };

export interface IBenutzerBearbeitenDialogDaten {
  profil: IBenutzerProfilEintrag;
}

@Component({
  selector: 'app-benutzer-bearbeiten-dialog',
  imports: [
    BenutzerDatenzuordnung,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './benutzer-bearbeiten-dialog.html',
  styleUrl: './benutzer-bearbeiten-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerBearbeitenDialog {
  // ===== Interne Dependency Injection =========

  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(
    MatDialogRef<BenutzerBearbeitenDialog, IBenutzerProfilEintrag | undefined>,
  );
  private readonly dialogDaten = inject<IBenutzerBearbeitenDialogDaten>(MAT_DIALOG_DATA);
  private readonly stammdatenStore = inject(StammdatenStore);
  readonly verwaltungStore = inject(BenutzerVerwaltungStore);

  // ===== Interner State =======================

  private urspruenglicherDatenwert = '';

  // ===== Öffentliche Werte ====================

  readonly profil = this.dialogDaten.profil;
  readonly istEigenesProfil = this.profil.uid === this.authService.getAktuelleBenutzerId();
  readonly dialogTitel =
    this.profil.userRole === 'filiale'
      ? 'Filial-Benutzer bearbeiten'
      : this.profil.userRole === 'office'
        ? 'Office-Benutzer bearbeiten'
        : this.profil.userRole === 'mitarbeiter'
          ? 'Mitarbeiter-Benutzer bearbeiten'
          : 'Master-Benutzer bearbeiten';
  readonly bereiche = getWaehlbareAppBereiche(this.profil.userRole);
  readonly unternehmer = computed<readonly IUnternehmerAuswahl[]>(() => {
    return this.stammdatenStore.unternehmer().map((unternehmer) => ({
      id: unternehmer.id,
      anzeigename: unternehmer.anzeigename,
      firmen: this.stammdatenStore.getFirmen(unternehmer.id).map((firma) => ({
        id: firma.id,
        anzeigename: firma.anzeigename,
        filialen: this.stammdatenStore.getFilialen(unternehmer.id, firma.id).map((filiale) => ({
          id: filiale.id,
          anzeigename: filiale.anzeigename,
        })),
      })),
    }));
  });
  readonly hatAenderungen = signal(false);
  readonly zuordnungAktionAktiv = signal(false);
  readonly loeschenBestaetigen = signal(false);
  readonly benutzerForm = new FormGroup({
    anzeigename: new FormControl(this.profil.anzeigename, {
      nonNullable: true,
      validators: [Validators.required, nichtLeerValidator],
    }),
    aktiv: new FormControl(this.profil.aktiv, { nonNullable: true }),
    erlaubteBereiche: new FormGroup<TErlaubteBereicheForm>({
      schichtplan: new FormControl(this.profil.erlaubteBereiche.includes('schichtplan'), {
        nonNullable: true,
      }),
      mitarbeiter: new FormControl(this.profil.erlaubteBereiche.includes('mitarbeiter'), {
        nonNullable: true,
      }),
      verwaltung: new FormControl(this.profil.erlaubteBereiche.includes('verwaltung'), {
        nonNullable: true,
      }),
    }),
  });
  constructor() {
    if (this.istEigenesProfil) {
      this.benutzerForm.controls.aktiv.disable();
    }

    this.urspruenglicherDatenwert = JSON.stringify(this.getAktualisierung());
    this.benutzerForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updateAenderungsstatus();
    });
    effect(() => {
      this.verwaltungStore.inProgress();
      this.updateFormStatus();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Validiert und speichert die bearbeitbaren Profildaten.
   *
   * @returns Ein Promise, das nach Abschluss des Aktualisierungsversuchs aufgelöst wird.
   */
  async onSubmit(): Promise<void> {
    const anzeigenameControl = this.benutzerForm.controls.anzeigename;
    anzeigenameControl.setValue(anzeigenameControl.getRawValue().trim());
    this.benutzerForm.updateValueAndValidity();

    if (this.benutzerForm.invalid || this.verwaltungStore.inProgress()) {
      this.benutzerForm.markAllAsTouched();
      return;
    }
    if (!this.hatAenderungen()) return;

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.verwaltungStore.updateBenutzerProfil(this.getAktualisierung());
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  /**
   * Speichert eine neue Office- oder Filial-Datenzuordnung serverseitig.
   *
   * @param zuordnung - Vollständige neue Datenzuordnung.
   */
  async saveDatenzuordnung(zuordnung: IBenutzerDatenzuordnung): Promise<void> {
    if (this.verwaltungStore.inProgress()) return;

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.verwaltungStore.updateDatenzuordnung(zuordnung);
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  /**
   * Speichert die ausgewählte neue Mitarbeiterzuordnung serverseitig.
   *
   * @param zuordnung - Vollständige neue Mitarbeiterzuordnung.
   */
  async saveMitarbeiterZuordnung(zuordnung: IBenutzerMitarbeiterZuordnung): Promise<void> {
    if (this.verwaltungStore.inProgress()) return;

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.verwaltungStore.updateMitarbeiterZuordnung(zuordnung);
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  /**
   * Blendet die Sicherheitsabfrage für die endgültige Kontolöschung ein.
   */
  startBenutzerLoeschen(): void {
    if (this.profil.userRole === 'master' || this.zuordnungAktionAktiv()) return;
    this.loeschenBestaetigen.set(true);
  }

  /**
   * Bricht die Kontolöschung ab.
   */
  cancelBenutzerLoeschen(): void {
    this.loeschenBestaetigen.set(false);
  }

  /**
   * Löscht das ausgewählte Konto nach bestätigter Sicherheitsabfrage.
   */
  async deleteBenutzer(): Promise<void> {
    if (!this.loeschenBestaetigen() || this.verwaltungStore.inProgress()) return;

    this.dialogRef.disableClose = true;
    try {
      await this.verwaltungStore.deleteBenutzer();
      this.dialogRef.close(undefined);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  // ===== Interne Helfer =======================

  private updateFormStatus(): void {
    if (this.verwaltungStore.inProgress()) {
      this.benutzerForm.disable({ emitEvent: false });
      return;
    }

    this.benutzerForm.enable({ emitEvent: false });
    if (this.istEigenesProfil) {
      this.benutzerForm.controls.aktiv.disable({ emitEvent: false });
    }
  }

  private updateAenderungsstatus(): void {
    this.hatAenderungen.set(
      JSON.stringify(this.getAktualisierung()) !== this.urspruenglicherDatenwert,
    );
  }

  private getAktualisierung(): IBenutzerProfilAktualisierung {
    const value = this.benutzerForm.getRawValue();
    const ausgewaehlteBereiche = this.bereiche
      .filter((bereich) => value.erlaubteBereiche[bereich.value])
      .map((bereich) => bereich.value);
    const erlaubteBereiche = buildErlaubteBereiche(this.profil.userRole, ausgewaehlteBereiche);

    return {
      anzeigename: value.anzeigename,
      aktiv: value.aktiv,
      erlaubteBereiche,
    };
  }
}
