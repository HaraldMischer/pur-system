// pur-system/src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.ts

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TAppKontextSelectorKonfiguration } from '../../../commons/models/app/app-kontext-selector.types';
import { TFilialKontext } from '../../../commons/models/app/app-kontext.types';
import { IFirmaEintrag } from '../../../commons/models/domain/firma';
import { IUnternehmerEintrag } from '../../../commons/models/domain/unternehmer';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { StammdatenStore } from '../../../stores/app/stammdaten.store';
import { FilialeSelector } from './filiale-selector/filiale-selector';
import { FirmaSelector } from './firma-selector/firma-selector';
import { UnternehmerSelector } from './unternehmer-selector/unternehmer-selector';

// ===== Konstanten & Typen ===================

const STANDARD_KONFIGURATION: TAppKontextSelectorKonfiguration = {
  unternehmer: 'editable',
  firma: 'editable',
  filiale: 'readonly',
};

@Component({
  selector: 'app-kontext-selector',
  imports: [FilialeSelector, FirmaSelector, UnternehmerSelector],
  templateUrl: './app-kontext-selector.html',
  styleUrl: './app-kontext-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppKontextSelector {
  // ===== Interne Dependency Injection =========

  private readonly _appKontextStore = inject(AppKontextStore);
  private readonly _stammdatenStore = inject(StammdatenStore);

  // ===== Öffentliche API ======================

  readonly konfiguration = input<TAppKontextSelectorKonfiguration>(STANDARD_KONFIGURATION);

  // ===== Öffentliche Werte ====================

  readonly unternehmer = this._stammdatenStore.unternehmer;
  readonly stammdatenDownload = this._stammdatenStore.download;
  readonly selectedUnternehmer = this._appKontextStore.selectedUnternehmer;
  readonly firmen = this._appKontextStore.firmen;
  readonly selectedFirma = this._appKontextStore.selectedFirma;
  readonly filialen = this._appKontextStore.filialen;
  readonly filialKontext = this._appKontextStore.filialKontext;

  // ===== Öffentliche Aktionen =================

  /**
   * Übernimmt den ausgewählten Unternehmer in den globalen App-Kontext.
   *
   * @param unternehmer - Der ausgewählte Unternehmer oder `null`.
   */
  selectUnternehmer(unternehmer: IUnternehmerEintrag | null): void {
    this._appKontextStore.selectUnternehmer(unternehmer);
  }

  /**
   * Übernimmt die ausgewählte Firma in den globalen App-Kontext.
   *
   * @param firma - Die ausgewählte Firma oder `null`.
   */
  selectFirma(firma: IFirmaEintrag | null): void {
    this._appKontextStore.selectFirma(firma);
  }

  /**
   * Übernimmt die konkrete oder übergreifende Filialauswahl in den globalen App-Kontext.
   *
   * @param filialKontext - Der ausgewählte Filialkontext oder `null`.
   */
  selectFilialKontext(filialKontext: TFilialKontext): void {
    this._appKontextStore.selectFilialKontext(filialKontext);
  }
}
