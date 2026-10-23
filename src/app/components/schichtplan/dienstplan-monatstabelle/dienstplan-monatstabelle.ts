// pur-system/src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.ts

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  IDienstplanEintrag,
  IDienstplanVersionEintrag,
} from '../../../commons/models/domain/dienstplan';
import {
  IDienstplanKalendertag,
  IDienstplanRasterzeit,
} from '../../../commons/models/domain/dienstplan-kalendertag';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import { IModellschichtMomentaufnahmeEintrag } from '../../../commons/models/domain/schichtmodell';
import { compareModellschichtenNachReihenfolge } from '../../../commons/utils/dienstplan/modellschicht-sortierung';
import { calculateSchichtLohnzeitMinuten } from '../../../commons/utils/dienstplan/schicht-zeit';
import { getMitarbeiterFarbe } from '../../../commons/utils/mitarbeiter/mitarbeiter-farbkennung';

export type TSchichtplanRasterauswahl = {
  readonly datum: string;
  readonly modellschichtId: string;
};

export type TSchichtplanMitarbeiterAblage = TSchichtplanRasterauswahl & {
  readonly mitarbeiterId: string;
};

export type TSchichtplanVerschiebung = TSchichtplanRasterauswahl & {
  readonly schicht: ISchichtEintrag;
};

export type TSchichtplanDragDaten =
  | { readonly art: 'mitarbeiter'; readonly mitarbeiterId: string }
  | { readonly art: 'schicht'; readonly schicht: ISchichtEintrag };

type TSchichtplanZelle = {
  readonly modellschicht: IModellschichtMomentaufnahmeEintrag;
  readonly rasterzeit: IDienstplanRasterzeit | null;
  readonly schichten: readonly ISchichtEintrag[];
  readonly schichtIds: readonly string[];
  readonly mitarbeiterIds: readonly string[];
  readonly hatKonflikt: boolean;
};

type TSchichtplanAblageziel = TSchichtplanRasterauswahl & {
  readonly rasterzeit: IDienstplanRasterzeit | null;
  readonly schichtIds: readonly string[];
  readonly mitarbeiterIds: readonly string[];
  readonly mehrfachbelegungErlaubt: boolean;
  readonly verfuegbar: boolean;
};

type TSchichtplanTag = {
  readonly datum: string;
  readonly datumBezeichnung: string;
  readonly wochentagBezeichnung: string;
  readonly oeffnungszeitBezeichnung: string;
  readonly kalendereigenschaftBezeichnung: string | null;
  readonly hervorhebung: 'sonntag' | 'feiertag' | 'sondertag' | null;
  readonly zellen: readonly TSchichtplanZelle[];
};

