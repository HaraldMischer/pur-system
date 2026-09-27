// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-page.ts

import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { MatDivider } from '@angular/material/list';

import { BenutzerVerwaltungStore } from '../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerAnlage } from './benutzer-anlage/benutzer-anlage';
import { BenutzerVerwaltung } from './benutzer-verwaltung/benutzer-verwaltung';

@Component({
  selector: 'app-benutzer-page',
  imports: [BenutzerAnlage, BenutzerVerwaltung, MatDivider],
  templateUrl: './benutzer-page.html',
  styleUrl: './benutzer-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerPage implements OnDestroy {
  // ===== Interne Dependency Injection =========
  private readonly benutzerVerwaltungStore = inject(BenutzerVerwaltungStore);

  // ===== Lifecycle Hooks ======================
  /**
   * Entfernt flüchtige Rückmeldungen beim Verlassen der Benutzerverwaltung.
   */
  ngOnDestroy(): void {
    this.benutzerVerwaltungStore.clearFeedback();
  }
}
