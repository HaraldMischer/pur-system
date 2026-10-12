// pur-system/src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.ts

import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { getAktuellerMonat } from '../../../commons/utils/datum/monat';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { MonatSelector } from '../../date-selectors/monat-selector/monat-selector';
import { DienstplanFilialabschnitt } from '../dienstplan-filialabschnitt/dienstplan-filialabschnitt';

// ===== Konstanten & Typen ===================
type TDienstplanFilialauswahl = {
  readonly filiale: IFilialeEintrag;
  readonly pfad: IFilialPfad;
};

@Component({
  selector: 'app-dienstplan-arbeitsbereich',
  imports: [MatButtonModule, MonatSelector, DienstplanFilialabschnitt],
  templateUrl: './dienstplan-arbeitsbereich.html',
  styleUrl: './dienstplan-arbeitsbereich.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanArbeitsbereich {
  // ===== Interne Dependency Injection =========
  readonly appKontextStore = inject(AppKontextStore);

  // ===== Öffentliche API ======================
  readonly planungsmodus = input(false);

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
