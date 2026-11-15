// pur-system/src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { firstValueFrom } from 'rxjs';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import {
  createSchichtmodellVorlagen,
  type ISchichtmodellVorlage,
} from '../../../commons/utils/dienstplan/schichtmodell-vorlagen';
import { isSchichtmodellGueltig } from '../../../commons/validators/schichtmodell.validator';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { BestaetigungDialog } from '../../shared/bestaetigung-dialog/bestaetigung-dialog';
import { SchichtmodellFormular } from '../schichtmodell-formular/schichtmodell-formular';

@Component({
  selector: 'app-schichtmodelle-filiale',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, SchichtmodellFormular],
  templateUrl: './schichtmodelle-filiale.html',
  styleUrl: './schichtmodelle-filiale.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtmodelleFiliale {
  // ===== Interne Dependency Injection =========

  readonly schichtmodellStore = inject(SchichtmodellStore);
  readonly filialeinstellungStore = inject(FilialeinstellungStore);
  private readonly dialog = inject(MatDialog);

  // ===== Öffentliche API ======================

  readonly filiale = input.required<IFilialeEintrag>();
  readonly pfad = input.required<IFilialPfad>();

  // ===== View Queries =========================

  private readonly formular = viewChild(SchichtmodellFormular);

  // ===== Interner State =======================

  private readonly selectedSchichtmodellId = signal<string | null>(null);
  readonly istNeuanlage = signal(false);
  private readonly formularVersion = signal(0);

  // ===== Interne Ableitungen ==================

  private readonly loadSchichtmodelleEffect = effect(() => {
    const pfad = this.pfad();
    untracked(() => {
      void this.loadSchichtmodelle(pfad);
    });
  });

  // ===== Öffentliche Ableitungen ==============

  readonly schichtmodellKontext = computed(() => {
    return this.schichtmodellStore.getSchichtmodellKontext(this.pfad());
  });
  readonly filialeinstellungKontext = computed(() => {
    return this.filialeinstellungStore.getFilialeinstellungKontext(this.pfad());
  });
  readonly istSchichtmodellBereit = computed(() => {
    return (
      this.schichtmodellKontext()?.isLoaded === true &&
      this.filialeinstellungKontext()?.isLoaded === true &&
      this.filialeinstellungKontext()?.bestand !== null
    );
  });
  readonly vorlagen = computed<readonly ISchichtmodellVorlage[]>(() => {
    const bestand = this.filialeinstellungKontext()?.bestand;
    if (!bestand || bestand.oeffnungszeiten.wochenregeln.sonntag.modus === 'geschlossen') {
      return [];
    }
    return createSchichtmodellVorlagen(bestand.oeffnungszeiten, bestand.sondertage);
  });
  readonly selectedBestand = computed(() => {
    if (this.istNeuanlage()) return undefined;
    const selectedId = this.selectedSchichtmodellId();
    return this.schichtmodellKontext()?.schichtmodelle.find((bestand) => {
      return bestand.schichtmodell.id === selectedId;
    });
  });
  readonly formularTrackKeys = computed<readonly string[]>(() => {
    const modell = this.istNeuanlage()
      ? 'neu'
      : (this.selectedBestand()?.schichtmodell.id ?? 'ohne-auswahl');
    return [`${modell}:${this.formularVersion()}`];
  });
  readonly hatUngespeicherteAenderungen = computed(() => {
    return this.formular()?.hatAenderungen() ?? false;
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt die Schichtmodelle dieser Filiale erneut.
   */
  retryLoad(): void {
    void this.loadSchichtmodelle(this.pfad());
  }

  /**
   * Wechselt nach einer gegebenenfalls erforderlichen Bestätigung zum ausgewählten Modell.
   */
  async selectSchichtmodell(schichtmodellId: string): Promise<void> {
    if (schichtmodellId === this.selectedSchichtmodellId() && !this.istNeuanlage()) return;
    if (!(await this.bestaetigeVerwerfen())) return;
    this.istNeuanlage.set(false);
    this.selectedSchichtmodellId.set(schichtmodellId);
    this.formularVersion.update((version) => version + 1);
  }

  /**
   * Öffnet ein neues Modellformular, sofern kein anderes Modell ungespeichert bearbeitet wird.
   */
  createSchichtmodell(): void {
    if (
      this.vorlagen().length === 0 ||
      this.istNeuanlage() ||
      this.hatUngespeicherteAenderungen()
    ) {
      return;
    }
    this.istNeuanlage.set(true);
    this.formularVersion.update((version) => version + 1);
  }

  /**
   * Übernimmt das gespeicherte Modell als aktuelle Seitenauswahl.
   */
  handleGespeichert(bestand: ISchichtmodellBestand): void {
    this.selectedSchichtmodellId.set(bestand.schichtmodell.id);
    this.istNeuanlage.set(false);
    this.formularVersion.update((version) => version + 1);
  }

  /**
   * Verwirft das aktuelle Formular und stellt den gespeicherten Modellzustand wieder her.
   */
  handleAbgebrochen(): void {
    this.istNeuanlage.set(false);
    this.formularVersion.update((version) => version + 1);
  }

  /**
   * Zeigt an, ob ein Modell vor der nächsten Monatsplananlage angepasst werden muss.
   */
  istAnpassungErforderlich(bestand: ISchichtmodellBestand): boolean {
    return !isSchichtmodellGueltig(bestand, this.vorlagen());
  }

  // ===== Interne Helfer =======================

  private async loadSchichtmodelle(pfad: IFilialPfad): Promise<void> {
    try {
      await Promise.all([
        this.schichtmodellStore.loadSchichtmodelle(pfad),
        this.filialeinstellungStore.loadFilialeinstellung(pfad),
      ]);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung im Filialkontext bereit.
    }
  }

  private async bestaetigeVerwerfen(): Promise<boolean> {
    if (!this.hatUngespeicherteAenderungen()) return true;
    const bestaetigt = await firstValueFrom(
      this.dialog
        .open(BestaetigungDialog, {
          panelClass: ['pur-dialog__panel'],
          data: {
            titel: 'Ungespeicherte Änderungen',
            nachricht: 'Die ungespeicherten Änderungen wirklich verwerfen?',
            bestaetigenText: 'Verwerfen',
            abbrechenText: 'Weiter bearbeiten',
          },
        })
        .afterClosed(),
    );
    return bestaetigt === true;
  }
}
