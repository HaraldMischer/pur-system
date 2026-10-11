// pur-system/src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.ts

import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { DienstplanFilialabschnitt } from '../dienstplan-filialabschnitt/dienstplan-filialabschnitt';

// ===== Konstanten & Typen ===================

type TDienstplanFilialauswahl = {
  readonly filiale: IFilialeEintrag;
  readonly pfad: IFilialPfad;
};

@Component({
  selector: 'app-dienstplan-arbeitsbereich',
  imports: [MatButtonModule, MatIconModule, DienstplanFilialabschnitt],
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
  readonly monatsbezeichnung = computed(() => {
    const [jahr, monat] = this.selectedMonat().split('-').map(Number);
    return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(
      new Date(Date.UTC(jahr, monat - 1, 1)),
    );
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Wechselt relativ zum ausgewählten Kalendermonat.
   *
   * @param differenz - Anzahl der vor- oder zurückzugehenden Monate.
   */
  changeMonat(differenz: number): void {
    const [jahr, monat] = this.selectedMonat().split('-').map(Number);
    const ziel = new Date(Date.UTC(jahr, monat - 1 + differenz, 1));
    this.selectedMonat.set(
      `${ziel.getUTCFullYear()}-${String(ziel.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }

  /**
   * Wechselt zum aktuellen Kalendermonat.
   */
  selectAktuellerMonat(): void {
    this.selectedMonat.set(getAktuellerMonat());
  }
}

function getAktuellerMonat(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
}
