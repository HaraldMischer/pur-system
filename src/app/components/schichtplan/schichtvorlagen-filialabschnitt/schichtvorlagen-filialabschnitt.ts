// pur-system/src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.ts

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
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { ISchichtvorlageEintrag } from '../../../commons/models/domain/schichtvorlage';
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import {
  SchichtvorlageBearbeitenDialog,
  TSchichtvorlageBearbeitenDialogDaten,
} from '../schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog';

@Component({
  selector: 'app-schichtvorlagen-filialabschnitt',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './schichtvorlagen-filialabschnitt.html',
  styleUrl: './schichtvorlagen-filialabschnitt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtvorlagenFilialabschnitt {
  // ===== Interne Dependency Injection =========

  readonly schichtvorlageStore = inject(SchichtvorlageStore);
  private readonly dialog = inject(MatDialog);

  // ===== Öffentliche API ======================

  readonly filiale = input.required<IFilialeEintrag>();
  readonly pfad = input.required<IFilialPfad>();

  // ===== Interne Ableitungen ==================

  private readonly loadSchichtvorlagenEffect = effect(() => {
    const pfad = this.pfad();
    untracked(() => {
      void this.loadSchichtvorlagen(pfad);
    });
  });

  // ===== Öffentliche Ableitungen ==============

  readonly kontext = computed(() => {
    return this.schichtvorlageStore.getSchichtvorlageKontext(this.pfad());
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt die Schichtvorlagen dieser Filiale erneut.
   */
  retryLoad(): void {
    void this.loadSchichtvorlagen(this.pfad());
  }

  /**
   * Öffnet den Dialog zum Anlegen oder Bearbeiten einer Vorlage dieser Filiale.
   *
   * @param schichtvorlage - Optional ausgewählte Schichtvorlage.
   */
  openSchichtvorlageDialog(schichtvorlage?: ISchichtvorlageEintrag): void {
    const daten: TSchichtvorlageBearbeitenDialogDaten = {
      pfad: this.pfad(),
      ...(schichtvorlage ? { schichtvorlage } : {}),
    };
    this.dialog.open(SchichtvorlageBearbeitenDialog, {
      data: daten,
      panelClass: ['pur-dialog__panel'],
    });
  }

  // ===== Interne Helfer =======================

  private async loadSchichtvorlagen(pfad: IFilialPfad): Promise<void> {
    try {
      await this.schichtvorlageStore.loadSchichtvorlagen(pfad);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung im Filialkontext bereit.
    }
  }
}
