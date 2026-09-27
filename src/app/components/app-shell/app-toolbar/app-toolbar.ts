// pur-system/src/app/components/app-shell/app-toolbar/app-toolbar.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  isDevMode,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { LoadingService } from '../../../services/core/loading.service';
import { NetzwerkStatusService } from '../../../services/core/netzwerk-status.service';
import { PwaUpdateService } from '../../../services/core/pwa-update.service';
import { StoreSnapshotService } from '../../../services/core/store-snapshot.service';
import { ThemeService } from '../../../services/core/theme.service';
import { BenutzerStore } from '../../../stores/app/benutzer.store';

@Component({
  selector: 'app-toolbar',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatToolbarModule,
    RouterLink,
  ],
  templateUrl: './app-toolbar.html',
  styleUrl: './app-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppToolbar {
  private readonly _benutzerStore = inject(BenutzerStore);
  private readonly _loadingService = inject(LoadingService);
  private readonly _netzwerkStatusService = inject(NetzwerkStatusService);
  private readonly _pwaUpdateService = inject(PwaUpdateService);
  private readonly _router = inject(Router);
  private readonly _storeSnapshotService = inject(StoreSnapshotService);
  private readonly _themeService = inject(ThemeService);

  readonly sidenavOpened = input(false);
  readonly brandVisible = input(false);
  readonly navigationVisible = input(true);
  readonly isAuthenticated = input(false);
  readonly inProgress = input(false);
  readonly isDevelopmentMode = isDevMode();
  readonly isActive = this._loadingService.isActive;
  readonly progressLabel = computed(() => {
    if (this._loadingService.isLoading() && this._loadingService.isWriting()) {
      return 'Daten werden verarbeitet';
    }
    return this._loadingService.isWriting() ? 'Daten werden gespeichert' : 'Daten werden geladen';
  });
  readonly isOnline = this._netzwerkStatusService.isOnline;
  readonly navigationToggle = output<void>();
  readonly neuladenErforderlich = this._pwaUpdateService.neuladenErforderlich;
  readonly themeIcon = this._themeService.themeIcon;
  readonly title = input('Pur Office');
  readonly updateFehler = this._pwaUpdateService.updateFehler;
  readonly updateVerfuegbar = this._pwaUpdateService.updateVerfuegbar;
  readonly wiederOnline = this._netzwerkStatusService.wiederOnline;

  /**
   * Schaltet zwischen hellem und dunklem Theme um.
   */
  toggleThemeMode(): void {
    this._themeService.toggleThemeMode();
  }

  /**
   * Lädt nach einer bewussten Benutzeraktion die aktuelle Anwendungsversion.
   */
  reloadForUpdate(): void {
    this._pwaUpdateService.reloadApp();
  }

  /**
   * Gibt die angebundenen Store-Snapshots in der Browser-Konsole aus.
   */
  logStoreSnapshots(): void {
    this._storeSnapshotService.logStoreSnapshots();
  }

  /**
   * Meldet den aktuellen Benutzer ab und öffnet anschließend die Loginseite.
   */
  async logout(): Promise<void> {
    await this._benutzerStore.logout();
    await this._router.navigate(['/login']);
  }
}
