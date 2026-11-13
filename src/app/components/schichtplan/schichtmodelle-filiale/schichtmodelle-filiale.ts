// pur-system/src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import {
  SchichtmodellBearbeitenDialog,
  TSchichtmodellBearbeitenDialogDaten,
} from '../schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog';

@Component({
  selector: 'app-schichtmodelle-filiale',
  imports: [MatButtonModule, MatIconModule],
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

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt die Schichtmodelle dieser Filiale erneut.
   */
  retryLoad(): void {
    void this.loadSchichtmodelle(this.pfad());
  }

  /**
   * Öffnet den Dialog zum Anlegen oder Bearbeiten eines Schichtmodells.
   *
   * @param bestand - Optional ausgewählter Schichtmodellbestand.
   */
  openSchichtmodellDialog(bestand?: ISchichtmodellBestand): void {
    const oeffnungszeiten = this.filialeinstellungKontext()?.bestand?.oeffnungszeiten;
    if (!oeffnungszeiten) return;
    const sonntagsregel = oeffnungszeiten.wochenregeln.sonntag;
    if (sonntagsregel.modus === 'geschlossen') return;
    const sonntag =
      sonntagsregel.modus === 'abweichend'
        ? sonntagsregel.oeffnungsregel
        : oeffnungszeiten.standardoeffnungsregel;
    const daten: TSchichtmodellBearbeitenDialogDaten = {
      pfad: this.pfad(),
      oeffnungen: {
        wochentag: oeffnungszeiten.standardoeffnungsregel,
        sonntag,
      },
      ...(bestand ? { bestand } : {}),
    };
    this.dialog.open(SchichtmodellBearbeitenDialog, {
      data: daten,
      panelClass: ['pur-dialog__panel', 'pur-dialog__panel--large'],
    });
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
}
