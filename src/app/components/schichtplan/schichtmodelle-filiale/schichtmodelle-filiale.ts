// pur-system/src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.ts

import {
  ChangeDetectionStrategy,
  Component,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import {
  IModellschichtZeitgrenze,
  ISchichtrastermodellBestand,
  ISchichttagesmodellBestand,
  TPlanungsart,
} from '../../../commons/models/domain/schichtmodell';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { SchichtTagesmodellStore } from '../../../stores/domain/schicht-tagesmodell.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import {
  SchichtTagesmodellBearbeitenDialog,
  TSchichtTagesmodellBearbeitenDialogDaten,
} from '../schicht-tagesmodell-bearbeiten-dialog/schicht-tagesmodell-bearbeiten-dialog';
import {
  SchichtRastermodellBearbeitenDialog,
  TSchichtRastermodellBearbeitenDialogDaten,
} from '../schicht-rastermodell-bearbeiten-dialog/schicht-rastermodell-bearbeiten-dialog';

@Component({
  selector: 'app-schichtmodelle-filiale',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './schichtmodelle-filiale.html',
  styleUrl: './schichtmodelle-filiale.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtmodelleFiliale {
  // ===== Interne Dependency Injection =========

  readonly schichtmodellStore = inject(SchichtmodellStore);
  readonly schichtTagesmodellStore = inject(SchichtTagesmodellStore);
  readonly filialeinstellungStore = inject(FilialeinstellungStore);
  private readonly dialog = inject(MatDialog);

  // ===== Öffentliche API ======================

  readonly filiale = input.required<IFilialeEintrag>();
  readonly pfad = input.required<IFilialPfad>();

  // ===== Interner State =======================

  private readonly selectedSchichtrastermodellId = signal<string | null>(null);
  private readonly selectedSchichtTagesmodellId = signal<string | null>(null);

  // ===== Interne Ableitungen ==================

  private readonly loadSchichtmodelleEffect = effect(() => {
    const pfad = this.pfad();
    untracked(() => {
      void this.loadSchichtmodelle(pfad);
    });
  });
  private readonly selectedSchichtrastermodellEffect = effect(() => {
    this.updateSelectedModellId(
      this.kontext()?.schichtmodelle ?? [],
      this.selectedSchichtrastermodellId,
    );
  });
  private readonly selectedSchichtTagesmodellEffect = effect(() => {
    this.updateSelectedModellId(
      this.tagesmodellKontext()?.schichttagesmodelle ?? [],
      this.selectedSchichtTagesmodellId,
    );
  });

  // ===== Öffentliche Werte ====================

  readonly selectedPlanungsart = signal<TPlanungsart>('schichtrastermodell');

  // ===== Öffentliche Ableitungen ==============

  readonly kontext = computed(() => {
    return this.schichtmodellStore.getSchichtmodellKontext(this.pfad());
  });
  readonly tagesmodellKontext = computed(() => {
    return this.schichtTagesmodellStore.getSchichtTagesmodellKontext(this.pfad());
  });
  readonly filialeinstellungKontext = computed(() => {
    return this.filialeinstellungStore.getFilialeinstellungKontext(this.pfad());
  });
  readonly istSchichtrastermodellBereit = computed(() => {
    return (
      this.kontext()?.isLoaded === true &&
      this.filialeinstellungKontext()?.isLoaded === true &&
      this.filialeinstellungKontext()?.bestand !== null
    );
  });
  readonly istSchichtTagesmodellBereit = computed(() => {
    return (
      this.tagesmodellKontext()?.isLoaded === true &&
      this.filialeinstellungKontext()?.isLoaded === true &&
      this.filialeinstellungKontext()?.bestand !== null
    );
  });
  readonly selectedSchichtrastermodell = computed(() => {
    const selectedId = this.selectedSchichtrastermodellId();
    return (
      this.kontext()?.schichtmodelle.find((bestand) => {
        return bestand.schichtmodell.id === selectedId;
      }) ?? null
    );
  });
  readonly selectedSchichtTagesmodell = computed(() => {
    const selectedId = this.selectedSchichtTagesmodellId();
    return (
      this.tagesmodellKontext()?.schichttagesmodelle.find((bestand) => {
        return bestand.schichtmodell.id === selectedId;
      }) ?? null
    );
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt die Schichtmodelle dieser Filiale erneut.
   */
  retryLoad(): void {
    void this.loadSchichtmodelle(this.pfad());
  }

  /**
   * Wählt die anzuzeigende Modellart aus.
   *
   * @param planungsart - Ausgewählte Planungsart.
   */
  selectPlanungsart(planungsart: TPlanungsart): void {
    this.selectedPlanungsart.set(planungsart);
  }

  /**
   * Wählt das anzuzeigende Schicht-Rastermodell aus.
   *
   * @param schichtmodellId - ID des ausgewählten Schicht-Rastermodells.
   */
  selectSchichtrastermodell(schichtmodellId: string): void {
    this.selectedSchichtrastermodellId.set(schichtmodellId);
  }

  /**
   * Wählt das anzuzeigende Schicht-Tagesmodell aus.
   *
   * @param schichtmodellId - ID des ausgewählten Schicht-Tagesmodells.
   */
  selectSchichtTagesmodell(schichtmodellId: string): void {
    this.selectedSchichtTagesmodellId.set(schichtmodellId);
  }

  /**
   * Formatiert eine feste Modellschichtgrenze oder kennzeichnet eine tagesabhängige Außengrenze.
   *
   * @param zeitgrenze - Optional gespeicherte feste Zeitgrenze.
   * @returns Verständliche Darstellung der Zeitgrenze.
   */
  formatZeitgrenze(zeitgrenze?: IModellschichtZeitgrenze): string {
    if (!zeitgrenze) return 'Tagesabhängig';
    return `${zeitgrenze.lokalzeit} Uhr${zeitgrenze.tag === 'folgetag' ? ' (Folgetag)' : ''}`;
  }

  /**
   * Öffnet den Dialog zum Anlegen oder Bearbeiten eines Schichtmodells.
   *
   * @param bestand - Optional ausgewählter Modellbestand.
   */
  openSchichtrastermodellDialog(bestand?: ISchichtrastermodellBestand): void {
    const standardoeffnungsregel =
      this.filialeinstellungKontext()?.bestand?.oeffnungszeiten.standardoeffnungsregel;
    if (!standardoeffnungsregel) return;
    const daten: TSchichtRastermodellBearbeitenDialogDaten = {
      pfad: this.pfad(),
      standardoeffnungsregel,
      ...(bestand ? { bestand } : {}),
    };
    this.dialog.open(SchichtRastermodellBearbeitenDialog, {
      data: daten,
      panelClass: ['pur-dialog__panel', 'pur-dialog__panel--large'],
    });
  }

  /**
   * Öffnet den Dialog zum Anlegen oder Bearbeiten eines Schicht-Tagesmodells.
   *
   * @param bestand - Optional ausgewählter Tagesmodellbestand.
   */
  openSchichtTagesmodellDialog(bestand?: ISchichttagesmodellBestand): void {
    const oeffnungszeiten = this.filialeinstellungKontext()?.bestand?.oeffnungszeiten;
    if (!oeffnungszeiten) return;
    const sonntagsregel = oeffnungszeiten.wochenregeln.sonntag;
    if (sonntagsregel.modus === 'geschlossen') return;
    const sonntag =
      sonntagsregel.modus === 'abweichend'
        ? sonntagsregel.oeffnungsregel
        : oeffnungszeiten.standardoeffnungsregel;
    const daten: TSchichtTagesmodellBearbeitenDialogDaten = {
      pfad: this.pfad(),
      oeffnungen: {
        wochentag: oeffnungszeiten.standardoeffnungsregel,
        sonntag,
      },
      ...(bestand ? { bestand } : {}),
    };
    this.dialog.open(SchichtTagesmodellBearbeitenDialog, {
      data: daten,
      panelClass: ['pur-dialog__panel', 'pur-dialog__panel--large'],
    });
  }

  // ===== Interne Helfer =======================

  private async loadSchichtmodelle(pfad: IFilialPfad): Promise<void> {
    try {
      await Promise.all([
        this.schichtmodellStore.loadSchichtmodelle(pfad),
        this.schichtTagesmodellStore.loadSchichtTagesmodelle(pfad),
        this.filialeinstellungStore.loadFilialeinstellung(pfad),
      ]);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung im Filialkontext bereit.
    }
  }

  private updateSelectedModellId(
    bestaende: readonly (ISchichtrastermodellBestand | ISchichttagesmodellBestand)[],
    selectedId: WritableSignal<string | null>,
  ): void {
    const aktuelleId = selectedId();
    if (
      aktuelleId &&
      bestaende.some((bestand) => {
        return bestand.schichtmodell.id === aktuelleId;
      })
    ) {
      return;
    }
    const vorauswahl =
      bestaende.find((bestand) => {
        return bestand.schichtmodell.aktiv;
      }) ?? bestaende[0];
    selectedId.set(vorauswahl?.schichtmodell.id ?? null);
  }
}
