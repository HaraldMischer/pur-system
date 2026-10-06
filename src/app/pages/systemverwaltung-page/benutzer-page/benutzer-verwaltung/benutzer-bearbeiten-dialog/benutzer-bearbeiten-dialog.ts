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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { DatenzugriffSelector } from '../../../../../components/data-selectors/datenzugriff-selector/datenzugriff-selector';
import {
  IBenutzerProfilAktualisierung,
  IBenutzerProfilEintrag,
  TBenutzerZugriffe,
} from '../../../../../commons/models/domain/benutzer';
import { IUnternehmerAuswahl } from '../../../../../commons/models/domain/datenzugriff';
import { IMitarbeiterAuswahl } from '../../../../../commons/models/domain/mitarbeiter';
import {
  buildErlaubteBereiche,
  getWaehlbareAppBereiche,
  TWaehlbarerAppBereich,
} from '../../../../../commons/utils/benutzer/erlaubte-bereiche';
import { getFirebaseErrorMessage } from '../../../../../commons/utils/errors/firebase-error-message';
import { nichtLeerValidator } from '../../../../../commons/validators/nicht-leer.validator';
import { AuthService } from '../../../../../services/firebase/auth.service';
import { BenutzerVerwaltungService } from '../../../../../services/firebase/benutzer-verwaltung.service';
import { StammdatenStore } from '../../../../../stores/app/stammdaten.store';
import { BenutzerVerwaltungStore } from '../../../../../stores/domain/benutzer-verwaltung.store';
import { MitarbeiterStore } from '../../../../../stores/domain/mitarbeiter.store';

// ===== Top-Level Helper =====================

