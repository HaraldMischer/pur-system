// pur-system/src/app/pages/schichtplan/schichtmodelle-page/schichtmodelle-page.ts

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { SchichtmodelleFiliale } from '../../../components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale';
import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';

type TSchichtmodelleFilialauswahl = {
  readonly filiale: IFilialeEintrag;
  readonly pfad: IFilialPfad;
};

@Component({
  selector: 'app-schichtmodelle-page',
  imports: [SchichtmodelleFiliale],
  templateUrl: './schichtmodelle-page.html',
  styleUrl: './schichtmodelle-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtmodellePage {
  // ===== Interne Dependency Injection =========

  readonly appKontextStore = inject(AppKontextStore);

  // ===== Öffentliche Ableitungen ==============

  readonly filialauswahl = computed<readonly TSchichtmodelleFilialauswahl[]>(() => {
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
