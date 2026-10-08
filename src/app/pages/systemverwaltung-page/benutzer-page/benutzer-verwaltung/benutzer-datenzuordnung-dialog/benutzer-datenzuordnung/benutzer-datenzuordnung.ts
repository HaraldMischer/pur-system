// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-datenzuordnung-dialog/benutzer-datenzuordnung/benutzer-datenzuordnung.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

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
  imports: [BenutzerMitarbeiterzuordnung, DatenzugriffSelector],
  templateUrl: './benutzer-datenzuordnung.html',
  styleUrl: './benutzer-datenzuordnung.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerDatenzuordnung {
  // ===== Öffentliche API ======================

  readonly profil = input.required<IBenutzerProfilEintrag>();
  readonly unternehmer = input.required<readonly IUnternehmerAuswahl[]>();
  readonly inProgress = input(false);
  readonly zuordnungSpeichern = output<IBenutzerDatenzuordnung>();
  readonly mitarbeiterZuordnungSpeichern = output<IBenutzerMitarbeiterZuordnung>();

  // ===== View Queries =========================

  readonly mitarbeiterZuordnung = viewChild(BenutzerMitarbeiterzuordnung);

  // ===== Öffentliche Werte ====================

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
  readonly speichernDeaktiviert = computed(() => {
    if (this.inProgress()) return true;
    if (this.profil().userRole === 'mitarbeiter') {
      return this.mitarbeiterZuordnung()?.speichernDeaktiviert() ?? true;
    }
    return !this.datenAuswahlGueltig() || !this.hatAenderungen();
  });
  readonly nichtVerfuegbareReferenzen = computed<readonly string[]>(() => {
    const referenzen: string[] = [];
    for (const [unternehmerId, firmen] of Object.entries(this.profil().zugriffe)) {
      const unternehmer = this.unternehmer().find((eintrag) => eintrag.id === unternehmerId);
      if (!unternehmer) referenzen.push(`Unternehmer-ID: ${unternehmerId}`);
      for (const [firmaId, filialIds] of Object.entries(firmen)) {
        const firma = unternehmer?.firmen.find((eintrag) => eintrag.id === firmaId);
        if (!firma) referenzen.push(`Firmen-ID: ${firmaId}`);
        for (const filialId of filialIds) {
          if (!firma?.filialen.some((eintrag) => eintrag.id === filialId)) {
            referenzen.push(`Filial-ID: ${filialId}`);
          }
        }
      }
    }
    return referenzen;
  });

  constructor() {
    effect(() => {
      this.profil().zugriffe;
      untracked(() => {
        this.resetAuswahl();
      });
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Gibt eine gültige, geänderte Datenzuordnung an den Bearbeitungsdialog weiter.
   */
  saveZuordnung(): void {
    if (this.profil().userRole === 'mitarbeiter') {
      this.mitarbeiterZuordnung()?.saveZuordnung();
      return;
    }
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
