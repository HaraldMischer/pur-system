// pur-system/src/app/components/data-selectors/app-kontext-selector/filiale-selector/filiale-selector.ts

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { IFilialeEintrag } from '../../../../commons/models/domain/filiale';

@Component({
  selector: 'app-filiale-selector',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './filiale-selector.html',
  styleUrl: './filiale-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilialeSelector {
  // ===== Öffentliche API ======================

  readonly filialen = input.required<readonly IFilialeEintrag[]>();
  readonly selectedFilialen = input<readonly IFilialeEintrag[]>([]);
  readonly disabled = input(false);
  readonly selectedFilialenChange = output<readonly IFilialeEintrag[]>();

  // ===== Öffentliche Ableitungen ==============

  readonly selectedIds = computed(() => {
    return this.selectedFilialen().map((filiale) => filiale.id);
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Gibt eine gültige Auswahl konkreter Filialen aus.
   *
   * @param values - IDs der ausgewählten Filialen.
   */
  selectFilialen(values: readonly string[]): void {
    const selectedIds = new Set(values);
    const selectedFilialen = this.filialen().filter((filiale) => selectedIds.has(filiale.id));
    this.selectedFilialenChange.emit(selectedFilialen);
  }
}