@Component({
  selector: 'app-dienstplan-monatstabelle',
  imports: [CdkDrag, CdkDropList, MatButtonModule, MatIconModule],
  templateUrl: './dienstplan-monatstabelle.html',
  styleUrl: './dienstplan-monatstabelle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanMonatstabelle {
  // ===== Öffentliche API ======================

  readonly dienstplan = input.required<IDienstplanEintrag>();
  readonly versionen = input.required<readonly IDienstplanVersionEintrag[]>();
  readonly schichten = input.required<readonly ISchichtEintrag[]>();
  readonly modellschichten = input.required<readonly IModellschichtMomentaufnahmeEintrag[]>();
  readonly konfliktSchichtIds = input<ReadonlySet<string>>(new Set());
  readonly mitarbeiter = input<readonly IMitarbeiterEintrag[]>([]);
  readonly erlaubteMitarbeiterIds = input<readonly string[]>([]);
  readonly darfSchreiben = input(false);
  readonly schreibvorgang = input(false);
  readonly dienstplanLoeschenAnzeigen = input(false);
  readonly dienstplanLoeschenDeaktiviert = input(false);
  readonly dienstplanLoeschenHinweis = input('');
  readonly dienstplanVeroeffentlichenAnzeigen = input(false);
  readonly dienstplanVeroeffentlichenDeaktiviert = input(false);
  readonly dienstplanVeroeffentlichenHinweis = input('');
  readonly entwurfAnlegenAnzeigen = input(false);
  readonly entwurfAnlegenDeaktiviert = input(false);
  readonly schichtAnlegen = output<TSchichtplanRasterauswahl>();
  readonly schichtAblegen = output<TSchichtplanMitarbeiterAblage>();
  readonly schichtVerschieben = output<TSchichtplanVerschiebung>();
  readonly schichtBearbeiten = output<ISchichtEintrag>();
  readonly schichtVerschiebungErlaubt = input<
    (schicht: ISchichtEintrag, ziel: TSchichtplanRasterauswahl) => boolean
  >(() => true);
  readonly dienstplanLoeschen = output<void>();
  readonly dienstplanVeroeffentlichen = output<void>();
  readonly entwurfAnlegen = output<void>();

  // ===== Öffentliche Ableitungen ==============

  readonly aktiveVersion = computed(() => {
    const dienstplan = this.dienstplan();
    const entwurf = this.versionen().find((version) => version.id === dienstplan.entwurfVersionId);
    return (
      entwurf ??
      this.versionen().find((version) => version.id === dienstplan.veroeffentlichteVersionId) ??
      null
    );
  });
  readonly statusBezeichnung = computed(() => {
    const status = this.aktiveVersion()?.status;
    if (status === 'entwurf') return 'Entwurf';
    if (status === 'veroeffentlicht') return 'Veröffentlicht';
    if (status === 'archiviert') return 'Archiviert';
    return 'Kein Stand';
  });
  readonly geordneteModellschichten = computed(() => {
    const dienstplanId = this.dienstplan().id;
    return this.modellschichten()
      .filter((modellschicht) => modellschicht.dienstplanId === dienstplanId)
      .sort(compareModellschichtenNachReihenfolge);
  });
  readonly mitarbeiterNachId = computed(() => {
    return new Map(this.mitarbeiter().map((mitarbeiter) => [mitarbeiter.id, mitarbeiter]));
  });
  readonly kannSchichtenAblegen = computed(() => {
    return (
      this.darfSchreiben() && this.aktiveVersion()?.status === 'entwurf' && !this.schreibvorgang()
    );
  });
  readonly tage = computed<readonly TSchichtplanTag[]>(() => {
    const dienstplan = this.dienstplan();
    const versionId = this.aktiveVersion()?.id;
    const schichten = versionId
      ? this.schichten().filter((schicht) => schicht.versionId === versionId)
      : [];
    return createTage(
      dienstplan.zeitraumStart,
      dienstplan.zeitraumEnde,
      dienstplan.kalendertage,
      this.geordneteModellschichten(),
      schichten,
      this.konfliktSchichtIds(),
    );
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Prüft, ob der gezogene Mitarbeiter oder die gezogene Schicht abgelegt werden darf.
   */
  readonly darfPlanungselementAblegen = (
    drag: CdkDrag<TSchichtplanDragDaten>,
    drop: CdkDropList<TSchichtplanAblageziel>,
  ): boolean => {
    const dragDaten = drag.data;
    if (dragDaten.art === 'schicht') {
      const schicht = dragDaten.schicht;
      const istBisherigeZelle =
        schicht.datum === drop.data.datum && schicht.modellschichtId === drop.data.modellschichtId;
      const fremdeSchichtIds = drop.data.schichtIds.filter((id) => id !== schicht.id);
      return (
        this.kannSchichtenAblegen() &&
        drop.data.verfuegbar &&
        this.erlaubteMitarbeiterIds().includes(schicht.mitarbeiterId) &&
        (istBisherigeZelle ||
          ((drop.data.mehrfachbelegungErlaubt || fremdeSchichtIds.length === 0) &&
            !drop.data.mitarbeiterIds.includes(schicht.mitarbeiterId) &&
            this.schichtVerschiebungErlaubt()(schicht, drop.data)))
      );
    }
    const mitarbeiterId = dragDaten.mitarbeiterId;
    return (
      this.kannSchichtenAblegen() &&
      drop.data.verfuegbar &&
      this.erlaubteMitarbeiterIds().includes(mitarbeiterId) &&
      (drop.data.mehrfachbelegungErlaubt || drop.data.mitarbeiterIds.length === 0) &&
      !drop.data.mitarbeiterIds.includes(mitarbeiterId)
    );
  };

  /**
   * Übergibt eine gültige Mitarbeiter- oder Schichtablage an den Filialabschnitt.
   *
   * @param event - CDK-Ablageereignis mit den Daten des Planungselements.
   */
  handlePlanungselementDrop(
    event: CdkDragDrop<TSchichtplanAblageziel, unknown, TSchichtplanDragDaten>,
  ): void {
    const dragDaten = event.item.data;
    const ziel = event.container.data;
    if (dragDaten.art === 'schicht') {
      const schicht = dragDaten.schicht;
      if (schicht.datum === ziel.datum && schicht.modellschichtId === ziel.modellschichtId) return;
      const fremdeSchichtIds = ziel.schichtIds.filter((id) => id !== schicht.id);
      if (
        !this.kannSchichtenAblegen() ||
        !ziel.verfuegbar ||
        !this.erlaubteMitarbeiterIds().includes(schicht.mitarbeiterId) ||
        (!ziel.mehrfachbelegungErlaubt && fremdeSchichtIds.length > 0) ||
        ziel.mitarbeiterIds.includes(schicht.mitarbeiterId) ||
        !this.schichtVerschiebungErlaubt()(schicht, ziel)
      ) {
        return;
      }
      this.schichtVerschieben.emit({
        schicht,
        datum: ziel.datum,
        modellschichtId: ziel.modellschichtId,
      });
      return;
    }
    const mitarbeiterId = dragDaten.mitarbeiterId;
    if (
      !this.kannSchichtenAblegen() ||
      !ziel.verfuegbar ||
      !this.erlaubteMitarbeiterIds().includes(mitarbeiterId) ||
      (!ziel.mehrfachbelegungErlaubt && ziel.mitarbeiterIds.length > 0) ||
      ziel.mitarbeiterIds.includes(mitarbeiterId)
    ) {
      return;
    }
    this.schichtAblegen.emit({
      mitarbeiterId,
      datum: ziel.datum,
      modellschichtId: ziel.modellschichtId,
    });
  }

  /**
   * Formatiert die Lohnzeit einer Schicht für die Anzeige.
   *
   * @param schicht - Darzustellende Schicht.
   * @returns Lohnzeit in Stunden und Minuten.
   */
  formatLohnzeit(schicht: ISchichtEintrag): string {
    const minuten = calculateSchichtLohnzeitMinuten(schicht);
    const stunden = Math.floor(minuten / 60);
    const restMinuten = minuten % 60;
    return restMinuten === 0 ? `${stunden} Std.` : `${stunden} Std. ${restMinuten} Min.`;
  }

  /**
   * Liefert den aktuellen Anzeigenamen eines referenzierten Mitarbeiters.
   *
   * @param mitarbeiterId - Dokument-ID des Mitarbeiters.
   * @returns Nachname und Vorname oder ein verständlicher Ersatztext.
   */
  getMitarbeiterAnzeigename(mitarbeiterId: string): string {
    const mitarbeiter = this.mitarbeiterNachId().get(mitarbeiterId);
    return mitarbeiter
      ? `${mitarbeiter.person.nachname}, ${mitarbeiter.person.vorname}`.trim()
      : 'Mitarbeiter nicht verfügbar';
  }

  /**
   * Liefert die aktuelle Darstellungsfarbe eines referenzierten Mitarbeiters.
   *
   * @param mitarbeiterId - Dokument-ID des Mitarbeiters.
   * @returns Aufgelöste Darstellungsfarbe oder `null`.
   */
  getMitarbeiterFarbe(mitarbeiterId: string): string | null {
    return getMitarbeiterFarbe(this.mitarbeiterNachId().get(mitarbeiterId)?.farbkennung);
  }
}

function createTage(
  zeitraumStart: string,
  zeitraumEnde: string,
  kalendertage: readonly IDienstplanKalendertag[],
  modellschichten: readonly IModellschichtMomentaufnahmeEintrag[],
  schichten: readonly ISchichtEintrag[],
  konfliktSchichtIds: ReadonlySet<string>,
): TSchichtplanTag[] {
  const schichtenNachZelle = new Map<string, ISchichtEintrag[]>();
  for (const schicht of schichten) {
    const schluessel = getZellenschluessel(schicht.datum, schicht.modellschichtId);
    schichtenNachZelle.set(schluessel, [...(schichtenNachZelle.get(schluessel) ?? []), schicht]);
  }

  const tage: TSchichtplanTag[] = [];
  const kalendertageNachDatum = new Map(kalendertage.map((eintrag) => [eintrag.datum, eintrag]));
  const datum = new Date(`${zeitraumStart}T12:00:00Z`);
  const ende = new Date(`${zeitraumEnde}T12:00:00Z`);
  while (datum <= ende) {
    const isoDatum = datum.toISOString().slice(0, 10);
    const kalendertag = kalendertageNachDatum.get(isoDatum);
    if (!kalendertag) {
      throw new Error('Der Kalendertag wurde im Monatsplan nicht gefunden.');
    }
    tage.push({
      datum: isoDatum,
      wochentagBezeichnung: new Intl.DateTimeFormat('de-DE', {
        timeZone: 'UTC',
        weekday: 'long',
      }).format(datum),
      datumBezeichnung: new Intl.DateTimeFormat('de-DE', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(datum),
      oeffnungszeitBezeichnung: kalendertag.oeffnungsregel.geoeffnet
        ? `${kalendertag.oeffnungsregel.beginnLokalzeit}–${kalendertag.oeffnungsregel.endeLokalzeit}`
        : 'Geschlossen',
      kalendereigenschaftBezeichnung: getKalendereigenschaftBezeichnung(kalendertag),
      hervorhebung: getKalendertagHervorhebung(kalendertag),
      zellen: modellschichten.map((modellschicht) => {
        const rasterzeit =
          kalendertag.rasterzeiten.find((eintrag) => {
            return eintrag.modellschichtId === modellschicht.id;
          }) ?? null;
        const zellenschichten = (
          schichtenNachZelle.get(getZellenschluessel(isoDatum, modellschicht.id)) ?? []
        )
          .slice()
          .sort((a, b) => a.id.localeCompare(b.id));
        return {
          modellschicht,
          rasterzeit,
          schichten: zellenschichten,
          schichtIds: zellenschichten.map((schicht) => schicht.id),
          mitarbeiterIds: zellenschichten.map((schicht) => schicht.mitarbeiterId),
          hatKonflikt: zellenschichten.some((schicht) => konfliktSchichtIds.has(schicht.id)),
        };
      }),
    });
    datum.setUTCDate(datum.getUTCDate() + 1);
  }
  return tage;
}

function getKalendereigenschaftBezeichnung(kalendertag: IDienstplanKalendertag): string | null {
  const bezeichnungen = new Set<string>();
  if (kalendertag.gesetzlicherFeiertag) {
    bezeichnungen.add(kalendertag.gesetzlicherFeiertag.bezeichnung);
  }
  if (kalendertag.bezeichnung) bezeichnungen.add(kalendertag.bezeichnung);
  for (const sondertag of kalendertag.aktiveSondertage) {
    bezeichnungen.add(sondertag.bezeichnung);
  }
  return bezeichnungen.size > 0 ? [...bezeichnungen].join(' · ') : null;
}

function getKalendertagHervorhebung(
  kalendertag: IDienstplanKalendertag,
): TSchichtplanTag['hervorhebung'] {
  if (kalendertag.gesetzlicherFeiertag) return 'feiertag';
  if (kalendertag.oeffnungsregelQuelle !== 'wochentag' || kalendertag.aktiveSondertage.length > 0) {
    return 'sondertag';
  }
  return kalendertag.istSonntag ? 'sonntag' : null;
}

function getZellenschluessel(datum: string, modellschichtId: string): string {
  return JSON.stringify([datum, modellschichtId]);
}