type TErlaubteBereicheForm = { [K in TWaehlbarerAppBereich]: FormControl<boolean> };
type TMitarbeiterZuordnungForm = {
  unternehmerId: FormControl<string>;
  firmaId: FormControl<string>;
  firmaMitarbeiterId: FormControl<string>;
};
type TMitarbeiterZuordnung = {
  unternehmer: string;
  firma: string;
  mitarbeiter: string;
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
    MatSelectModule,
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
  private readonly mitarbeiterStore = inject(MitarbeiterStore);
  private readonly benutzerVerwaltungService = inject(BenutzerVerwaltungService);
  readonly verwaltungStore = inject(BenutzerVerwaltungStore);

  // ===== Interner State =======================

  private urspruenglicherDatenwert = '';
  private mitarbeiterAuswahlGeneration = 0;

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
  readonly mitarbeiterZuordnung = computed<TMitarbeiterZuordnung | null>(() => {
    if (this.profil.userRole !== 'mitarbeiter') return null;

    const [unternehmerEintrag] = Object.entries(this.profil.zugriffe);
    const unternehmerId = unternehmerEintrag?.[0] ?? '';
    const [firmaId = ''] = Object.keys(unternehmerEintrag?.[1] ?? {});
    const mitarbeiterId = this.profil.firmaMitarbeiterId ?? '';
    const unternehmer = this.unternehmer().find((eintrag) => eintrag.id === unternehmerId);
    const firma = unternehmer?.firmen.find((eintrag) => eintrag.id === firmaId);
    const mitarbeiter = this.mitarbeiterStore
      .getMitarbeiter(unternehmerId, firmaId)
      .find((eintrag) => eintrag.id === mitarbeiterId);

    return {
      unternehmer: unternehmer?.anzeigename ?? this.getNichtVerfuegbarWert(unternehmerId),
      firma: firma?.anzeigename ?? this.getNichtVerfuegbarWert(firmaId),
      mitarbeiter: mitarbeiter
        ? `${mitarbeiter.person.vorname} ${mitarbeiter.person.nachname}`.trim()
        : this.getNichtVerfuegbarWert(mitarbeiterId),
    };
  });
  readonly unternehmerIds = signal<readonly string[]>(Object.keys(this.profil.zugriffe));
  readonly firmaIds = signal<readonly string[]>(this.getFirmaIds(this.profil.zugriffe));
  readonly filialen = signal<Readonly<Partial<Record<string, readonly string[]>>>>(
    this.getFilialen(this.profil.zugriffe),
  );
  readonly hatAenderungen = signal(false);
  readonly zuordnungBearbeiten = signal(false);
  readonly loeschenBestaetigen = signal(false);
  readonly mitarbeiterAuswahl = signal<readonly IMitarbeiterAuswahl[]>([]);
  readonly mitarbeiterAuswahlDownload = signal(false);
  readonly mitarbeiterAuswahlError = signal<string | null>(null);
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
  readonly mitarbeiterZuordnungForm = new FormGroup<TMitarbeiterZuordnungForm>({
    unternehmerId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    firmaId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    firmaMitarbeiterId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
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
      this.unternehmerIds();
      this.firmaIds();
      this.filialen();
      untracked(() => {
        this.updateFormStatus();
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

  /**
   * Öffnet die Auswahl für eine neue fachliche Mitarbeiterzuordnung.
   */
  startMitarbeiterZuordnung(): void {
    this.loeschenBestaetigen.set(false);
    this.zuordnungBearbeiten.set(true);
    this.mitarbeiterAuswahlGeneration++;
    this.mitarbeiterAuswahl.set([]);
    this.mitarbeiterAuswahlError.set(null);
    this.mitarbeiterZuordnungForm.reset({
      unternehmerId: '',
      firmaId: '',
      firmaMitarbeiterId: '',
    });
  }

  /**
   * Bricht die begonnene Neuzuordnung ab und verwirft die Auswahl.
   */
  cancelMitarbeiterZuordnung(): void {
    this.zuordnungBearbeiten.set(false);
    this.mitarbeiterAuswahlGeneration++;
    this.mitarbeiterAuswahl.set([]);
    this.mitarbeiterAuswahlDownload.set(false);
    this.mitarbeiterAuswahlError.set(null);
  }

  /**
   * Verwirft abhängige Firmen- und Mitarbeiterauswahlen nach einem Unternehmerwechsel.
   */
  handleZuordnungUnternehmerChange(): void {
    this.mitarbeiterAuswahlGeneration++;
    this.mitarbeiterZuordnungForm.controls.firmaId.setValue('');
    this.mitarbeiterZuordnungForm.controls.firmaMitarbeiterId.setValue('');
    this.mitarbeiterAuswahl.set([]);
    this.mitarbeiterAuswahlDownload.set(false);
    this.mitarbeiterAuswahlError.set(null);
  }

  /**
   * Liefert die Firmen des für die Neuzuordnung ausgewählten Unternehmers.
   *
   * @returns Die aktuell auswählbaren Firmen.
   */
  getZuordnungsFirmen(): IUnternehmerAuswahl['firmen'] {
    const unternehmerId = this.mitarbeiterZuordnungForm.controls.unternehmerId.value;
    return this.unternehmer().find((eintrag) => eintrag.id === unternehmerId)?.firmen ?? [];
  }

  /**
   * Lädt nach einem Firmenwechsel die aktiven, noch nicht verknüpften Mitarbeiter.
   */
  async handleZuordnungFirmaChange(): Promise<void> {
    const unternehmerId = this.mitarbeiterZuordnungForm.controls.unternehmerId.value;
    const firmaId = this.mitarbeiterZuordnungForm.controls.firmaId.value;
    this.mitarbeiterZuordnungForm.controls.firmaMitarbeiterId.setValue('');
    this.mitarbeiterAuswahl.set([]);
    this.mitarbeiterAuswahlError.set(null);
    const generation = ++this.mitarbeiterAuswahlGeneration;
    if (!unternehmerId || !firmaId) {
      this.mitarbeiterAuswahlDownload.set(false);
      return;
    }

    this.mitarbeiterAuswahlDownload.set(true);
    try {
      const mitarbeiter = await this.benutzerVerwaltungService.loadMitarbeiterAuswahl({
        unternehmerId,
        firmaId,
      });
      if (generation === this.mitarbeiterAuswahlGeneration) {
        this.mitarbeiterAuswahl.set(mitarbeiter);
      }
    } catch (error: unknown) {
      if (generation === this.mitarbeiterAuswahlGeneration) {
        this.mitarbeiterAuswahlError.set(getFirebaseErrorMessage(error));
      }
    } finally {
      if (generation === this.mitarbeiterAuswahlGeneration) {
        this.mitarbeiterAuswahlDownload.set(false);
      }
    }
  }

  /**
   * Speichert die ausgewählte neue Mitarbeiterzuordnung serverseitig.
   */
  async saveMitarbeiterZuordnung(): Promise<void> {
    if (this.mitarbeiterZuordnungForm.invalid || this.verwaltungStore.inProgress()) {
      this.mitarbeiterZuordnungForm.markAllAsTouched();
      return;
    }

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.verwaltungStore.updateMitarbeiterZuordnung(
        this.mitarbeiterZuordnungForm.getRawValue(),
      );
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
    this.cancelMitarbeiterZuordnung();
    this.loeschenBestaetigen.set(true);
  }

  /**
   * Löscht das ausgewählte Mitarbeiterkonto nach bestätigter Sicherheitsabfrage.
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
      this.mitarbeiterZuordnungForm.disable({ emitEvent: false });
      return;
    }

    this.benutzerForm.enable({ emitEvent: false });
    this.mitarbeiterZuordnungForm.enable({ emitEvent: false });
    if (this.istEigenesProfil) {
      this.benutzerForm.controls.aktiv.disable({ emitEvent: false });
    }
  }

  private getNichtVerfuegbarWert(id: string): string {
    return id ? `Nicht verfügbar (ID: ${id})` : 'Nicht verfügbar';
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
