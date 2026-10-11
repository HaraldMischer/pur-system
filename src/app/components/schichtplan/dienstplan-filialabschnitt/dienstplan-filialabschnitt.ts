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
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import { SchichtBearbeitenDialog } from '../schicht-bearbeiten-dialog/schicht-bearbeiten-dialog';
import { SchichtplanMonat } from '../schichtplan-monat/schichtplan-monat';

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
  readonly schichtvorlageStore = inject(SchichtvorlageStore);
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
   * Legt für diese Filiale und den gemeinsam ausgewählten Monat einen Dienstplanentwurf an.
   */
  async createDienstplan(): Promise<void> {
    if (!this.darfSchreiben()) return;
    this.aktionsfehler.set(null);
    try {
      await this.dienstplanStore.createDienstplan(this.pfad(), this.monat());
    } catch {
      this.aktionsfehler.set(
        this.dienstplanStore.error() ?? 'Der Dienstplan konnte nicht angelegt werden.',
      );
    }
  }

  /**
   * Öffnet den Dialog zum Anlegen oder Bearbeiten einer Schicht dieser Filiale.
   *
   * @param datum - Vorgeschlagenes Schichtdatum.
   * @param schicht - Optional zu bearbeitende Schicht.
   */
  async openSchichtDialog(datum: string, schicht?: ISchichtEintrag): Promise<void> {
    const dienstplan = this.dienstplan();
    const version = this.entwurfVersion();
    if (!dienstplan || !version || !this.darfSchreiben()) return;

    this.aktionsfehler.set(null);
    try {
      await this.schichtvorlageStore.loadSchichtvorlagen(this.pfad());
    } catch {
      const schichtvorlageKontext = this.schichtvorlageStore.getSchichtvorlageKontext(this.pfad());
      this.aktionsfehler.set(
        schichtvorlageKontext?.error ??
          this.schichtvorlageStore.error() ??
          'Die Schichtvorlagen konnten nicht geladen werden.',
      );
      return;
    }

    const schichtvorlageKontext = this.schichtvorlageStore.getSchichtvorlageKontext(this.pfad());

    this.dialog.open(SchichtBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        pfad: { ...this.pfad(), dienstplanId: dienstplan.id, versionId: version.id },
        zeitzone: dienstplan.zeitzone,
        datum,
        zeitraumStart: dienstplan.zeitraumStart,
        zeitraumEnde: dienstplan.zeitraumEnde,
        mitarbeiter: this.mitarbeiter(),
        schichtvorlagen: schichtvorlageKontext?.schichtvorlagen ?? [],
        ...(schicht ? { schicht } : {}),
      },
    });
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
}
