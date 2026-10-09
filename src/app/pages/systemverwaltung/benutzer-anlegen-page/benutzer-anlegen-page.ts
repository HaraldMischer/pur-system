// pur-system/src/app/pages/systemverwaltung/benutzer-anlegen-page/benutzer-anlegen-page.ts

import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';

import { BenutzerAnlage } from '../../../components/systemverwaltung/benutzer/benutzer-anlage/benutzer-anlage';
import { BenutzerVerwaltungStore } from '../../../stores/domain/benutzer-verwaltung.store';

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
