// pur-system/src/app/components/data-selectors/unternehmer-selector/unternehmer-selector.ts

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { IUnternehmerEintrag } from '../../../commons/models/domain/unternehmer';

@Component({
  selector: 'app-unternehmer-selector',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './unternehmer-selector.html',
  styleUrl: './unternehmer-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnternehmerSelector {
  // ===== Öffentliche API ======================

  readonly unternehmer = input.required<readonly IUnternehmerEintrag[]>();
  readonly selectedUnternehmer = input<IUnternehmerEintrag | null>(null);
  readonly disabled = input(false);
  readonly selectedUnternehmerChange = output<IUnternehmerEintrag | null>();

  // ===== Öffentliche Aktionen =================

  /**
   * Gibt den zur ausgewählten ID gehörenden Unternehmer aus.
   *
   * @param unternehmerId - ID des ausgewählten Unternehmers oder `null`.
   */
  selectUnternehmer(unternehmerId: string | null): void {
    const selectedUnternehmer =
      this.unternehmer().find((eintrag) => eintrag.id === unternehmerId) ?? null;

    this.selectedUnternehmerChange.emit(selectedUnternehmer);
  }
}
