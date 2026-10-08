// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-datenzuordnung-dialog/benutzer-mitarbeiterzuordnung/benutzer-mitarbeiterzuordnung.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  IBenutzerMitarbeiterZuordnung,
  IBenutzerProfilEintrag,
} from '../../../../../../commons/models/domain/benutzer';
import { IUnternehmerAuswahl } from '../../../../../../commons/models/domain/datenzugriff';
import { IMitarbeiterAuswahl } from '../../../../../../commons/models/domain/mitarbeiter';
import { getFirebaseErrorMessage } from '../../../../../../commons/utils/errors/firebase-error-message';
import { BenutzerVerwaltungService } from '../../../../../../services/firebase/benutzer-verwaltung.service';
import { MitarbeiterStore } from '../../../../../../stores/domain/mitarbeiter.store';

// ===== Konstanten & Typen ===================

type TMitarbeiterZuordnungForm = {
  unternehmerId: FormControl<string>;
  firmaId: FormControl<string>;
  firmaMitarbeiterId: FormControl<string>;
};

@Component({
  selector: 'app-benutzer-mitarbeiterzuordnung',
  imports: [MatFormFieldModule, MatSelectModule, ReactiveFormsModule],
  templateUrl: './benutzer-mitarbeiterzuordnung.html',
  styleUrl: './benutzer-mitarbeiterzuordnung.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerMitarbeiterzuordnung {
  // ===== Interne Dependency Injection =========

  private readonly benutzerVerwaltungService = inject(BenutzerVerwaltungService);
  private readonly mitarbeiterStore = inject(MitarbeiterStore);

  // ===== Öffentliche API ======================

  readonly profil = input.required<IBenutzerProfilEintrag>();
  readonly unternehmer = input.required<readonly IUnternehmerAuswahl[]>();
  readonly inProgress = input(false);
  readonly zuordnungSpeichern = output<IBenutzerMitarbeiterZuordnung>();

  // ===== Interner State =======================

  private mitarbeiterAuswahlGeneration = 0;
  private urspruenglicherDatenwert = '';

  // ===== Öffentliche Werte ====================

  readonly mitarbeiterAuswahl = signal<readonly IMitarbeiterAuswahl[]>([]);
  readonly mitarbeiterAuswahlDownload = signal(false);
  readonly mitarbeiterAuswahlError = signal<string | null>(null);
  readonly hatAenderungen = signal(false);
  readonly zuordnungForm = new FormGroup<TMitarbeiterZuordnungForm>({
    unternehmerId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    firmaId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    firmaMitarbeiterId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // ===== Öffentliche Ableitungen ==============

  readonly speichernDeaktiviert = computed(() => {
    return (
      this.zuordnungForm.invalid ||
      !this.hatAenderungen() ||
      this.mitarbeiterAuswahlDownload() ||
      this.inProgress()
    );
  });

  constructor() {
    this.zuordnungForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updateAenderungsstatus();
    });
    effect(() => {
      const profil = this.profil();
      untracked(() => {
        this.initialisiereZuordnung(profil);
      });
    });
    effect(() => {
      if (this.inProgress()) {
        this.zuordnungForm.disable({ emitEvent: false });
      } else {
        this.zuordnungForm.enable({ emitEvent: false });
      }
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Verwirft abhängige Firmen- und Mitarbeiterauswahlen nach einem Unternehmerwechsel.
   */
  handleUnternehmerChange(): void {
    this.mitarbeiterAuswahlGeneration++;
    this.zuordnungForm.controls.firmaId.setValue('');
    this.zuordnungForm.controls.firmaMitarbeiterId.setValue('');
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
    const unternehmerId = this.zuordnungForm.controls.unternehmerId.value;
    return this.unternehmer().find((eintrag) => eintrag.id === unternehmerId)?.firmen ?? [];
  }

  /**
   * Lädt nach einem Firmenwechsel die aktiven, noch nicht verknüpften Mitarbeiter.
   */
  async handleFirmaChange(): Promise<void> {
    const unternehmerId = this.zuordnungForm.controls.unternehmerId.value;
    const firmaId = this.zuordnungForm.controls.firmaId.value;
    this.zuordnungForm.controls.firmaMitarbeiterId.setValue('');
    this.mitarbeiterAuswahl.set([]);
    this.mitarbeiterAuswahlError.set(null);
    if (!unternehmerId || !firmaId) {
      this.mitarbeiterAuswahlDownload.set(false);
      return;
    }
    await this.loadMitarbeiterAuswahl(unternehmerId, firmaId);
  }

  /**
   * Gibt die vollständige neue Mitarbeiterzuordnung an den Bearbeitungsdialog weiter.
   */
  saveZuordnung(): void {
    if (this.speichernDeaktiviert()) {
      this.zuordnungForm.markAllAsTouched();
      return;
    }

    this.zuordnungSpeichern.emit(this.zuordnungForm.getRawValue());
  }

  // ===== Interne Helfer =======================

  private initialisiereZuordnung(profil: IBenutzerProfilEintrag): void {
    const [unternehmerEintrag] = Object.entries(profil.zugriffe);
    const unternehmerId = unternehmerEintrag?.[0] ?? '';
    const [firmaId = ''] = Object.keys(unternehmerEintrag?.[1] ?? {});
    const firmaMitarbeiterId = profil.firmaMitarbeiterId ?? '';
    const zuordnung = { unternehmerId, firmaId, firmaMitarbeiterId };

    this.mitarbeiterAuswahlGeneration++;
    this.mitarbeiterAuswahl.set(
      this.getAktuelleMitarbeiterAuswahl(unternehmerId, firmaId, firmaMitarbeiterId),
    );
    this.mitarbeiterAuswahlError.set(null);
    this.zuordnungForm.reset(zuordnung, { emitEvent: false });
    this.urspruenglicherDatenwert = JSON.stringify(zuordnung);
    this.updateAenderungsstatus();
    if (unternehmerId && firmaId) {
      void this.loadMitarbeiterAuswahl(unternehmerId, firmaId, firmaMitarbeiterId);
    }
  }

  private async loadMitarbeiterAuswahl(
    unternehmerId: string,
    firmaId: string,
    aktuellerMitarbeiterId = '',
  ): Promise<void> {
    const generation = ++this.mitarbeiterAuswahlGeneration;
    const aktuelleAuswahl = this.getAktuelleMitarbeiterAuswahl(
      unternehmerId,
      firmaId,
      aktuellerMitarbeiterId,
    );
    this.mitarbeiterAuswahl.set(aktuelleAuswahl);
    this.mitarbeiterAuswahlDownload.set(true);
    try {
      const mitarbeiter = await this.benutzerVerwaltungService.loadMitarbeiterAuswahl({
        unternehmerId,
        firmaId,
      });
      if (generation === this.mitarbeiterAuswahlGeneration) {
        this.mitarbeiterAuswahl.set([
          ...aktuelleAuswahl,
          ...mitarbeiter.filter((eintrag) => {
            return !aktuelleAuswahl.some((aktuell) => aktuell.id === eintrag.id);
          }),
        ]);
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

  private getAktuelleMitarbeiterAuswahl(
    unternehmerId: string,
    firmaId: string,
    mitarbeiterId: string,
  ): readonly IMitarbeiterAuswahl[] {
    if (!mitarbeiterId) return [];
    const mitarbeiter = this.mitarbeiterStore
      .getMitarbeiter(unternehmerId, firmaId)
      .find((eintrag) => eintrag.id === mitarbeiterId);
    return [
      {
        id: mitarbeiterId,
        anzeigename: mitarbeiter
          ? `${mitarbeiter.person.vorname} ${mitarbeiter.person.nachname}`.trim()
          : `Nicht verfügbar (ID: ${mitarbeiterId})`,
      },
    ];
  }

  private updateAenderungsstatus(): void {
    this.hatAenderungen.set(
      JSON.stringify(this.zuordnungForm.getRawValue()) !== this.urspruenglicherDatenwert,
    );
  }
}
