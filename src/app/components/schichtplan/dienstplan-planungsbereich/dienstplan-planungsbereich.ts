// pur-system/src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.ts

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
import { firstValueFrom } from 'rxjs';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import {
  IModellschichtMomentaufnahmeEintrag,
  ISchichtrastermodellBestand,
} from '../../../commons/models/domain/schichtmodell';
import { getDienstplanRasterzeit } from '../../../commons/utils/dienstplan/dienstplan-kalendertage';
import { createSchichtZeitstempelAusLokalzeiten } from '../../../commons/utils/dienstplan/schicht-lokalzeit';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { BestaetigungDialog } from '../../shared/bestaetigung-dialog/bestaetigung-dialog';
import { DienstplanAnlegenDialog } from '../dienstplan-anlegen-dialog/dienstplan-anlegen-dialog';
import { SchichtBearbeitenDialog } from '../schicht-bearbeiten-dialog/schicht-bearbeiten-dialog';
import {
  DienstplanMonatstabelle,
  TSchichtplanMitarbeiterAblage,
  TSchichtplanRasterauswahl,
} from '../dienstplan-monatstabelle/dienstplan-monatstabelle';

@Component({
  selector: 'app-dienstplan-planungsbereich',
  imports: [MatButtonModule, DienstplanMonatstabelle],
  templateUrl: './dienstplan-planungsbereich.html',
  styleUrl: './dienstplan-planungsbereich.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanPlanungsbereich {
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
  readonly entwurfSchichten = computed(() => {
    const entwurfId = this.entwurfVersion()?.id;
    return entwurfId
      ? this.schichten().filter((schicht) => {
          return schicht.versionId === entwurfId;
        })
      : [];
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
  readonly darfDienstplanLoeschenAnzeigen = computed(() => {
    const dienstplan = this.dienstplan();
    return Boolean(
      this.darfSchreiben() &&
      this.entwurfVersion() &&
      dienstplan &&
      !dienstplan.veroeffentlichteVersionId,
    );
  });
  readonly dienstplanLoeschenDeaktiviert = computed(() => {
    return this.dienstplanStore.inProgress() || this.entwurfSchichten().length > 0;
  });
  readonly dienstplanLoeschenHinweis = computed(() => {
    if (this.entwurfSchichten().length > 0) {
      return 'Lösche zuerst alle Schichten des Entwurfs.';
    }
    return 'Diesen leeren Dienstplan löschen.';
  });
  readonly mitarbeiter = computed(() => {
    const pfad = this.pfad();
    return this.mitarbeiterStore
      .getMitarbeiter(pfad.unternehmerId, pfad.firmaId)
      .filter((eintrag) => eintrag.aktiv && eintrag.filialIds.includes(pfad.filialeId));
  });
  readonly mitarbeiterIds = computed(() => {
    return this.mitarbeiter().map((mitarbeiter) => mitarbeiter.id);
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
    const schichtmodelle = await this.loadAktiveSchichtmodelle();
    if (!schichtmodelle) return;
    this.dialog.open(DienstplanAnlegenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        pfad: this.pfad(),
        monat: this.monat(),
        schichtmodelle,
      },
    });
  }

  /**
   * Löscht nach Bestätigung einen leeren, noch nie veröffentlichten Dienstplan.
   */
  async deleteDienstplan(): Promise<void> {
    const dienstplan = this.dienstplan();
    const version = this.entwurfVersion();
    if (!dienstplan || !version || !this.darfDienstplanLoeschenAnzeigen()) return;
    if (this.entwurfSchichten().length > 0 || this.dienstplanStore.inProgress()) {
      this.aktionsfehler.set('Lösche zuerst alle Schichten des Entwurfs.');
      return;
    }
    const bestaetigt = await firstValueFrom(
      this.dialog
        .open(BestaetigungDialog, {
          panelClass: ['pur-dialog__panel'],
          data: {
            titel: 'Dienstplan löschen',
            nachricht:
              'Möchtest du diesen Dienstplan wirklich löschen? Ein leere Entwurf kann danach neu angelegt werden.',
            bestaetigenText: 'Löschen',
          },
        })
        .afterClosed(),
    );
    if (!bestaetigt) return;

    this.aktionsfehler.set(null);
    try {
      await this.dienstplanStore.deleteDienstplan({
        ...this.pfad(),
        dienstplanId: dienstplan.id,
        versionId: version.id,
      });
    } catch (error) {
      this.aktionsfehler.set(
        error instanceof Error ? error.message : 'Der Dienstplan konnte nicht gelöscht werden.',
      );
    }
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

  /**
   * Legt nach einer gültigen Mitarbeiterablage unmittelbar eine Schicht an.
   *
   * @param ablage - Mitarbeiter, Datum und Modellschicht des Ablageziels.
   */
  async createSchichtAusAblage(ablage: TSchichtplanMitarbeiterAblage): Promise<void> {
    const dienstplan = this.dienstplan();
    const version = this.entwurfVersion();
    if (
      !dienstplan ||
      !version ||
      !this.darfSchreiben() ||
      this.dienstplanStore.inProgress() ||
      !this.mitarbeiterIds().includes(ablage.mitarbeiterId)
    ) {
      return;
    }
    const modellschicht = this.modellschichten().find((eintrag) => {
      return eintrag.id === ablage.modellschichtId;
    });
    if (!modellschicht) {
      this.aktionsfehler.set('Die Modellschicht wurde im Monatsplan nicht gefunden.');
      return;
    }

    this.aktionsfehler.set(null);
    try {
      const { beginn, ende } = createSchichtZeitstempelAusLokalzeiten(
        ablage.datum,
        this.getRasterzeit(ablage.datum, modellschicht),
        dienstplan.zeitzone,
      );
      const hatZeitkonflikt = this.hatGeladenenZeitkonflikt(
        ablage.mitarbeiterId,
        beginn.toMillis(),
        ende.toMillis(),
      );
      if (hatZeitkonflikt) {
        this.aktionsfehler.set(
          'Der Mitarbeiter ist in diesem Entwurf im gewählten Zeitraum bereits eingeplant.',
        );
        return;
      }
      await this.dienstplanStore.createSchicht(
        { ...this.pfad(), dienstplanId: dienstplan.id, versionId: version.id },
        {
          datum: ablage.datum,
          mitarbeiterId: ablage.mitarbeiterId,
          modellschichtId: modellschicht.id,
        },
      );
    } catch (error) {
      this.aktionsfehler.set(
        error instanceof Error ? error.message : 'Die Schicht konnte nicht gespeichert werden.',
      );
    }
  }

  // ===== Interne Helfer =======================

  /**
   * Prüft die aktiven Planungsstände aller bereits geladenen Filialkontexte auf eine Überschneidung.
   */
  private hatGeladenenZeitkonflikt(
    mitarbeiterId: string,
    beginnMillis: number,
    endeMillis: number,
  ): boolean {
    return Object.values(this.dienstplanStore.kontexte()).some((kontext) => {
      const aktiveVersionIds = new Set(
        kontext.dienstplaene.flatMap((dienstplan) => {
          const versionId = dienstplan.entwurfVersionId ?? dienstplan.veroeffentlichteVersionId;
          return versionId ? [versionId] : [];
        }),
      );
      return kontext.schichten.some((schicht) => {
        return (
          aktiveVersionIds.has(schicht.versionId) &&
          schicht.mitarbeiterId === mitarbeiterId &&
          beginnMillis < schicht.ende.toMillis() &&
          endeMillis > schicht.beginn.toMillis()
        );
      });
    });
  }

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
    const datum = schicht?.datum ?? auswahl.datum;
    let rasterzeit;
    try {
      rasterzeit = this.getRasterzeit(datum, modellschicht);
    } catch (error) {
      this.aktionsfehler.set(
        error instanceof Error ? error.message : 'Die Rasterzeit wurde nicht gefunden.',
      );
      return;
    }

    this.dialog.open(SchichtBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        pfad: { ...this.pfad(), dienstplanId: dienstplan.id, versionId: version.id },
        zeitzone: dienstplan.zeitzone,
        datum,
        mitarbeiter: this.mitarbeiter(),
        modellschicht,
        rasterzeit,
        ...(schicht ? { schicht } : {}),
      },
    });
  }

  private getRasterzeit(datum: string, modellschicht: IModellschichtMomentaufnahmeEintrag) {
    const kalendertag = this.dienstplan()?.kalendertage.find((eintrag) => {
      return eintrag.datum === datum;
    });
    if (!kalendertag) {
      throw new Error('Der Kalendertag wurde im Monatsplan nicht gefunden.');
    }
    return getDienstplanRasterzeit(kalendertag, modellschicht.id);
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

  private async loadAktiveSchichtmodelle(): Promise<readonly ISchichtrastermodellBestand[] | null> {
    this.aktionsfehler.set(null);
    try {
      await this.schichtmodellStore.loadSchichtmodelle(this.pfad());
    } catch {
      this.aktionsfehler.set(
        this.schichtmodellStore.getSchichtmodellKontext(this.pfad())?.error ??
          this.schichtmodellStore.error() ??
          'Die Schichtmodelle konnten nicht geladen werden.',
      );
      return null;
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
      return null;
    }
    return schichtmodelle;
  }
}
