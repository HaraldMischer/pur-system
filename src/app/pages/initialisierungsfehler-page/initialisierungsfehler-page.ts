// pur-system/src/app/pages/initialisierungsfehler-page/initialisierungsfehler-page.ts

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

import { AppInitialisierungService } from '../../services/core/app-initialisierung.service';
import { BenutzerStore } from '../../stores/app/benutzer.store';
import { getInitialisierungsRueckkehrUrl } from '../../guards/guard-navigation';

type TInitialisierungsaktion = 'abmelden' | 'wiederholen';

@Component({
  selector: 'app-initialisierungsfehler-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './initialisierungsfehler-page.html',
  styleUrl: './initialisierungsfehler-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitialisierungsfehlerPage {
  // ===== Interne Dependency Injection =========

  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _appInitialisierungService = inject(AppInitialisierungService);
  private readonly _benutzerStore = inject(BenutzerStore);
  private readonly _router = inject(Router);

  // ===== Interner State =======================

  private readonly _aktion = signal<TInitialisierungsaktion | null>(null);
  private readonly _aktionsfehler = signal<string | null>(null);
  private readonly _queryParamMap = toSignal(this._activatedRoute.queryParamMap, {
    initialValue: this._activatedRoute.snapshot.queryParamMap,
  });

  // ===== Öffentliche Ableitungen ==============

  readonly error = computed(() => {
    return (
      this._aktionsfehler() ??
      this._appInitialisierungService.error() ??
      'Die erforderlichen Daten konnten nicht geladen werden.'
    );
  });
  readonly inProgress = computed(() => {
    return this._aktion() !== null;
  });
  readonly wirdAbgemeldet = computed(() => {
    return this._aktion() === 'abmelden';
  });
  readonly wirdWiederholt = computed(() => {
    return this._aktion() === 'wiederholen';
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Wiederholt die Sitzungsinitialisierung und öffnet bei Erfolg die ursprünglich angeforderte Route.
   */
  async retry(): Promise<void> {
    if (this.inProgress()) {
      return;
    }

    this._aktion.set('wiederholen');
    this._aktionsfehler.set(null);
    try {
      await this._appInitialisierungService.retry();
      if (this._appInitialisierungService.status() === 'ready') {
        await this._router.navigateByUrl(this.getRueckkehrUrl());
      }
    } finally {
      this._aktion.set(null);
    }
  }

  /**
   * Meldet den aktuellen Benutzer ab und öffnet anschließend die Loginseite.
   */
  async logout(): Promise<void> {
    if (this.inProgress()) {
      return;
    }

    this._aktion.set('abmelden');
    this._aktionsfehler.set(null);
    try {
      await this._benutzerStore.logout();
      await this._router.navigate(['/login']);
    } catch {
      this._aktionsfehler.set(
        this._benutzerStore.error() ?? 'Die Abmeldung konnte nicht durchgeführt werden.',
      );
    } finally {
      this._aktion.set(null);
    }
  }

  // ===== Interne Helfer =======================

  private getRueckkehrUrl(): string {
    return getInitialisierungsRueckkehrUrl(this._queryParamMap().get('returnUrl'));
  }
}
