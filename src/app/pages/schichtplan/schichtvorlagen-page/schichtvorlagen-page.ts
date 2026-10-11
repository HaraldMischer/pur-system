// pur-system/src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.ts

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { SchichtvorlagenFilialabschnitt } from '../../../components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';

type TSchichtvorlagenFilialauswahl = {
  readonly filiale: IFilialeEintrag;
  readonly pfad: IFilialPfad;
};

@Component({
  selector: 'app-schichtvorlagen-page',
  imports: [SchichtvorlagenFilialabschnitt],
  templateUrl: './schichtvorlagen-page.html',
  styleUrl: './schichtvorlagen-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtvorlagenPage {
  // ===== Interne Dependency Injection =========

  readonly appKontextStore = inject(AppKontextStore);

  // ===== Öffentliche Ableitungen ==============

  readonly filialauswahl = computed<readonly TSchichtvorlagenFilialauswahl[]>(() => {
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
}
