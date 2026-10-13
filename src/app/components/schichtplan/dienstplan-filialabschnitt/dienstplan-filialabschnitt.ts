// pur-system/src/app/components/schichtplan/dienstplan-filialabschnitt/dienstplan-filialabschnitt.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { DienstplanAnlegenDialog } from '../dienstplan-anlegen-dialog/dienstplan-anlegen-dialog';
import { SchichtBearbeitenDialog } from '../schicht-bearbeiten-dialog/schicht-bearbeiten-dialog';
import {
  SchichtplanMonat,
  TSchichtplanRasterauswahl,
} from '../schichtplan-monat/schichtplan-monat';

@Component({
  selector: 'app-dienstplan-filialabschnitt',
  imports: [MatButtonModule, SchichtplanMonat],
  templateUrl: './dienstplan-filialabschnitt.html',
  styleUrl: './dienstplan-filialabschnitt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanFilialabschnitt {
  // ===== Interne Dependency Injection =========

  readonly benutzerStore = inject(BenutzerStore);
  readonly dienstplanStore = inject(DienstplanStore);
  readonly mitarbeiterStore = inject(MitarbeiterStore);
  readonly schichtmodellStore = inject(SchichtmodellStore);
  private readonly dialog = inject(MatDialog);

  // ===== Öffentliche API ======================

  readonly filiale = input.required<IFilialeEintrag>();
  readonly pfad = input.required<IFilialPfad>();
  readonly monat = input.required<string>();
  readonly planungsmodus = input(false);

  // ===== Interner State =======================

  readonly aktionsfehler = signal<string | null>(null);

  // ===== Interne Ableitungen ==================

  private readonly loadDienstplanEffect = effect(() => {
    const pfad = this.pfad();
    const monat = this.monat();
    const nurVeroeffentlicht = this.benutzerStore.benutzerProfil()?.userRole === 'mitarbeiter';
    untracked(() => {
      this.aktionsfehler.set(null);
      void this.loadDienstplan(pfad, monat, nurVeroeffentlicht);
    });
  });

  // ===== Öffentliche Ableitungen ==============

  readonly kontext = computed(() => {
    return this.dienstplanStore.getDienstplanKontext(this.pfad());
  });
  readonly dienstplan = computed(() => {
    return this.kontext()?.dienstplaene.find((eintrag) => eintrag.id === this.monat()) ?? null;
  });
  readonly versionen = computed(() => {
    const dienstplanId = this.dienstplan()?.id;
    return dienstplanId
      ? (this.kontext()?.versionen.filter((version) => {
          return version.dienstplanId === dienstplanId;
        }) ?? [])
      : [];
  });
  readonly schichten = computed(() => {
    const versionIds = new Set(this.versionen().map((version) => version.id));
    return this.kontext()?.schichten.filter((schicht) => versionIds.has(schicht.versionId)) ?? [];
  });
  readonly modellschichten = computed(() => {
    const dienstplanId = this.dienstplan()?.id;
    return dienstplanId
      ? (this.kontext()?.modellschichten.filter((modellschicht) => {
          return modellschicht.dienstplanId === dienstplanId;
        }) ?? [])
      : [];
  });
  readonly entwurfVersion = computed(() => {
    const entwurfId = this.dienstplan()?.entwurfVersionId;
    return this.versionen().find((version) => version.id === entwurfId) ?? null;
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
  readonly darfSchreiben = computed(() => {
    const profil = this.benutzerStore.benutzerProfil();
    const pfad = this.pfad();
    if (!this.planungsmodus() || !profil?.aktiv) return false;
    if (profil.userRole === 'master') return true;
    return (
      profil.userRole === 'office' &&
      profil.zugriffe[pfad.unternehmerId]?.[pfad.firmaId]?.includes(pfad.filialeId) === true
    );
  });
  readonly mitarbeiter = computed(() => {
    const pfad = this.pfad();
    return this.mitarbeiterStore
      .getMitarbeiter(pfad.unternehmerId, pfad.firmaId)
      .filter((eintrag) => eintrag.aktiv && eintrag.filialIds.includes(pfad.filialeId));
  });
  readonly schichtMitarbeiter = computed<readonly IMitarbeiterEintrag[]>(() => {
    const pfad = this.pfad();
    return [...new Set(this.schichten().map((schicht) => schicht.mitarbeiterId))]
      .map((mitarbeiterId) => {
        return this.mitarbeiterStore.getMitarbeiterById(
          pfad.unternehmerId,
          pfad.firmaId,
          mitarbeiterId,
        );
      })
      .filter((mitarbeiter): mitarbeiter is IMitarbeiterEintrag => mitarbeiter !== null);
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Wiederholt das Laden des Monatsplans dieser Filiale.
   */
  retryLoad(): void {
    void this.loadDienstplan(
      this.pfad(),
      this.monat(),
      this.benutzerStore.benutzerProfil()?.userRole === 'mitarbeiter',
    );
  }

  /**
   * Öffnet für diese Filiale und den ausgewählten Monat die Schichtmodellauswahl.
   */
  async openDienstplanDialog(): Promise<void> {
    if (!this.darfSchreiben()) return;
    this.aktionsfehler.set(null);
    try {
      await this.schichtmodellStore.loadSchichtmodelle(this.pfad());
    } catch {
      this.aktionsfehler.set(
        this.schichtmodellStore.getSchichtmodellKontext(this.pfad())?.error ??
          this.schichtmodellStore.error() ??
          'Die Schichtmodelle konnten nicht geladen werden.',
      );
      return;
    }
    const schichtmodelle =
      this.schichtmodellStore
        .getSchichtmodellKontext(this.pfad())
        ?.schichtmodelle.filter((bestand) => {
          return bestand.schichtmodell.aktiv && bestand.modellschichten.length > 0;
        }) ?? [];
    if (schichtmodelle.length === 0) {
      this.aktionsfehler.set(
        'Lege zuerst ein aktives Schichtmodell mit mindestens einer Schicht an.',
      );
      return;
    }
    this.dialog.open(DienstplanAnlegenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: { pfad: this.pfad(), monat: this.monat(), schichtmodelle },
    });
  }

  /**
   * Öffnet den Dialog zum Besetzen einer Rasterzelle.
   *
   * @param auswahl - Festgelegtes Datum und festgelegte Modellschicht.
   */
  openSchichtDialog(auswahl: TSchichtplanRasterauswahl): void {
    this.openSchichtDialogIntern(auswahl, undefined);
  }

  /**
   * Öffnet den Dialog zum Ändern einer vorhandenen Mitarbeiterschicht.
   *
   * @param schicht - Zu bearbeitende Mitarbeiterschicht.
   */
  openSchichtBearbeitenDialog(schicht: ISchichtEintrag): void {
    this.openSchichtDialogIntern({ datum: '', modellschichtId: schicht.modellschichtId }, schicht);
  }

  // ===== Interne Helfer =======================

  private openSchichtDialogIntern(
    auswahl: TSchichtplanRasterauswahl,
    schicht: ISchichtEintrag | undefined,
  ): void {
    const dienstplan = this.dienstplan();
    const version = this.entwurfVersion();
    if (!dienstplan || !version || !this.darfSchreiben()) return;
    this.aktionsfehler.set(null);
    const modellschicht = this.modellschichten().find((eintrag) => {
      return eintrag.id === auswahl.modellschichtId;
    });
    if (!modellschicht) {
      this.aktionsfehler.set('Die Modellschicht wurde im Monatsplan nicht gefunden.');
      return;
    }

    this.dialog.open(SchichtBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        pfad: { ...this.pfad(), dienstplanId: dienstplan.id, versionId: version.id },
        zeitzone: dienstplan.zeitzone,
        datum: auswahl.datum,
        mitarbeiter: this.mitarbeiter(),
        modellschicht,
        ...(schicht ? { schicht } : {}),
      },
    });
  }

  private async loadDienstplan(
    pfad: IFilialPfad,
    monat: string,
    nurVeroeffentlicht: boolean,
  ): Promise<void> {
    try {
      await this.dienstplanStore.loadDienstplanMonat(pfad, monat, nurVeroeffentlicht);
    } catch {
      // Der DienstplanStore stellt die benutzerfreundliche Fehlermeldung bereit.
    }
  }
}
