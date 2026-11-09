// pur-system/src/app/components/schichtplan/dienstplan-monatsliste/dienstplan-monatsliste.ts

import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  IDienstplanEintrag,
  IDienstplanVersionEintrag,
} from '../../../commons/models/domain/dienstplan';
import { IDienstplanKalendertag } from '../../../commons/models/domain/dienstplan-kalendertag';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import { ITagesschichtEintrag } from '../../../commons/models/domain/schichtmodell';
import { calculateSchichtLohnzeitMinuten } from '../../../commons/utils/dienstplan/schicht-zeit';
import {
  createGeschlosseneZeitachsenPositionen,
  createDienstplanZeitachse,
  createDienstplanZeitachsenPositionen,
  IDienstplanZeitachsenPosition,
} from '../../../commons/utils/dienstplan/dienstplan-zeitachse';
import {
  TSchichtplanDragDaten,
  TSchichtplanMehrfachbelegungAblehnung,
  TSchichtplanTagesschichtMitarbeiterAblage,
  TSchichtplanTagesschichtauswahl,
  TSchichtplanTagesschichtVerschiebung,
} from '../dienstplan-planung.types';

type TSchichtplanTagesschichtZelle = {
  readonly tagesschicht: ITagesschichtEintrag;
  readonly schichten: readonly ISchichtEintrag[];
  readonly mitarbeiterIds: readonly string[];
  readonly hatKonflikt: boolean;
  readonly konfliktMeldungen: readonly string[];
  readonly zeitachsenposition: IDienstplanZeitachsenPosition;
};

type TSchichtplanListentag = {
  readonly kalendertag: IDienstplanKalendertag;
  readonly wochentagBezeichnung: string;
  readonly datumBezeichnung: string;
  readonly kalendereigenschaftBezeichnung: string | null;
  readonly hervorhebung: 'sonntag' | 'feiertag' | 'sondertag' | null;
  readonly geschlosseneBereiche: readonly IDienstplanZeitachsenPosition[];
  readonly zellen: readonly TSchichtplanTagesschichtZelle[];
};

