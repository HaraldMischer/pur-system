// pur-system/src/app/components/app-shell/app-sidenav/app-sidenav.ts

import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { APP_VERSION } from '../../../commons/constants/app.constants';
import { TFilialKontext } from '../../../commons/models/app/app-kontext.types';
import { INavigationLink, IRollenNavigation } from '../../../commons/models/app/navigation';
import { IFirmaEintrag } from '../../../commons/models/domain/firma';
import { IUnternehmerEintrag } from '../../../commons/models/domain/unternehmer';
import { getSichtbareRollenNavigation } from '../../../commons/utils/navigation/rollen-navigation';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { StammdatenStore } from '../../../stores/app/stammdaten.store';
import { environment } from '../../../../environments/environment';
import { FilialeSelector } from '../../data-selectors/filiale-selector/filiale-selector';
import { FirmaSelector } from '../../data-selectors/firma-selector/firma-selector';
import { UnternehmerSelector } from '../../data-selectors/unternehmer-selector/unternehmer-selector';
import { AppSidenavFlatNavigation } from './app-sidenav-flat-navigation/app-sidenav-flat-navigation';
import { AppSidenavNestedNavigation } from './app-sidenav-nested-navigation/app-sidenav-nested-navigation';

// ===== Top-Level Helper =====================

function isNavigationLink(
  eintrag: IRollenNavigation['eintraege'][number],
): eintrag is INavigationLink {
  return eintrag.typ === 'link';
}

@Component({
  selector: 'app-sidenav',
  imports: [
    AppSidenavFlatNavigation,
    AppSidenavNestedNavigation,
    FilialeSelector,
    FirmaSelector,
    MatCardModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
    UnternehmerSelector,
  ],
  templateUrl: './app-sidenav.html',
  styleUrl: './app-sidenav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidenav {
  // ===== Interne Dependency Injection =========
  private readonly _benutzerStore = inject(BenutzerStore);
  private readonly _stammdatenStore = inject(StammdatenStore);
  private readonly _appKontextStore = inject(AppKontextStore);

  // ===== Öffentliche API ======================
  readonly benutzerProfil = this._benutzerStore.benutzerProfil;
  readonly unternehmer = this._stammdatenStore.unternehmer;
  readonly stammdatenDownload = this._stammdatenStore.download;
  readonly selectedUnternehmer = this._appKontextStore.selectedUnternehmer;
  readonly firmen = this._appKontextStore.firmen;
  readonly selectedFirma = this._appKontextStore.selectedFirma;
  readonly filialen = this._appKontextStore.filialen;
  readonly filialKontext = this._appKontextStore.filialKontext;
  readonly isHandset = input(false);
  readonly navigationSelected = output<void>();

  // ===== Öffentliche Werte ====================
  readonly title = environment.appTitle;
  get appVersion(): string {
    return APP_VERSION;
  }

  // ===== Öffentliche Ableitungen ==============
  readonly navigation: Signal<IRollenNavigation | null> = computed(() => {
    const profil = this.benutzerProfil();
    return profil ? getSichtbareRollenNavigation(profil) : null;
  });
  readonly istMaster = computed(() => {
    return this.benutzerProfil()?.userRole === 'master';
  });
  readonly flacheNavigationEintraege: Signal<readonly INavigationLink[]> = computed(() => {
    return this.navigation()?.eintraege.filter(isNavigationLink) ?? [];
  });

  // ===== Öffentliche Aktionen =================
  /**
   * Schließt die Sidebar nach einer Linkauswahl auf kleinen Bildschirmen.
   */
  closeOnHandset(): void {
    if (!this.isHandset()) {
      return;
    }

    this.navigationSelected.emit();
  }

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
