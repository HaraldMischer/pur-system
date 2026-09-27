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

import { APP_VERSION } from '../../../commons/constants/app-version.constant';
import { INavigationLink, IRollenNavigation } from '../../../commons/models/app/navigation';
import { getSichtbareRollenNavigation } from '../../../commons/utils/navigation/rollen-navigation';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { environment } from '../../../../environments/environment';
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
    MatCardModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  templateUrl: './app-sidenav.html',
  styleUrl: './app-sidenav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidenav {
  // ===== Interne Dependency Injection =========
  private readonly _benutzerStore = inject(BenutzerStore);

  // ===== Öffentliche API ======================
  readonly benutzerProfil = this._benutzerStore.benutzerProfil;
  readonly isHandset = input(false);
  readonly navigationSelected = output<void>();

  // ===== Öffentliche Werte ====================
  readonly title = environment.appTitle;
  readonly appVersion = APP_VERSION;

  // ===== Öffentliche Ableitungen ==============
  readonly navigation: Signal<IRollenNavigation | null> = computed(() => {
    const profil = this.benutzerProfil();
    return profil ? getSichtbareRollenNavigation(profil) : null;
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
}
