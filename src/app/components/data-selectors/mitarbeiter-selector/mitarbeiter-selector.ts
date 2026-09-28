// pur-system/src/app/components/data-selectors/mitarbeiter-selector/mitarbeiter-selector.ts

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';

@Component({
  selector: 'app-mitarbeiter-selector',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './mitarbeiter-selector.html',
  styleUrl: './mitarbeiter-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MitarbeiterSelector {
  // ===== Öffentliche API ======================

  readonly mitarbeiter = input.required<readonly IMitarbeiterEintrag[]>();
  readonly selectedMitarbeiter = input<IMitarbeiterEintrag | null>(null);
  readonly disabled = input(false);
  readonly selectedMitarbeiterChange = output<IMitarbeiterEintrag | null>();

  // ===== Öffentliche Aktionen =================

  /**
   * Gibt den zur ausgewählten ID gehörenden Mitarbeiter aus.
   *
   * @param mitarbeiterId - ID des ausgewählten Mitarbeiters oder `null`.
   */
  selectMitarbeiter(mitarbeiterId: string | null): void {
    const selectedMitarbeiter =
      this.mitarbeiter().find((eintrag) => eintrag.id === mitarbeiterId) ?? null;

    this.selectedMitarbeiterChange.emit(selectedMitarbeiter);
  }
}
