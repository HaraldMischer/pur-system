// pur-system/src/app/pages/schichtplan/schichtmodelle-page/schichtmodelle-page.ts

import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  viewChildren,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { firstValueFrom } from 'rxjs';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { SchichtmodelleFiliale } from '../../../components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale';
import { BestaetigungDialog } from '../../../components/shared/bestaetigung-dialog/bestaetigung-dialog';
import { PageRouteTitleDirective } from '../../../directives/page-route-title.directive';

type TSchichtmodelleFilialauswahl = {
  readonly filiale: IFilialeEintrag;
  readonly pfad: IFilialPfad;
};

@Component({
  selector: 'app-schichtmodelle-page',
  imports: [MatToolbarModule, SchichtmodelleFiliale, PageRouteTitleDirective],
  templateUrl: './schichtmodelle-page.html',
  styleUrl: './schichtmodelle-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtmodellePage {
  // ===== Interne Dependency Injection =========

  readonly appKontextStore = inject(AppKontextStore);
  private readonly dialog = inject(MatDialog);

  // ===== View Queries =========================

  private readonly filialbereiche = viewChildren(SchichtmodelleFiliale);

  // ===== Öffentliche Ableitungen ==============

  readonly filialauswahl = computed<readonly TSchichtmodelleFilialauswahl[]>(() => {
    const unternehmer = this.appKontextStore.selectedUnternehmer();
    const firma = this.appKontextStore.selectedFirma();
    if (!unternehmer || !firma) return [];
    return this.appKontextStore.selectedFilialen().map((filiale) => {
      return {
        filiale,
        pfad: {
          unternehmerId: unternehmer.id,
          firmaId: firma.id,
          filialeId: filiale.id,
        },
      };
    });
  });
  readonly hatUngespeicherteAenderungen = computed(() => {
    return this.filialbereiche().some((bereich) => bereich.hatUngespeicherteAenderungen());
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Verhindert das unbemerkte Verlassen der Seite mit ungespeicherten Änderungen.
   */
  async confirmVerlassen(): Promise<boolean> {
    if (!this.hatUngespeicherteAenderungen()) return true;
    const bestaetigt = await firstValueFrom(
      this.dialog
        .open(BestaetigungDialog, {
          panelClass: ['pur-dialog__panel'],
          data: {
            titel: 'Ungespeicherte Änderungen',
            nachricht: 'Die ungespeicherten Änderungen wirklich verwerfen und die Seite verlassen?',
            bestaetigenText: 'Seite verlassen',
            abbrechenText: 'Weiter bearbeiten',
          },
        })
        .afterClosed(),
    );
    return bestaetigt === true;
  }

  /**
   * Aktiviert die native Browserwarnung beim Neuladen oder Schließen der Seite.
   */
  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hatUngespeicherteAenderungen()) return;
    event.preventDefault();
    event.returnValue = '';
  }
}
