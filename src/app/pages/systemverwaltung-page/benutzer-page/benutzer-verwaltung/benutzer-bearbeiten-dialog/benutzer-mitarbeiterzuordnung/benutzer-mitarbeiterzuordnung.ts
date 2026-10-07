// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-mitarbeiterzuordnung/benutzer-mitarbeiterzuordnung.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
type TMitarbeiterZuordnungAnzeige = {
  unternehmer: string;
  firma: string;
  mitarbeiter: string;
};

@Component({
  selector: 'app-benutzer-mitarbeiterzuordnung',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
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
  readonly aktionAktivChange = output<boolean>();
  readonly zuordnungSpeichern = output<IBenutzerMitarbeiterZuordnung>();

  // ===== Interner State =======================

  private mitarbeiterAuswahlGeneration = 0;

  // ===== Öffentliche Werte ====================

  readonly zuordnungBearbeiten = signal(false);
  readonly mitarbeiterAuswahl = signal<readonly IMitarbeiterAuswahl[]>([]);
  readonly mitarbeiterAuswahlDownload = signal(false);
  readonly mitarbeiterAuswahlError = signal<string | null>(null);
  readonly zuordnungForm = new FormGroup<TMitarbeiterZuordnungForm>({
    unternehmerId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    firmaId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    firmaMitarbeiterId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // ===== Öffentliche Ableitungen ==============

  readonly aktuelleZuordnung = computed<TMitarbeiterZuordnungAnzeige>(() => {
    const profil = this.profil();
    const [unternehmerEintrag] = Object.entries(profil.zugriffe);
    const unternehmerId = unternehmerEintrag?.[0] ?? '';
    const [firmaId = ''] = Object.keys(unternehmerEintrag?.[1] ?? {});
    const mitarbeiterId = profil.firmaMitarbeiterId ?? '';
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

  constructor() {
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
   * Öffnet die Auswahl für eine neue fachliche Mitarbeiterzuordnung.
   */
  startZuordnungBearbeiten(): void {
    this.zuordnungBearbeiten.set(true);
    this.aktionAktivChange.emit(true);
    this.mitarbeiterAuswahlGeneration++;
    this.mitarbeiterAuswahl.set([]);
    this.mitarbeiterAuswahlError.set(null);
    this.zuordnungForm.reset({
      unternehmerId: '',
      firmaId: '',
      firmaMitarbeiterId: '',
    });
  }

  /**
   * Bricht die begonnene Neuzuordnung ab und verwirft die Auswahl.
   */
  cancelZuordnung(): void {
    this.zuordnungBearbeiten.set(false);
    this.aktionAktivChange.emit(false);
    this.mitarbeiterAuswahlGeneration++;
    this.mitarbeiterAuswahl.set([]);
    this.mitarbeiterAuswahlDownload.set(false);
    this.mitarbeiterAuswahlError.set(null);
  }

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
   * Gibt die vollständige neue Mitarbeiterzuordnung an den Bearbeitungsdialog weiter.
   */
  saveZuordnung(): void {
    if (this.zuordnungForm.invalid || this.inProgress()) {
      this.zuordnungForm.markAllAsTouched();
      return;
    }

    this.zuordnungSpeichern.emit(this.zuordnungForm.getRawValue());
  }

  // ===== Interne Helfer =======================

  private getNichtVerfuegbarWert(id: string): string {
    return id ? `Nicht verfügbar (ID: ${id})` : 'Nicht verfügbar';
  }
}
