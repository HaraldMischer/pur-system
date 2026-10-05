// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.ts

import { ChangeDetectionStrategy, Component, Signal, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  IMitarbeiterEintrag,
  TMitarbeiterRolle,
} from '../../../../commons/models/domain/mitarbeiter';

// ===== Konstanten & Typen ===================

const ROLLEN_LABEL: Readonly<Record<TMitarbeiterRolle, string>> = {
  service: 'Service',
  kasse: 'Kasse',
  admin: 'Administration',
};

@Component({
  selector: 'app-mitarbeiter-card',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './mitarbeiter-card.html',
  styleUrl: './mitarbeiter-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MitarbeiterCard {
  // ===== Öffentliche API ======================

  readonly mitarbeiter = input.required<IMitarbeiterEintrag>();
  readonly darfLoeschen = input(false);
  readonly bearbeiten = output<IMitarbeiterEintrag>();
  readonly loeschen = output<IMitarbeiterEintrag>();

  // ===== Öffentliche Ableitungen ==============

  readonly name: Signal<string> = computed(() => {
    const person = this.mitarbeiter().person;
    return `${person.vorname} ${person.nachname}`.trim();
  });
  readonly rollenLabel: Signal<string> = computed(() => {
    return ROLLEN_LABEL[this.mitarbeiter().rolle];
  });
  readonly filialenText: Signal<string> = computed(() => {
    const anzahl = this.mitarbeiter().filialIds.length;
    if (anzahl === 0) return 'Noch keiner Filiale zugeordnet';
    if (anzahl === 1) return 'Einer Filiale zugeordnet';
    return `${anzahl} Filialen zugeordnet`;
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Meldet den ausgewählten Mitarbeiter zur Bearbeitung an die Liste.
   */
  selectBearbeiten(): void {
    this.bearbeiten.emit(this.mitarbeiter());
  }

  /**
   * Meldet den ausgewählten Mitarbeiter zur Löschung an die Liste.
   */
  selectLoeschen(): void {
    if (!this.darfLoeschen()) return;
    this.loeschen.emit(this.mitarbeiter());
  }
}
