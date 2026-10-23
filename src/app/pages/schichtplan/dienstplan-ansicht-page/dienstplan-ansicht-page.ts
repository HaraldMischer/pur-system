// pur-system/src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.ts

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { getAktuellerMonat } from '../../../commons/utils/datum/monat';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { MonatSelector } from '../../../components/date-selectors/monat-selector/monat-selector';
import { DienstplanAnsichtsbereich } from '../../../components/schichtplan/dienstplan-ansichtsbereich/dienstplan-ansichtsbereich';
import { PageRouteTitleDirective } from '../../../directives/page-route-title.directive';

// ===== Konstanten & Typen ===================

type TDienstplanFilialauswahl = {
  readonly filiale: IFilialeEintrag;
  readonly pfad: IFilialPfad;
};

@Component({
  selector: 'app-dienstplan-ansicht-page',
  imports: [
    MatButtonModule,
    MatToolbarModule,
    MonatSelector,
    DienstplanAnsichtsbereich,
    PageRouteTitleDirective,
  ],
  templateUrl: './dienstplan-ansicht-page.html',
  styleUrl: './dienstplan-ansicht-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanAnsichtPage {
  // ===== Interne Dependency Injection =========

  private readonly appKontextStore = inject(AppKontextStore);

  // ===== Interner State =======================

  readonly selectedMonat = signal(getAktuellerMonat());

  // ===== Öffentliche Ableitungen ==============

  readonly filialauswahl = computed<readonly TDienstplanFilialauswahl[]>(() => {
    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    if (!unternehmerId || !firmaId) return [];

    return this.appKontextStore.selectedFilialen().map((filiale) => {
      return {
        filiale,
        pfad: { unternehmerId, firmaId, filialeId: filiale.id },
      };
    });
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Wechselt zum aktuellen Kalendermonat.
   */
  setAktuellerMonat(): void {
    this.selectedMonat.set(getAktuellerMonat());
  }
}
