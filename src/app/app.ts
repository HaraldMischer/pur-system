// pur-system/src/app/app.ts

import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  ViewChild,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { environment } from '../environments/environment';
import { AppSidenav } from './components/app-shell/app-sidenav/app-sidenav';
import { AppToolbar } from './components/app-shell/app-toolbar/app-toolbar';
import { GlobalBanner } from './components/app-shell/global-banner/global-banner';
import { AppInitialisierungService } from './services/core/app-initialisierung.service';
import { GlobalBannerService } from './services/core/global-banner.service';
import { BenutzerStore } from './stores/app/benutzer.store';

const INAKTIV_BANNER_SOURCE = 'benutzerprofil:inaktiv';

type TRoutenKontext = {
  authLayout: boolean;
  toolbarTitel: string;
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSidenavModule, AppSidenav, AppToolbar, GlobalBanner],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly _breakpointObserver = inject(BreakpointObserver);
  private readonly _appInitialisierungService = inject(AppInitialisierungService);
  private readonly _globalBannerService = inject(GlobalBannerService);
  private readonly _router = inject(Router);

  readonly benutzerStore = inject(BenutzerStore);

  @ViewChild(MatSidenav) private readonly _sidenav?: MatSidenav;

  readonly isHandset: Signal<boolean> = toSignal(
    this._breakpointObserver.observe('(max-width: 720px)').pipe(map((result) => result.matches)),
    {
      initialValue: false,
    },
  );

  readonly routenKontext: Signal<TRoutenKontext> = toSignal(
    this._router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.getAktivenRoutenkontext()),
    ),
    {
      initialValue: this.getAktivenRoutenkontext(),
    },
  );

  constructor() {
    this._appInitialisierungService.init();
    effect(() => {
      const istInaktiv = this.benutzerStore.istInaktiv();
      untracked(() => {
        if (istInaktiv) {
          this._globalBannerService.show({
            kind: 'error',
            text: 'Dieses Profil ist inaktiv. Bitte wende dich an einen Administrator.',
            source: INAKTIV_BANNER_SOURCE,
          });
          return;
        }

        this._globalBannerService.clearIfSource(INAKTIV_BANNER_SOURCE);
      });
    });
  }

  get isSidenavOpened(): boolean {
    return this._sidenav?.opened ?? false;
  }

  toggleSidenav(): void {
    void this._sidenav?.toggle();
  }

  closeSidenav(): void {
    void this._sidenav?.close();
  }

  private getAktivenRoutenkontext(): TRoutenKontext {
    let route = this._router.routerState.snapshot.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    const authLayout = route.data['layout'] === 'auth';

    return {
      authLayout,
      toolbarTitel: authLayout ? environment.appTitle : (route.title ?? ''),
    };
  }
}
