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
import { ISchichtmodellBestand } from '../../../commons/models/domain/schichtmodell';
import { createDienstplanKalendertage } from '../../../commons/utils/dienstplan/dienstplan-kalendertage';
import { createMitarbeiterbelegungReferenzSchluessel } from '../../../commons/utils/dienstplan/mitarbeiterbelegung';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { MitarbeiterbelegungStore } from '../../../stores/domain/mitarbeiterbelegung.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { BestaetigungDialog } from '../../shared/bestaetigung-dialog/bestaetigung-dialog';
import { HinweisDialog } from '../../shared/hinweis-dialog/hinweis-dialog';
import {
  TSchichtplanMehrfachbelegungAblehnung,
  TSchichtplanTagesschichtMitarbeiterAblage,
  TSchichtplanTagesschichtauswahl,
  TSchichtplanTagesschichtVerschiebung,
} from '../dienstplan-planung.types';
import { DienstplanAnlegenDialog } from '../dienstplan-anlegen-dialog/dienstplan-anlegen-dialog';
import { DienstplanMonatsliste } from '../dienstplan-monatsliste/dienstplan-monatsliste';
import { SchichtBelegenDialog } from '../schicht-belegen-dialog/schicht-belegen-dialog';

@Component({
  selector: 'app-dienstplan-planungsbereich',
  imports: [MatButtonModule, DienstplanMonatsliste],
  templateUrl: './dienstplan-planungsbereich.html',
  styleUrl: './dienstplan-planungsbereich.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanPlanungsbereich {
  // ===== Interne Dependency Injection =========

  readonly benutzerStore = inject(BenutzerStore);
  readonly dienstplanStore = inject(DienstplanStore);
  readonly filialeinstellungStore = inject(FilialeinstellungStore);
  readonly mitarbeiterbelegungStore = inject(MitarbeiterbelegungStore);
  readonly mitarbeiterStore = inject(MitarbeiterStore);
  readonly schichtmodellStore = inject(SchichtmodellStore);
  private readonly dialog = inject(MatDialog);

  // ===== Öffentliche API ======================

  readonly filiale = input.required<IFilialeEintrag>();
  readonly pfad = input.required<IFilialPfad>();
  readonly monat = input.required<string>();
  readonly planungsmodus = input(false);
  readonly belegungsstandVerfuegbar = input(false);

  // ===== Interner State =======================

  readonly aktionsfehler = signal<string | null>(null);
  readonly aktionsmeldung = signal<string | null>(null);

  // ===== Interne Ableitungen ==================

  private readonly loadDienstplanEffect = effect(() => {
    const pfad = this.pfad();
    const monat = this.monat();
    const nurVeroeffentlicht = this.benutzerStore.benutzerProfil()?.userRole === 'mitarbeiter';
    untracked(() => {
      this.aktionsfehler.set(null);
      this.aktionsmeldung.set(null);
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
  readonly tagesschichten = computed(() => {
    const dienstplanId = this.dienstplan()?.id;
    return dienstplanId
      ? (this.kontext()?.tagesschichten.filter((tagesschicht) => {
          return tagesschicht.dienstplanId === dienstplanId;
        }) ?? [])
      : [];
  });
  readonly entwurfVersion = computed(() => {
    const entwurfId = this.dienstplan()?.entwurfVersionId;
    return this.versionen().find((version) => version.id === entwurfId) ?? null;
  });
  readonly aktiveVersion = computed(() => {
    const dienstplan = this.dienstplan();
    if (!dienstplan) return null;
    return (
      this.entwurfVersion() ??
      this.versionen().find((version) => {
        return version.id === dienstplan.veroeffentlichteVersionId;
      }) ??
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
  readonly entwurfSchichten = computed(() => {
    const entwurfId = this.entwurfVersion()?.id;
    return entwurfId
      ? this.schichten().filter((schicht) => {
          return schicht.versionId === entwurfId;
        })
      : [];
  });
  readonly unbesetzteSchichtplaetze = computed(() => {
    if (!this.dienstplan() || !this.entwurfVersion()) return 0;
    const belegteIds = new Set(this.entwurfSchichten().map((schicht) => schicht.tagesschichtId));
    return this.tagesschichten().filter((tagesschicht) => {
      return !belegteIds.has(tagesschicht.id);
    }).length;
  });
  readonly konfliktMeldungenNachSchichtId = computed(() => {
    const dienstplanId = this.dienstplan()?.id;
    const versionId = this.entwurfVersion()?.id;
    const pfad = this.pfad();
    if (!dienstplanId || !versionId) return new Map<string, readonly string[]>();
    const meldungenNachSchichtId = new Map<string, Set<string>>();
    for (const konflikt of this.mitarbeiterbelegungStore.konflikte()) {
      for (const belegung of konflikt.belegungen) {
        if (
          belegung.filialeId !== pfad.filialeId ||
          belegung.dienstplanId !== dienstplanId ||
          belegung.versionId !== versionId
        ) {
          continue;
        }
        const meldungen = meldungenNachSchichtId.get(belegung.schichtId) ?? new Set<string>();
        meldungen.add(konflikt.meldung);
        meldungenNachSchichtId.set(belegung.schichtId, meldungen);
      }
    }
    return new Map(
      [...meldungenNachSchichtId].map(([schichtId, meldungen]) => {
        return [schichtId, [...meldungen]] as const;
      }),
    );
  });
  readonly konfliktSchichtIds = computed(() => {
    return new Set(this.konfliktMeldungenNachSchichtId().keys());
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
  readonly darfPlanen = computed(() => {
    const profil = this.benutzerStore.benutzerProfil();
    const pfad = this.pfad();
    if (!this.planungsmodus() || !profil?.aktiv) return false;
    if (profil.userRole === 'master') return true;
    return (
      profil.userRole === 'office' &&
      profil.zugriffe[pfad.unternehmerId]?.[pfad.firmaId]?.includes(pfad.filialeId)
    );
  });
  readonly darfSchreiben = computed(() => {
    return this.darfPlanen() && this.belegungsstandVerfuegbar();
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
  readonly hatUngueltigeEntwurfMitarbeiter = computed(() => {
    const erlaubteIds = new Set(this.mitarbeiterIds());
    return this.entwurfSchichten().some((schicht) => {
      return !erlaubteIds.has(schicht.mitarbeiterId);
    });
  });
  readonly dienstplanVeroeffentlichenAnzeigen = computed(() => {
    return this.darfPlanen() && Boolean(this.entwurfVersion());
  });
  readonly dienstplanVeroeffentlichenDeaktiviert = computed(() => {
    return (
      this.dienstplanStore.inProgress() ||
      !this.belegungsstandVerfuegbar() ||
      this.konfliktSchichtIds().size > 0 ||
      this.hatUngueltigeEntwurfMitarbeiter()
    );
  });
  readonly dienstplanVeroeffentlichenHinweis = computed(() => {
    if (!this.belegungsstandVerfuegbar()) {
      return 'Der firmenweite Belegungsstand ist nicht vollständig verfügbar.';
    }
    if (this.konfliktSchichtIds().size > 0) {
      return 'Behebe zuerst alle Belegungskonflikte.';
    }
    if (this.hatUngueltigeEntwurfMitarbeiter()) {
      return 'Der Entwurf enthält inaktive oder dieser Filiale nicht mehr zugeordnete Mitarbeiter.';
    }
    return 'Diesen Entwurf verbindlich veröffentlichen.';
  });
  readonly entwurfAnlegenAnzeigen = computed(() => {
    const dienstplan = this.dienstplan();
    return Boolean(
      this.darfPlanen() && dienstplan?.veroeffentlichteVersionId && !dienstplan.entwurfVersionId,
    );
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
    const modelle = await this.loadAktiveSchichtmodelle();
    if (!modelle) return;
    this.dialog.open(DienstplanAnlegenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        pfad: this.pfad(),
        monat: this.monat(),
        schichtmodelle: modelle.schichtmodelle,
        kalendertage: modelle.kalendertage,
      },
    });
  }

  /**
   * Informiert über eine durch das Schichtmodell ausgeschlossene Mehrfachbelegung.
   *
   * @param ablehnung - Bezeichnung der betroffenen Schicht.
   */
  openMehrfachbelegungHinweis(ablehnung: TSchichtplanMehrfachbelegungAblehnung): void {
    this.dialog.open(HinweisDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        titel: 'Mehrfachbelegung nicht erlaubt',
        nachricht: 'Diese Schicht kann nur einmal belegt werden.',
      },
    });
  }

  /**
   * Informiert über die fehlende Zulassung eines Mitarbeiters für diese Filiale.
   */
  openMitarbeiterNichtZugelassenHinweis(): void {
    this.dialog.open(HinweisDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        titel: 'Mitarbeiter nicht zugelassen',
        nachricht: 'Dieser Mitarbeiter ist für diese Filiale nicht zugelassen.',
      },
    });
  }

  /**
   * Informiert über die bereits vorhandene Belegung eines Mitarbeiters in derselben Schicht.
   */
  openMitarbeiterBereitsEingeplantHinweis(): void {
    this.dialog.open(HinweisDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        titel: 'Mitarbeiter bereits eingeplant',
        nachricht: 'Dieser Mitarbeiter ist hier bereits eingeplant.',
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
              'Möchtest du diesen Dienstplan wirklich löschen? Ein leerer Entwurf kann danach neu angelegt werden.',
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
   * Veröffentlicht den aktuellen Entwurf nach ausdrücklicher Bestätigung.
   */
  async publishDienstplan(): Promise<void> {
    const dienstplan = this.dienstplan();
    const version = this.entwurfVersion();
    if (
      !dienstplan ||
      !version ||
      !this.dienstplanVeroeffentlichenAnzeigen() ||
      this.dienstplanVeroeffentlichenDeaktiviert()
    ) {
      return;
    }
    const unbesetzteSchichtplaetze = this.unbesetzteSchichtplaetze();
    const hatUnbesetzteSchichtplaetze = unbesetzteSchichtplaetze > 0;
    const unbesetzteSchichtplaetzeText =
      unbesetzteSchichtplaetze === 1
        ? 'Der Dienstplan enthält einen unbesetzten Schichtplatz.'
        : `Der Dienstplan enthält ${unbesetzteSchichtplaetze} unbesetzte Schichtplätze.`;
    const bestaetigt = await firstValueFrom(
      this.dialog
        .open(BestaetigungDialog, {
          panelClass: ['pur-dialog__panel'],
          data: {
            titel: 'Dienstplan veröffentlichen',
            nachricht: hatUnbesetzteSchichtplaetze
              ? `${unbesetzteSchichtplaetzeText} Möchtest du ihn trotzdem verbindlich veröffentlichen? Ein zuvor veröffentlichter Stand wird dabei archiviert.`
              : 'Möchtest du diesen Entwurf verbindlich veröffentlichen? Ein zuvor veröffentlichter Stand wird dabei archiviert.',
            bestaetigenText: hatUnbesetzteSchichtplaetze
              ? 'Trotzdem veröffentlichen'
              : 'Veröffentlichen',
          },
        })
        .afterClosed(),
    );
    if (!bestaetigt) return;

    this.aktionsfehler.set(null);
    this.aktionsmeldung.set(null);
    try {
      await this.dienstplanStore.publishDienstplan({
        ...this.pfad(),
        dienstplanId: dienstplan.id,
        versionId: version.id,
      });
      this.aktionsmeldung.set('Der Dienstplan wurde erfolgreich veröffentlicht.');
    } catch (error) {
      this.aktionsfehler.set(
        error instanceof Error
          ? error.message
          : 'Der Dienstplan konnte nicht veröffentlicht werden.',
      );
    }
  }

  /**
   * Erstellt aus dem veröffentlichten Stand eine neue bearbeitbare Entwurfsversion.
   */
  async createEntwurfAusVeroeffentlichung(): Promise<void> {
    const dienstplan = this.dienstplan();
    if (
      !dienstplan ||
      !this.entwurfAnlegenAnzeigen() ||
      this.dienstplanStore.inProgress() ||
      !this.belegungsstandVerfuegbar()
    ) {
      return;
    }
    this.aktionsfehler.set(null);
    this.aktionsmeldung.set(null);
    try {
      await this.dienstplanStore.createEntwurfAusVeroeffentlichung({
        ...this.pfad(),
        dienstplanId: dienstplan.id,
      });
      this.aktionsmeldung.set('Die neue Entwurfsversion wurde angelegt.');
    } catch (error) {
      this.aktionsfehler.set(
        error instanceof Error
          ? error.message
          : 'Die neue Entwurfsversion konnte nicht angelegt werden.',
      );
    }
  }

  /**
   * Belegt eine konkrete Tagesschicht unmittelbar per Drag-and-drop.
   */
  async createTagesschichtAusAblage(
    ablage: TSchichtplanTagesschichtMitarbeiterAblage,
  ): Promise<void> {
    const dienstplan = this.dienstplan();
    const version = this.entwurfVersion();
    if (!dienstplan || !version || !this.darfSchreiben()) return;
    try {
      await this.dienstplanStore.createSchicht(
        { ...this.pfad(), dienstplanId: dienstplan.id, versionId: version.id },
        {
          datum: ablage.datum,
          mitarbeiterId: ablage.mitarbeiterId,
          tagesschichtId: ablage.tagesschichtId,
        },
      );
    } catch (error: unknown) {
      this.aktionsfehler.set(
        error instanceof Error ? error.message : 'Die Tagesschicht konnte nicht belegt werden.',
      );
    }
  }

  /**
   * Verschiebt eine vorhandene Belegung auf eine andere konkrete Tagesschicht.
   */
  async moveTagesschichtAusAblage(
    verschiebung: TSchichtplanTagesschichtVerschiebung,
  ): Promise<void> {
    const dienstplan = this.dienstplan();
    const version = this.entwurfVersion();
    if (!dienstplan || !version || !this.darfSchreiben()) return;
    try {
      await this.dienstplanStore.updateSchicht(
        { ...this.pfad(), dienstplanId: dienstplan.id, versionId: version.id },
        verschiebung.schicht.id,
        {
          datum: verschiebung.datum,
          mitarbeiterId: verschiebung.schicht.mitarbeiterId,
          tagesschichtId: verschiebung.tagesschichtId,
        },
      );
    } catch (error: unknown) {
      this.aktionsfehler.set(
        error instanceof Error
          ? error.message
          : 'Die Tagesschichtbelegung konnte nicht verschoben werden.',
      );
    }
  }

  /**
   * Öffnet die alternative Mitarbeiterzuordnung für eine konkrete Tagesschicht.
   */
  openTagesschichtDialog(
    auswahl: TSchichtplanTagesschichtauswahl,
    schicht?: ISchichtEintrag,
  ): void {
    const dienstplan = this.dienstplan();
    const version = this.entwurfVersion();
    const tagesschicht = this.tagesschichten().find((eintrag) => {
      return eintrag.id === auswahl.tagesschichtId && eintrag.datum === auswahl.datum;
    });
    if (!dienstplan || !version || !tagesschicht || !this.darfSchreiben()) return;
    this.dialog.open(SchichtBelegenDialog, {
      data: {
        pfad: { ...this.pfad(), dienstplanId: dienstplan.id, versionId: version.id },
        tagesschicht,
        mitarbeiter: this.mitarbeiter(),
        ...(schicht ? { schicht } : {}),
      },
      panelClass: ['pur-dialog__panel'],
    });
  }

  /**
   * Öffnet eine vorhandene Schichtbelegung zur Änderung oder Löschung.
   */
  openTagesschichtBearbeitenDialog(schicht: ISchichtEintrag): void {
    if (!schicht.tagesschichtId) return;
    this.openTagesschichtDialog(
      { datum: schicht.datum, tagesschichtId: schicht.tagesschichtId },
      schicht,
    );
  }

  // ===== Interne Helfer =======================

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

  private async loadAktiveSchichtmodelle(): Promise<{
    schichtmodelle: readonly ISchichtmodellBestand[];
    kalendertage: ReturnType<typeof createDienstplanKalendertage>;
  } | null> {
    this.aktionsfehler.set(null);
    try {
      await Promise.all([
        this.schichtmodellStore.loadSchichtmodelle(this.pfad()),
        this.filialeinstellungStore.loadFilialeinstellung(this.pfad()),
      ]);
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
          return bestand.schichtmodell.aktiv && bestand.tagesvorlagenschichten.length > 0;
        }) ?? [];
    const einstellungen = this.filialeinstellungStore.getFilialeinstellungKontext(
      this.pfad(),
    )?.bestand;
    if (!einstellungen) {
      this.aktionsfehler.set('Die Öffnungszeiten konnten nicht geladen werden.');
      return null;
    }
    if (schichtmodelle.length === 0) {
      this.aktionsfehler.set(
        'Lege zuerst ein aktives Schichtmodell mit mindestens einer Schicht an.',
      );
      return null;
    }
    const kalendertage = createDienstplanKalendertage({
      monat: this.monat(),
      standardoeffnungsregel: einstellungen.oeffnungszeiten.standardoeffnungsregel,
      wochenregeln: einstellungen.oeffnungszeiten.wochenregeln,
      sondertage: einstellungen.sondertage,
    });
    return { schichtmodelle, kalendertage };
  }
}
