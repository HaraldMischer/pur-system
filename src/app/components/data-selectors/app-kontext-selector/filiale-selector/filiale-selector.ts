// pur-system/src/app/components/data-selectors/app-kontext-selector/filiale-selector/filiale-selector.ts

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TFilialKontext } from '../../../../commons/models/app/app-kontext.types';
import { IFilialeEintrag } from '../../../../commons/models/domain/filiale';

const ALLE_FILIALEN_WERT = '__alle_filialen__';

@Component({
  selector: 'app-filiale-selector',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './filiale-selector.html',
  styleUrl: './filiale-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilialeSelector {
  // ===== Konstanten & Typen ===================

  readonly alleFilialenWert = ALLE_FILIALEN_WERT;

  // ===== Öffentliche API ======================

  readonly filialen = input.required<readonly IFilialeEintrag[]>();
  readonly filialKontext = input<TFilialKontext>(null);
  readonly disabled = input(false);
  readonly filialKontextChange = output<TFilialKontext>();

  // ===== Öffentliche Ableitungen ==============

  readonly selectedValue = computed(() => {
    const filialKontext = this.filialKontext();
    if (filialKontext?.typ === 'alle') {
      return ALLE_FILIALEN_WERT;
    }
    return filialKontext?.typ === 'filiale' ? filialKontext.filiale.id : null;
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Gibt den ausgewählten konkreten oder übergreifenden Filialkontext aus.
   *
   * @param value - ID einer Filiale, der Wert für alle Filialen oder `null`.
   */
  selectFilialKontext(value: string | null): void {
    if (value === ALLE_FILIALEN_WERT) {
      this.filialKontextChange.emit({ typ: 'alle' });
      return;
    }

    const filiale = this.filialen().find((eintrag) => eintrag.id === value);
    this.filialKontextChange.emit(filiale ? { typ: 'filiale', filiale } : null);
  }
}
