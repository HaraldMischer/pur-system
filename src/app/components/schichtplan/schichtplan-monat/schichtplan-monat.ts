// pur-system/src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.ts

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  IDienstplanEintrag,
  IDienstplanVersionEintrag,
} from '../../../commons/models/domain/dienstplan';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';

type TSchichtplanTag = {
  readonly datum: string;
  readonly bezeichnung: string;
  readonly schichten: readonly ISchichtEintrag[];
};

@Component({
  selector: 'app-schichtplan-monat',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './schichtplan-monat.html',
  styleUrl: './schichtplan-monat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchichtplanMonat {
  // ===== Öffentliche API ======================

  readonly dienstplan = input.required<IDienstplanEintrag>();
  readonly versionen = input.required<readonly IDienstplanVersionEintrag[]>();
  readonly schichten = input.required<readonly ISchichtEintrag[]>();
  readonly mitarbeiter = input<readonly IMitarbeiterEintrag[]>([]);
  readonly darfSchreiben = input(false);
  readonly schichtAnlegen = output<string>();
  readonly schichtBearbeiten = output<ISchichtEintrag>();

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
  readonly mitarbeiterNachId = computed(() => {
    return new Map(this.mitarbeiter().map((mitarbeiter) => [mitarbeiter.id, mitarbeiter]));
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
      dienstplan.zeitzone,
      schichten,
    );
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Formatiert den Zeitraum einer Schicht in der Dienstplan-Zeitzone.
   *
   * @param schicht - Darzustellende Schicht.
   * @returns Formatierter Beginn und formatiertes Ende.
   */
  formatSchichtzeit(schicht: ISchichtEintrag): string {
    const zeitzone = this.dienstplan().zeitzone;
    const formatter = new Intl.DateTimeFormat('de-DE', {
      timeZone: zeitzone,
      hour: '2-digit',
      minute: '2-digit',
    });
    const folgetag =
      formatIsoDatum(schicht.beginn.toDate(), zeitzone) !==
      formatIsoDatum(schicht.ende.toDate(), zeitzone);
    return `${formatter.format(schicht.beginn.toDate())}–${formatter.format(schicht.ende.toDate())}${folgetag ? ' (Folgetag)' : ''}`;
  }

  /**
   * Berechnet die Nettoarbeitszeit einer Schicht für die Anzeige.
   *
   * @param schicht - Darzustellende Schicht.
   * @returns Arbeitszeit in Stunden und Minuten.
   */
  formatArbeitszeit(schicht: ISchichtEintrag): string {
    const minuten =
      (schicht.ende.toMillis() - schicht.beginn.toMillis()) / 60_000 - schicht.pauseMinuten;
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
   * Liefert die aktuelle Farbkennung eines referenzierten Mitarbeiters.
   *
   * @param mitarbeiterId - Dokument-ID des Mitarbeiters.
   * @returns Gespeicherte Farbkennung oder `null`.
   */
  getMitarbeiterFarbkennung(mitarbeiterId: string): string | null {
    return this.mitarbeiterNachId().get(mitarbeiterId)?.farbkennung ?? null;
  }
}

function createTage(
  zeitraumStart: string,
  zeitraumEnde: string,
  zeitzone: string,
  schichten: readonly ISchichtEintrag[],
): TSchichtplanTag[] {
  const schichtenNachDatum = new Map<string, ISchichtEintrag[]>();
  for (const schicht of schichten) {
    const datum = formatIsoDatum(schicht.beginn.toDate(), zeitzone);
    schichtenNachDatum.set(datum, [...(schichtenNachDatum.get(datum) ?? []), schicht]);
  }

  const tage: TSchichtplanTag[] = [];
  const datum = new Date(`${zeitraumStart}T12:00:00Z`);
  const ende = new Date(`${zeitraumEnde}T12:00:00Z`);
  while (datum <= ende) {
    const isoDatum = datum.toISOString().slice(0, 10);
    tage.push({
      datum: isoDatum,
      bezeichnung: new Intl.DateTimeFormat('de-DE', {
        timeZone: 'UTC',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      }).format(datum),
      schichten: (schichtenNachDatum.get(isoDatum) ?? []).sort((a, b) => {
        return a.beginn.toMillis() - b.beginn.toMillis();
      }),
    });
    datum.setUTCDate(datum.getUTCDate() + 1);
  }
  return tage;
}

function formatIsoDatum(datum: Date, zeitzone: string): string {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: zeitzone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(datum);
  const wert = (typ: Intl.DateTimeFormatPartTypes): string => {
    return teile.find((teil) => teil.type === typ)?.value ?? '';
  };
  return `${wert('year')}-${wert('month')}-${wert('day')}`;
}
