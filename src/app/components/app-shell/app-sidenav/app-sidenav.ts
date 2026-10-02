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
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { getAppKontextSelectorKonfiguration } from '../../../commons/constants/app-kontext-selector.constants';
import { APP_VERSION } from '../../../commons/constants/app.constants';
import { TAppBereich } from '../../../commons/models/app/app-bereich';
import { INavigationLink, IRollenNavigation } from '../../../commons/models/app/navigation';
import { getSichtbareRollenNavigation } from '../../../commons/utils/navigation/rollen-navigation';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { environment } from '../../../../environments/environment';
import { AppKontextSelector } from '../../data-selectors/app-kontext-selector/app-kontext-selector';
import { AppSidenavFlatNavigation } from './app-sidenav-flat-navigation/app-sidenav-flat-navigation';
import { AppSidenavNestedNavigation } from './app-sidenav-nested-navigation/app-sidenav-nested-navigation';

// ===== Top-Level Helper =====================

function isNavigationLink(
  eintrag: IRollenNavigation['eintraege'][number],
): eintrag is INavigationLink {
  return eintrag.typ === 'link';
}

function isAppBereich(value: unknown): value is TAppBereich {
  return (
    value === 'dashboard' ||
    value === 'schichtplan' ||
    value === 'mitarbeiter' ||
    value === 'verwaltung' ||
    value === 'systemverwaltung'
  );
}

function getAktiverAppBereich(route: ActivatedRouteSnapshot): TAppBereich | null {
  let aktuelleRoute: ActivatedRouteSnapshot | null = route;
  let bereich: TAppBereich | null = null;

  while (aktuelleRoute) {
    const routeBereich: unknown = aktuelleRoute.data['bereich'];
    if (isAppBereich(routeBereich)) {
      bereich = routeBereich;
    }
    aktuelleRoute = aktuelleRoute.firstChild;
  }

  return bereich;
}

@Component({
  selector: 'app-sidenav',
  imports: [
    AppKontextSelector,
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
  private readonly _router = inject(Router);

  // ===== Interner State =======================
  private readonly _aktiveRoute = toSignal(
    this._router.events.pipe(
      filter((event): event is NavigationEnd => {
        return event instanceof NavigationEnd;
      }),
      map(() => {
        return this._router.routerState.snapshot.root;
      }),
    ),
    { initialValue: this._router.routerState.snapshot.root },
  );

  // ===== Öffentliche API ======================
  readonly benutzerProfil = this._benutzerStore.benutzerProfil;
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
  readonly appKontextSelectorKonfiguration = computed(() => {
    const bereich = getAktiverAppBereich(this._aktiveRoute());
    return getAppKontextSelectorKonfiguration(this.benutzerProfil()?.userRole, bereich);
  });
  readonly appKontextSelectorSichtbar = computed(() => {
    return Object.values(this.appKontextSelectorKonfiguration()).some((modus) => {
      return modus !== 'hidden';
    });
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
