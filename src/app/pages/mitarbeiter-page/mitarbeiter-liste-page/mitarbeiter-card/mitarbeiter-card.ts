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
  filialkasse: 'Filialkasse',
  servicekraft: 'Servicekraft',
  administrator: 'Administrator',
  kassierer: 'Kassierer',
  techniker: 'Techniker',
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
  readonly darfZusammenfuehren = input(false);
  readonly bearbeiten = output<IMitarbeiterEintrag>();
  readonly zusammenfuehren = output<IMitarbeiterEintrag>();

  // ===== Öffentliche Ableitungen ==============

  readonly name: Signal<string> = computed(() => {
    const person = this.mitarbeiter().person;
    return `${person.vorname} ${person.nachname}`.trim();
  });
  readonly rollenLabel: Signal<string> = computed(() => {
    return this.mitarbeiter()
      .rollen.map((rolle) => ROLLEN_LABEL[rolle])
      .join(' · ');
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
   * Meldet den ausgewählten Mitarbeiter zur Zusammenführung an die Liste.
   */
  selectZusammenfuehren(): void {
    if (!this.darfZusammenfuehren()) return;
    this.zusammenfuehren.emit(this.mitarbeiter());
  }
}
