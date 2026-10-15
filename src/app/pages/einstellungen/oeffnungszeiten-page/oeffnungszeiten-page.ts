// pur-system/src/app/pages/einstellungen/oeffnungszeiten-page/oeffnungszeiten-page.ts

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { OeffnungszeitenFiliale } from '../../../components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale';
import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';

// ===== Konstanten & Typen ===================

type TOeffnungszeitenFilialauswahl = {
  readonly filiale: IFilialeEintrag;
  readonly pfad: IFilialPfad;
};

@Component({
  selector: 'app-oeffnungszeiten-page',
  imports: [OeffnungszeitenFiliale],
  templateUrl: './oeffnungszeiten-page.html',
  styleUrl: './oeffnungszeiten-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OeffnungszeitenPage {
  // ===== Interne Dependency Injection =========

  readonly appKontextStore = inject(AppKontextStore);

  // ===== Öffentliche Ableitungen ==============

  readonly filialauswahl = computed<readonly TOeffnungszeitenFilialauswahl[]>(() => {
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
