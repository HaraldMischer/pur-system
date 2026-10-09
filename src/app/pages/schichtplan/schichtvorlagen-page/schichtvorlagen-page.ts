// pur-system/src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { ISchichtvorlageEintrag } from '../../../commons/models/domain/schichtvorlage';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import {
  SchichtvorlageBearbeitenDialog,
  TSchichtvorlageBearbeitenDialogDaten,
} from '../../../components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog';

@Component({
  selector: 'app-schichtvorlagen-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './schichtvorlagen-page.html',
  styleUrl: './schichtvorlagen-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtvorlagenPage {
  // ===== Interne Dependency Injection =========
  private readonly dialog = inject(MatDialog);
  readonly appKontextStore = inject(AppKontextStore);
  readonly schichtvorlageStore = inject(SchichtvorlageStore);

  // ===== Öffentliche Ableitungen ==============
  readonly filialPfad = computed<IFilialPfad | null>(() => {
    const unternehmer = this.appKontextStore.selectedUnternehmer();
    const firma = this.appKontextStore.selectedFirma();
    const filiale = this.appKontextStore.selectedFiliale();
    if (!unternehmer || !firma || !filiale) return null;
    return {
      unternehmerId: unternehmer.id,
      firmaId: firma.id,
      filialeId: filiale.id,
    };
  });

  constructor() {
    effect(() => {
      const pfad = this.filialPfad();
      untracked(() => {
        if (pfad) {
          void this.loadSchichtvorlagen(pfad);
        } else {
          this.schichtvorlageStore.resetSchichtvorlagen();
        }
      });
    });
  }

  // ===== Öffentliche Aktionen =================
  /**
   * Lädt die Schichtvorlagen der ausgewählten Filiale erneut.
   */
  retryLoad(): void {
    const pfad = this.filialPfad();
    if (!pfad) return;
    void this.loadSchichtvorlagen(pfad);
  }

  /**
   * Öffnet den Dialog zum Anlegen oder Bearbeiten einer Schichtvorlage.
   *
   * @param schichtvorlage - Optional ausgewählte Schichtvorlage.
   */
  openSchichtvorlageDialog(schichtvorlage?: ISchichtvorlageEintrag): void {
    const pfad = this.filialPfad();
    if (!pfad) return;
    const daten: TSchichtvorlageBearbeitenDialogDaten = { pfad, schichtvorlage };
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
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    }
  }
}
