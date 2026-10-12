// pur-system/src/app/components/date-selectors/monat-selector/monat-selector.ts

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-monat-selector',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './monat-selector.html',
  styleUrl: './monat-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonatSelector {
  // ===== Öffentliche API ======================

  readonly selectedMonat = input.required<string>();
  readonly selectedMonatChange = output<string>();

  // ===== Öffentliche Ableitungen ==============

  readonly monatsbezeichnung = computed(() => {
    const [jahr, monat] = this.selectedMonat().split('-').map(Number);
    return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(
      new Date(Date.UTC(jahr, monat - 1, 1)),
    );
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Fordert den Wechsel relativ zum ausgewählten Kalendermonat an.
   *
   * @param differenz - Anzahl der vor- oder zurückzugehenden Monate.
   */
  changeMonat(differenz: number): void {
    const [jahr, monat] = this.selectedMonat().split('-').map(Number);
    const ziel = new Date(Date.UTC(jahr, monat - 1 + differenz, 1));
    this.selectedMonatChange.emit(
      `${ziel.getUTCFullYear()}-${String(ziel.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }
}
