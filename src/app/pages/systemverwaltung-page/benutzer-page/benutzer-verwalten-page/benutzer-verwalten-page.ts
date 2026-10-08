// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwalten-page/benutzer-verwalten-page.ts

import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';

import { BenutzerVerwaltungStore } from '../../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerVerwaltung } from '../benutzer-verwaltung/benutzer-verwaltung';

@Component({
  selector: 'app-benutzer-verwalten-page',
  imports: [BenutzerVerwaltung],
  templateUrl: './benutzer-verwalten-page.html',
  styleUrl: './benutzer-verwalten-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerVerwaltenPage implements OnDestroy {
  // ===== Interne Dependency Injection =========
  private readonly benutzerVerwaltungStore = inject(BenutzerVerwaltungStore);

  // ===== Lifecycle Hooks ======================
  /**
   * Entfernt Auswahl und flüchtige Rückmeldungen beim Verlassen der Benutzerverwaltung.
   */
  ngOnDestroy(): void {
    this.benutzerVerwaltungStore.selectBenutzer(null);
    this.benutzerVerwaltungStore.clearFeedback();
  }
}
