// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-bearbeiten-dialog.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { DatenzugriffSelector } from '../../../../../components/data-selectors/datenzugriff-selector/datenzugriff-selector';
import {
  IBenutzerProfilAktualisierung,
  IBenutzerProfilEintrag,
  TBenutzerZugriffe,
} from '../../../../../commons/models/domain/benutzer';
import { IUnternehmerAuswahl } from '../../../../../commons/models/domain/datenzugriff';
import {
  buildErlaubteBereiche,
  getWaehlbareAppBereiche,
  TWaehlbarerAppBereich,
} from '../../../../../commons/utils/benutzer/erlaubte-bereiche';
import { AuthService } from '../../../../../services/firebase/auth.service';
import { StammdatenStore } from '../../../../../stores/app/stammdaten.store';
import { BenutzerVerwaltungStore } from '../../../../../stores/domain/benutzer-verwaltung.store';

// ===== Top-Level Helper =====================

type TErlaubteBereicheForm = { [K in TWaehlbarerAppBereich]: FormControl<boolean> };

const nichtLeerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return String(control.value).trim() ? null : { required: true };
};

export interface IBenutzerBearbeitenDialogDaten {
  profil: IBenutzerProfilEintrag;
}

@Component({
  selector: 'app-benutzer-bearbeiten-dialog',
  imports: [
    DatenzugriffSelector,
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
  readonly rollenLabel =
    this.profil.userRole === 'filiale'
      ? 'Filiale'
      : this.profil.userRole === 'office'
        ? 'Office'
        : this.profil.userRole === 'mitarbeiter'
          ? 'Mitarbeiter'
          : 'Master';
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
  readonly unternehmerIds = signal<readonly string[]>(Object.keys(this.profil.zugriffe));
  readonly firmaIds = signal<readonly string[]>(this.getFirmaIds(this.profil.zugriffe));
  readonly filialen = signal<Readonly<Partial<Record<string, readonly string[]>>>>(
    this.getFilialen(this.profil.zugriffe),
  );
  readonly hatAenderungen = signal(false);
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
      this.unternehmerIds();
      this.firmaIds();
      this.filialen();
      untracked(() => {
        this.updateAenderungsstatus();
      });
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Prüft die rollenabhängige Datenzugriffsauswahl.
   *
   * @returns `true`, wenn die aktuelle Rolle eine gültige Zuordnung besitzt.
   */
  datenAuswahlGueltig(): boolean {
    const rolle = this.profil.userRole;
    if (rolle === 'master' || rolle === 'mitarbeiter') return true;

    const zugriffe = this.getZugriffe();
    const firmen = Object.values(zugriffe).flatMap((eintrag) => Object.values(eintrag));
    return (
      Object.keys(zugriffe).length === 1 &&
      firmen.length > 0 &&
      firmen.every((filialIds) => filialIds.length > 0) &&
      (rolle !== 'filiale' || (firmen.length === 1 && firmen[0].length === 1))
    );
  }

  /**
   * Validiert und speichert die bearbeitbaren Profildaten.
   *
   * @returns Ein Promise, das nach Abschluss des Aktualisierungsversuchs aufgelöst wird.
   */
  async onSubmit(): Promise<void> {
    const anzeigenameControl = this.benutzerForm.controls.anzeigename;
    anzeigenameControl.setValue(anzeigenameControl.getRawValue().trim());
    this.benutzerForm.updateValueAndValidity();

    if (
      this.benutzerForm.invalid ||
      !this.datenAuswahlGueltig() ||
      this.verwaltungStore.inProgress()
    ) {
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

  // ===== Interne Helfer =======================

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
      zugriffe:
        this.profil.userRole === 'master'
          ? {}
          : this.profil.userRole === 'mitarbeiter'
            ? this.profil.zugriffe
            : this.getZugriffe(),
    };
  }

  private getZugriffe(): TBenutzerZugriffe {
    const zugriffe = new Map<string, Map<string, string[]>>();
    for (const firmaSchluessel of this.firmaIds()) {
      const [unternehmerId, firmaId] = JSON.parse(firmaSchluessel) as [string, string];
      if (!this.unternehmerIds().includes(unternehmerId)) continue;
      const unternehmer = this.unternehmer().find((eintrag) => eintrag.id === unternehmerId);
      const firma = unternehmer?.firmen.find((eintrag) => eintrag.id === firmaId);
      if (!firma) continue;
      const filialIds = [...(this.filialen()[firmaSchluessel] ?? [])].filter((filialId) =>
        firma.filialen.some((filiale) => filiale.id === filialId),
      );
      if (!filialIds.length) continue;
      const firmen = zugriffe.get(unternehmerId) ?? new Map<string, string[]>();
      firmen.set(firmaId, filialIds);
      zugriffe.set(unternehmerId, firmen);
    }
    return Object.fromEntries(
      [...zugriffe].map(([unternehmerId, firmen]) => [unternehmerId, Object.fromEntries(firmen)]),
    );
  }

  private getFirmaIds(zugriffe: TBenutzerZugriffe): readonly string[] {
    return Object.entries(zugriffe).flatMap(([unternehmerId, firmen]) =>
      Object.keys(firmen).map((firmaId) => JSON.stringify([unternehmerId, firmaId])),
    );
  }

  private getFilialen(
    zugriffe: TBenutzerZugriffe,
  ): Readonly<Partial<Record<string, readonly string[]>>> {
    return Object.fromEntries(
      Object.entries(zugriffe).flatMap(([unternehmerId, firmen]) =>
        Object.entries(firmen).map(([firmaId, filialIds]) => [
          JSON.stringify([unternehmerId, firmaId]),
          filialIds,
        ]),
      ),
    );
  }
}
