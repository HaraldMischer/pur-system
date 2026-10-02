// pur-system/src/app/components/data-selectors/app-kontext-selector/firma-selector/firma-selector.ts

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { IFirmaEintrag } from '../../../../commons/models/domain/firma';

@Component({
  selector: 'app-firma-selector',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './firma-selector.html',
  styleUrl: './firma-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirmaSelector {
  // ===== Öffentliche API ======================

  readonly firmen = input.required<readonly IFirmaEintrag[]>();
  readonly selectedFirma = input<IFirmaEintrag | null>(null);
  readonly disabled = input(false);
  readonly selectedFirmaChange = output<IFirmaEintrag | null>();

  // ===== Öffentliche Aktionen =================

  /**
   * Gibt die zur ausgewählten ID gehörende Firma aus.
   *
   * @param firmaId - ID der ausgewählten Firma oder `null`.
   */
  selectFirma(firmaId: string | null): void {
    const selectedFirma = this.firmen().find((eintrag) => eintrag.id === firmaId) ?? null;

    this.selectedFirmaChange.emit(selectedFirma);
  }
}