@Component({
  selector: 'app-dienstplan-monatsliste',
  imports: [CdkDrag, CdkDropList, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './dienstplan-monatsliste.html',
  styleUrl: './dienstplan-monatsliste.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanMonatsliste {
  // ===== Öffentliche API ======================

  readonly dienstplan = input.required<IDienstplanEintrag>();
  readonly aktiveVersion = input.required<IDienstplanVersionEintrag | null>();
  readonly schichten = input.required<readonly ISchichtEintrag[]>();
  readonly tagesschichten = input.required<readonly ITagesschichtEintrag[]>();
  readonly konfliktSchichtIds = input<ReadonlySet<string>>(new Set());
  readonly konfliktMeldungenNachSchichtId = input<ReadonlyMap<string, readonly string[]>>(
    new Map(),
  );
  readonly mitarbeiter = input<readonly IMitarbeiterEintrag[]>([]);
  readonly erlaubteMitarbeiterIds = input<readonly string[]>([]);
  readonly darfSchreiben = input(false);
  readonly schreibvorgang = input(false);
  readonly tagesschichtAblegen = output<TSchichtplanTagesschichtMitarbeiterAblage>();
  readonly tagesschichtAnlegen = output<TSchichtplanTagesschichtauswahl>();
  readonly tagesschichtVerschieben = output<TSchichtplanTagesschichtVerschiebung>();
  readonly tagesschichtBearbeiten = output<ISchichtEintrag>();
  readonly mehrfachbelegungAbgelehnt = output<TSchichtplanMehrfachbelegungAblehnung>();
  readonly mitarbeiterBereitsEingeplant = output<void>();

  // ===== Öffentliche Ableitungen ==============

  readonly mitarbeiterNachId = computed(() => {
    return new Map(this.mitarbeiter().map((mitarbeiter) => [mitarbeiter.id, mitarbeiter]));
  });
  readonly kannSchichtenAblegen = computed(() => {
    return (
      this.darfSchreiben() && this.aktiveVersion()?.status === 'entwurf' && !this.schreibvorgang()
    );
  });
  readonly zeitachse = computed(() => {
    const zeitfenster = this.dienstplan().kalendertage.flatMap((kalendertag) => {
      if (!kalendertag.oeffnungsregel.geoeffnet) return [];
      return [
        {
          beginn: {
            lokalzeit: kalendertag.oeffnungsregel.beginnLokalzeit,
            amFolgetag: false,
          },
          ende: {
            lokalzeit: kalendertag.oeffnungsregel.endeLokalzeit,
            amFolgetag: kalendertag.oeffnungsregel.endetAmFolgetag,
          },
        },
      ];
    });
    return createDienstplanZeitachse(zeitfenster);
  });
  readonly zeitachsenbreite = computed(() => {
    return this.zeitachse().stundenAnzahl * 40;
  });
  readonly tage = computed<readonly TSchichtplanListentag[]>(() => {
    const dienstplanId = this.dienstplan().id;
    const versionId = this.aktiveVersion()?.id;
    const zeitachse = this.zeitachse();
    const tagesschichten = this.tagesschichten().filter((tagesschicht) => {
      return tagesschicht.dienstplanId === dienstplanId;
    });
    const schichten = versionId
      ? this.schichten().filter((schicht) => schicht.versionId === versionId)
      : [];
    return this.dienstplan().kalendertage.map((kalendertag) => {
      const datum = new Date(`${kalendertag.datum}T12:00:00Z`);
      const kalendereigenschaftBezeichnungen = new Set<string>();
      if (kalendertag.gesetzlicherFeiertag) {
        kalendereigenschaftBezeichnungen.add(kalendertag.gesetzlicherFeiertag.bezeichnung);
      }
      if (kalendertag.bezeichnung) {
        kalendereigenschaftBezeichnungen.add(kalendertag.bezeichnung);
      }
      for (const sondertag of kalendertag.aktiveSondertage) {
        kalendereigenschaftBezeichnungen.add(sondertag.bezeichnung);
      }
      const zellenOhnePosition = tagesschichten
        .filter((tagesschicht) => tagesschicht.datum === kalendertag.datum)
        .sort((a, b) => a.reihenfolge - b.reihenfolge)
        .map((tagesschicht) => {
          const belegungen = schichten.filter((schicht) => {
            return schicht.tagesschichtId === tagesschicht.id;
          });
          const konfliktMeldungen = new Set(
            belegungen.flatMap((schicht) => {
              return this.konfliktMeldungenNachSchichtId().get(schicht.id) ?? [];
            }),
          );
          return {
            tagesschicht,
            schichten: belegungen,
            mitarbeiterIds: belegungen.map((schicht) => schicht.mitarbeiterId),
            hatKonflikt: belegungen.some((schicht) => {
              return this.konfliktSchichtIds().has(schicht.id);
            }),
            konfliktMeldungen: [...konfliktMeldungen],
          };
        });
      const positionen = createDienstplanZeitachsenPositionen(
        zellenOhnePosition.map((zelle) => {
          return {
            id: zelle.tagesschicht.id,
            beginn: {
              lokalzeit: zelle.tagesschicht.kernbeginnLokalzeit,
              amFolgetag: zelle.tagesschicht.kernbeginnAmFolgetag,
            },
            ende: {
              lokalzeit: zelle.tagesschicht.kernendeLokalzeit,
              amFolgetag: zelle.tagesschicht.kernendeAmFolgetag,
            },
          };
        }),
        zeitachse,
      );
      const positionenNachId = new Map(positionen.map((position) => [position.id, position]));
      const zellen: TSchichtplanTagesschichtZelle[] = zellenOhnePosition.map((zelle) => {
        const zeitachsenposition = positionenNachId.get(zelle.tagesschicht.id);
        if (!zeitachsenposition) {
          throw new Error('Die Tagesschicht konnte nicht auf der Zeitachse positioniert werden.');
        }
        return { ...zelle, zeitachsenposition };
      });
      const oeffnungsregel = kalendertag.oeffnungsregel;
      const geschlosseneBereiche = createGeschlosseneZeitachsenPositionen(
        oeffnungsregel.geoeffnet
          ? {
              beginn: {
                lokalzeit: oeffnungsregel.beginnLokalzeit,
                amFolgetag: false,
              },
              ende: {
                lokalzeit: oeffnungsregel.endeLokalzeit,
                amFolgetag: oeffnungsregel.endetAmFolgetag,
              },
            }
          : null,
        zeitachse,
      );
      return {
        kalendertag,
        wochentagBezeichnung: formatWochentag(datum),
        datumBezeichnung: formatDatum(datum),
        kalendereigenschaftBezeichnung:
          kalendereigenschaftBezeichnungen.size > 0
            ? [...kalendereigenschaftBezeichnungen].join(' · ')
            : null,
        hervorhebung: getKalendertagHervorhebung(kalendertag),
        geschlosseneBereiche,
        zellen,
      };
    });
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Öffnet die Belegung einer Tagesschicht, sofern ihre Belegungsgrenze nicht erreicht ist.
   *
   * @param tagesschicht - Ausgewählte Tagesschicht.
   * @param istBelegt - Gibt an, ob bereits mindestens eine Belegung vorhanden ist.
   */
  handleTagesschichtAnlegen(tagesschicht: ITagesschichtEintrag, istBelegt: boolean): void {
    if (!tagesschicht.mehrfachbelegungErlaubt && istBelegt) return;
    this.tagesschichtAnlegen.emit({
      datum: tagesschicht.datum,
      tagesschichtId: tagesschicht.id,
    });
  }

  /**
   * Übernimmt eine Mitarbeiter- oder Schichtablage auf eine konkrete Tagesschicht.
   *
   * @param event - CDK-Ablageereignis mit dem Planungselement und der Zielschicht.
   */
  handleTagesschichtDrop(
    event: CdkDragDrop<TSchichtplanTagesschichtZelle, unknown, TSchichtplanDragDaten>,
  ): void {
    const ziel = event.container.data;
    const dragDaten = event.item.data;
    if (!this.kannSchichtenAblegen()) return;
    if (
      !ziel.tagesschicht.mehrfachbelegungErlaubt &&
      ziel.schichten.some(
        (schicht) => schicht.id !== (dragDaten.art === 'schicht' ? dragDaten.schicht.id : ''),
      )
    ) {
      this.mehrfachbelegungAbgelehnt.emit({
        schichtBezeichnung: ziel.tagesschicht.bezeichnung,
      });
      return;
    }
    if (dragDaten.art === 'schicht') {
      if (!this.erlaubteMitarbeiterIds().includes(dragDaten.schicht.mitarbeiterId)) return;
      if (dragDaten.schicht.tagesschichtId === ziel.tagesschicht.id) return;
      if (ziel.mitarbeiterIds.includes(dragDaten.schicht.mitarbeiterId)) {
        this.mitarbeiterBereitsEingeplant.emit();
        return;
      }
      this.tagesschichtVerschieben.emit({
        schicht: dragDaten.schicht,
        datum: ziel.tagesschicht.datum,
        tagesschichtId: ziel.tagesschicht.id,
      });
      return;
    }
    if (!this.erlaubteMitarbeiterIds().includes(dragDaten.mitarbeiterId)) return;
    if (ziel.mitarbeiterIds.includes(dragDaten.mitarbeiterId)) {
      this.mitarbeiterBereitsEingeplant.emit();
      return;
    }
    this.tagesschichtAblegen.emit({
      mitarbeiterId: dragDaten.mitarbeiterId,
      datum: ziel.tagesschicht.datum,
      tagesschichtId: ziel.tagesschicht.id,
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
}

function formatWochentag(datum: Date): string {
  const wochentag = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'UTC',
    weekday: 'short',
  }).format(datum);
  return `${wochentag}.`;
}

function formatDatum(datum: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(datum);
}

function getKalendertagHervorhebung(
  kalendertag: IDienstplanKalendertag,
): TSchichtplanListentag['hervorhebung'] {
  if (kalendertag.gesetzlicherFeiertag) return 'feiertag';
  if (kalendertag.oeffnungsregelQuelle !== 'wochentag' || kalendertag.aktiveSondertage.length > 0) {
    return 'sondertag';
  }
  return kalendertag.istSonntag ? 'sonntag' : null;
}
