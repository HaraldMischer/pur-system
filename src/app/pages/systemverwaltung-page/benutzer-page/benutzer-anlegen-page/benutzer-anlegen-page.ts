// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-anlegen-page/benutzer-anlegen-page.ts

import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';

import { BenutzerVerwaltungStore } from '../../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerAnlage } from '../benutzer-anlage/benutzer-anlage';

@Component({
  selector: 'app-benutzer-anlegen-page',
  imports: [BenutzerAnlage],
  templateUrl: './benutzer-anlegen-page.html',
  styleUrl: './benutzer-anlegen-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerAnlegenPage implements OnDestroy {
  // ===== Interne Dependency Injection =========
  private readonly benutzerVerwaltungStore = inject(BenutzerVerwaltungStore);

  // ===== Lifecycle Hooks ======================
  /**
   * Entfernt flüchtige Rückmeldungen beim Verlassen der Benutzeranlage.
   */
  ngOnDestroy(): void {
    this.benutzerVerwaltungStore.clearFeedback();
  }
}
