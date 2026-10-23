// pur-system/src/app/components/schichtplan/dienstplan-ansichtsbereich/dienstplan-ansichtsbereich.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import {
  formatSchichtDatum,
  formatSchichtUhrzeit,
} from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { createAnzeigename } from '../../../commons/utils/mitarbeiter/mitarbeiter-dokument';
import { getMitarbeiterFarbe } from '../../../commons/utils/mitarbeiter/mitarbeiter-farbkennung';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';

// ===== Konstanten & Typen ===================

type TDienstplanAnsichtSchicht = {
  readonly id: string;
  readonly mitarbeiterAnzeigename: string;
  readonly mitarbeiterFarbe?: string;
  readonly zeitBezeichnung: string;
  readonly pauseBezeichnung: string;
};

type TDienstplanAnsichtTag = {
  readonly datum: string;
  readonly datumBezeichnung: string;
  readonly schichten: readonly TDienstplanAnsichtSchicht[];
};

@Component({
  selector: 'app-dienstplan-ansichtsbereich',
  imports: [MatButtonModule],
  templateUrl: './dienstplan-ansichtsbereich.html',
  styleUrl: './dienstplan-ansichtsbereich.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanAnsichtsbereich {
  // ===== Interne Dependency Injection =========

  readonly dienstplanStore = inject(DienstplanStore);
  private readonly mitarbeiterStore = inject(MitarbeiterStore);

  // ===== Öffentliche API ======================

  readonly filiale = input.required<IFilialeEintrag>();
  readonly pfad = input.required<IFilialPfad>();
  readonly monat = input.required<string>();

  // ===== Interne Ableitungen ==================

  private readonly loadDienstplanEffect = effect(() => {
    const pfad = this.pfad();
    const monat = this.monat();
    untracked(() => {
      void this.loadDienstplan(pfad, monat);
    });
  });

  // ===== Öffentliche Ableitungen ==============

  readonly kontext = computed(() => {
    return this.dienstplanStore.getDienstplanKontext(this.pfad());
  });
  readonly dienstplan = computed(() => {
    return this.kontext()?.dienstplaene.find((eintrag) => eintrag.id === this.monat()) ?? null;
  });
  readonly veroeffentlichteVersion = computed(() => {
    const dienstplan = this.dienstplan();
    const versionId = dienstplan?.veroeffentlichteVersionId;
    if (!versionId) return null;
    return (
      this.kontext()?.versionen.find((version) => {
        return version.id === versionId && version.status === 'veroeffentlicht';
      }) ?? null
    );
  });
  readonly download = computed(() => {
    return this.kontext()?.download ?? false;
  });
  readonly isLoaded = computed(() => {
    const kontext = this.kontext();
    return Boolean(kontext && (kontext.vollstaendigGeladen || kontext.monatsmodi[this.monat()]));
  });
  readonly ladeFehler = computed(() => {
    return this.kontext()?.error ?? null;
  });
  readonly zeitraumBezeichnung = computed(() => {
    const dienstplan = this.dienstplan();
    if (!dienstplan) return '';
    return `${formatDatum(dienstplan.zeitraumStart)} bis ${formatDatum(dienstplan.zeitraumEnde)}`;
  });
  readonly veroeffentlichungBezeichnung = computed(() => {
    const version = this.veroeffentlichteVersion();
    const zeitzone = this.dienstplan()?.zeitzone;
    if (!version) return '';
    if (!version.veroeffentlichtAm || !zeitzone) return `Version ${version.nummer}`;
    const datum = new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: zeitzone,
    }).format(version.veroeffentlichtAm.toDate());
    return `Version ${version.nummer} · veröffentlicht am ${datum} Uhr`;
  });
  readonly tage = computed<readonly TDienstplanAnsichtTag[]>(() => {
    const dienstplan = this.dienstplan();
    const versionId = this.veroeffentlichteVersion()?.id;
    if (!dienstplan || !versionId) return [];

    const schichtenNachDatum = new Map<string, ISchichtEintrag[]>();
    for (const schicht of this.kontext()?.schichten ?? []) {
      if (schicht.versionId !== versionId) continue;
      const schichten = schichtenNachDatum.get(schicht.datum) ?? [];
      schichten.push(schicht);
      schichtenNachDatum.set(schicht.datum, schichten);
    }
    return [...schichtenNachDatum.entries()]
      .sort(([datumA], [datumB]) => datumA.localeCompare(datumB))
      .map(([datum, schichten]) => {
        return {
          datum,
          datumBezeichnung: formatDatumMitWochentag(datum),
          schichten: schichten
            .sort((a, b) => a.beginn.toMillis() - b.beginn.toMillis())
            .map((schicht) => this.createSchichtAnzeige(schicht, dienstplan.zeitzone)),
        };
      });
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt den veröffentlichten Monatsplan erneut, falls der letzte Zugriff fehlgeschlagen ist.
   */
  retryLoad(): void {
    void this.loadDienstplan(this.pfad(), this.monat());
  }

  // ===== Interne Helfer =======================

  private async loadDienstplan(pfad: IFilialPfad, monat: string): Promise<void> {
    try {
      await this.dienstplanStore.loadDienstplanMonat(pfad, monat, true, 'networkOnly');
    } catch {
      // Der Store stellt den verständlichen Fehler im Filialkontext bereit.
    }
  }

  private createSchichtAnzeige(
    schicht: ISchichtEintrag,
    zeitzone: string,
  ): TDienstplanAnsichtSchicht {
    const mitarbeiter = this.mitarbeiterStore.getMitarbeiterById(
      schicht.unternehmerId,
      schicht.firmaId,
      schicht.mitarbeiterId,
    );
    const endeDatum = formatSchichtDatum(schicht.ende, zeitzone);
    const mitarbeiterFarbe = getMitarbeiterFarbe(mitarbeiter?.farbkennung);
    return {
      id: schicht.id,
      mitarbeiterAnzeigename: mitarbeiter
        ? createAnzeigename(mitarbeiter.person)
        : 'Mitarbeiter nicht verfügbar',
      zeitBezeichnung: `${formatSchichtUhrzeit(schicht.beginn, zeitzone)}–${formatSchichtUhrzeit(
        schicht.ende,
        zeitzone,
      )}${endeDatum !== schicht.datum ? ' (+1 Tag)' : ''} Uhr`,
      pauseBezeichnung: `Bezahlte Pause: ${schicht.pauseMinuten ?? 0} Min.`,
      ...(mitarbeiterFarbe ? { mitarbeiterFarbe } : {}),
    };
  }
}

function formatDatum(datum: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${datum}T12:00:00Z`));
}

function formatDatumMitWochentag(datum: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${datum}T12:00:00Z`));
}
