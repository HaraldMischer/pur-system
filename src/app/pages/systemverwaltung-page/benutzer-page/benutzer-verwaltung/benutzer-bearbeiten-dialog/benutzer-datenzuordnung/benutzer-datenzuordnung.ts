// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-datenzuordnung/benutzer-datenzuordnung.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import {
  IBenutzerDatenzuordnung,
  IBenutzerMitarbeiterZuordnung,
  IBenutzerProfilEintrag,
  TBenutzerZugriffe,
} from '../../../../../../commons/models/domain/benutzer';
import { IUnternehmerAuswahl } from '../../../../../../commons/models/domain/datenzugriff';
import { DatenzugriffSelector } from '../../../datenzugriff-selector/datenzugriff-selector';
import { BenutzerMitarbeiterzuordnung } from '../benutzer-mitarbeiterzuordnung/benutzer-mitarbeiterzuordnung';

@Component({
  selector: 'app-benutzer-datenzuordnung',
  imports: [BenutzerMitarbeiterzuordnung, DatenzugriffSelector, MatButtonModule],
  templateUrl: './benutzer-datenzuordnung.html',
  styleUrl: './benutzer-datenzuordnung.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerDatenzuordnung {
  // ===== Öffentliche API ======================

  readonly profil = input.required<IBenutzerProfilEintrag>();
  readonly unternehmer = input.required<readonly IUnternehmerAuswahl[]>();
  readonly inProgress = input(false);
  readonly aktionAktivChange = output<boolean>();
  readonly zuordnungSpeichern = output<IBenutzerDatenzuordnung>();
  readonly mitarbeiterZuordnungSpeichern = output<IBenutzerMitarbeiterZuordnung>();

  // ===== Öffentliche Werte ====================

  readonly zuordnungBearbeiten = signal(false);
  readonly unternehmerIds = signal<readonly string[]>([]);
  readonly firmaIds = signal<readonly string[]>([]);
  readonly filialen = signal<Readonly<Partial<Record<string, readonly string[]>>>>({});

  // ===== Öffentliche Ableitungen ==============

  readonly datenAuswahlGueltig = computed(() => {
    const zugriffe = this.getZugriffe();
    const firmen = Object.values(zugriffe).flatMap((eintrag) => Object.values(eintrag));
    return (
      Object.keys(zugriffe).length === 1 &&
      firmen.length > 0 &&
      firmen.every((filialIds) => filialIds.length > 0) &&
      (this.profil().userRole !== 'filiale' || (firmen.length === 1 && firmen[0].length === 1))
    );
  });
  readonly hatAenderungen = computed(() => {
    return JSON.stringify(this.getZugriffe()) !== JSON.stringify(this.profil().zugriffe);
  });

  constructor() {
    effect(() => {
      this.profil().zugriffe;
      untracked(() => {
        if (!this.zuordnungBearbeiten()) this.resetAuswahl();
      });
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Öffnet die Datenzugriffsauswahl zur Bearbeitung.
   */
  startZuordnungBearbeiten(): void {
    this.resetAuswahl();
    this.zuordnungBearbeiten.set(true);
    this.aktionAktivChange.emit(true);
  }

  /**
   * Bricht die Bearbeitung ab und stellt die gespeicherte Datenzuordnung wieder her.
   */
  cancelZuordnung(): void {
    this.resetAuswahl();
    this.zuordnungBearbeiten.set(false);
    this.aktionAktivChange.emit(false);
  }

  /**
   * Gibt eine gültige, geänderte Datenzuordnung an den Bearbeitungsdialog weiter.
   */
  saveZuordnung(): void {
    if (!this.datenAuswahlGueltig() || !this.hatAenderungen() || this.inProgress()) return;
    this.zuordnungSpeichern.emit({ zugriffe: this.getZugriffe() });
  }

  // ===== Interne Helfer =======================

  private resetAuswahl(): void {
    const zugriffe = this.profil().zugriffe;
    this.unternehmerIds.set(Object.keys(zugriffe));
    this.firmaIds.set(this.getFirmaIds(zugriffe));
    this.filialen.set(this.getFilialen(zugriffe));
  }

  private getZugriffe(): TBenutzerZugriffe {
    const zugriffe = new Map<string, Map<string, string[]>>();
    for (const firmaSchluessel of this.firmaIds()) {
      const [unternehmerId, firmaId] = JSON.parse(firmaSchluessel) as [string, string];
      if (!this.unternehmerIds().includes(unternehmerId)) continue;
      const unternehmer = this.unternehmer().find((eintrag) => eintrag.id === unternehmerId);
      const firma = unternehmer?.firmen.find((eintrag) => eintrag.id === firmaId);
      if (!firma) continue;
      const filialIds = [...(this.filialen()[firmaSchluessel] ?? [])].filter((filialId) => {
        return firma.filialen.some((filiale) => filiale.id === filialId);
      });
      if (!filialIds.length) continue;
      const firmen = zugriffe.get(unternehmerId) ?? new Map<string, string[]>();
      firmen.set(firmaId, filialIds);
      zugriffe.set(unternehmerId, firmen);
    }
    return Object.fromEntries(
      [...zugriffe].map(([unternehmerId, firmen]) => [unternehmerId, Object.fromEntries(firmen)]),
    );
  }

  private getFirmaIds(zugriffe: TBenutzerZugriffe): readonly string[] {
    return Object.entries(zugriffe).flatMap(([unternehmerId, firmen]) => {
      return Object.keys(firmen).map((firmaId) => JSON.stringify([unternehmerId, firmaId]));
    });
  }

  private getFilialen(
    zugriffe: TBenutzerZugriffe,
  ): Readonly<Partial<Record<string, readonly string[]>>> {
    return Object.fromEntries(
      Object.entries(zugriffe).flatMap(([unternehmerId, firmen]) => {
        return Object.entries(firmen).map(([firmaId, filialIds]) => [
          JSON.stringify([unternehmerId, firmaId]),
          filialIds,
        ]);
      }),
    );
  }
}
