// pur-system/src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.ts

import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import { SchichtBearbeitenDialog } from '../schicht-bearbeiten-dialog/schicht-bearbeiten-dialog';
import { SchichtplanMonat } from '../schichtplan-monat/schichtplan-monat';

@Component({
  selector: 'app-dienstplan-arbeitsbereich',
  imports: [MatButtonModule, MatIconModule, SchichtplanMonat],
  templateUrl: './dienstplan-arbeitsbereich.html',
  styleUrl: './dienstplan-arbeitsbereich.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanArbeitsbereich {
  // ===== Interne Dependency Injection =========

  readonly appKontextStore = inject(AppKontextStore);
  readonly benutzerStore = inject(BenutzerStore);
  readonly dienstplanStore = inject(DienstplanStore);
  readonly mitarbeiterStore = inject(MitarbeiterStore);
  readonly schichtvorlageStore = inject(SchichtvorlageStore);
  private readonly dialog = inject(MatDialog);

  // ===== Öffentliche API ======================

  readonly planungsmodus = input(false);

  // ===== Interner State =======================

  readonly selectedMonat = signal(getAktuellerMonat());

  // ===== Interne Ableitungen ==================

  private readonly loadDienstplanEffect = effect(() => {
    const pfad = this.filialPfad();
    const monat = this.selectedMonat();
    const planungsmodus = this.planungsmodus();
    untracked(() => {
      this.dienstplanStore.selectDienstplan(pfad, monat);
      if (pfad) {
        void this.loadDienstplan(pfad, monat);
        if (planungsmodus) void this.loadSchichtvorlagen(pfad);
      }
    });
  });

  // ===== Öffentliche Ableitungen ==============

  readonly filialPfad: Signal<IFilialPfad | null> = computed(() => {
    const profil = this.benutzerStore.benutzerProfil();
    if (profil?.userRole === 'filiale') {
      return getEinzelnenProfilFilialPfad(profil.zugriffe);
    }

    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    const filialeId = this.appKontextStore.selectedFiliale()?.id;
    return unternehmerId && firmaId && filialeId ? { unternehmerId, firmaId, filialeId } : null;
  });
  readonly monatsbezeichnung = computed(() => {
    const [jahr, monat] = this.selectedMonat().split('-').map(Number);
    return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(
      new Date(Date.UTC(jahr, monat - 1, 1)),
    );
  });
  readonly ladeFehler = computed(() => {
    return (
      this.dienstplanStore.selectedKontext()?.error ??
      (this.planungsmodus() ? this.schichtvorlageStore.error() : null)
    );
  });
  readonly download = computed(() => {
    return (
      this.dienstplanStore.download() ||
      (this.planungsmodus() && this.schichtvorlageStore.download())
    );
  });
  readonly isLoaded = computed(() => {
    return (
      this.dienstplanStore.isLoaded() &&
      (!this.planungsmodus() || this.schichtvorlageStore.isLoaded())
    );
  });
  readonly darfSchreiben = computed(() => {
    const profil = this.benutzerStore.benutzerProfil();
    const pfad = this.filialPfad();
    if (!this.planungsmodus() || !profil?.aktiv || !pfad) return false;
    if (profil.userRole === 'master') return true;
    return (
      profil.userRole === 'office' &&
      profil.zugriffe[pfad.unternehmerId]?.[pfad.firmaId]?.includes(pfad.filialeId) === true
    );
  });
  readonly mitarbeiter = computed(() => {
    const pfad = this.filialPfad();
    if (!pfad) return [];
    return this.mitarbeiterStore
      .getMitarbeiter(pfad.unternehmerId, pfad.firmaId)
      .filter((eintrag) => eintrag.aktiv && eintrag.filialIds.includes(pfad.filialeId));
  });
  readonly schichtMitarbeiter = computed(() => {
    const pfad = this.filialPfad();
    if (!pfad) return [];
    return [
      ...new Set(this.dienstplanStore.selectedSchichten().map((schicht) => schicht.mitarbeiterId)),
    ]
      .map((mitarbeiterId) => {
        return this.mitarbeiterStore.getMitarbeiterById(
          pfad.unternehmerId,
          pfad.firmaId,
          mitarbeiterId,
        );
      })
      .filter((mitarbeiter) => mitarbeiter !== null);
  });
  readonly entwurfVersion = computed(() => {
    const entwurfId = this.dienstplanStore.selectedDienstplan()?.entwurfVersionId;
    return (
      this.dienstplanStore.selectedVersionen().find((version) => version.id === entwurfId) ?? null
    );
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Wechselt relativ zum ausgewählten Kalendermonat.
   *
   * @param differenz - Anzahl der vor- oder zurückzugehenden Monate.
   */
  changeMonat(differenz: number): void {
    const [jahr, monat] = this.selectedMonat().split('-').map(Number);
    const ziel = new Date(Date.UTC(jahr, monat - 1 + differenz, 1));
    this.selectedMonat.set(
      `${ziel.getUTCFullYear()}-${String(ziel.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }

  /**
   * Wechselt zum aktuellen Kalendermonat.
   */
  selectAktuellerMonat(): void {
    this.selectedMonat.set(getAktuellerMonat());
  }

  /**
   * Wiederholt das Laden des aktuell ausgewählten Monats.
   */
  retryLoad(): void {
    const pfad = this.filialPfad();
    if (pfad) {
      void this.loadDienstplan(pfad, this.selectedMonat());
      if (this.planungsmodus()) void this.loadSchichtvorlagen(pfad);
    }
  }

  /**
   * Legt für den ausgewählten Monat einen neuen Dienstplanentwurf an.
   */
  async createDienstplan(): Promise<void> {
    const pfad = this.filialPfad();
    if (!pfad || !this.darfSchreiben()) return;
    try {
      await this.dienstplanStore.createDienstplan(pfad, this.selectedMonat());
    } catch {
      // Der DienstplanStore stellt die benutzerfreundliche Fehlermeldung bereit.
    }
  }

  /**
   * Öffnet den Dialog zum Anlegen oder Bearbeiten einer Schicht.
   *
   * @param datum - Vorgeschlagenes Schichtdatum.
   * @param schicht - Optional zu bearbeitende Schicht.
   */
  openSchichtDialog(datum: string, schicht?: ISchichtEintrag): void {
    const pfad = this.filialPfad();
    const dienstplan = this.dienstplanStore.selectedDienstplan();
    const version = this.entwurfVersion();
    if (!pfad || !dienstplan || !version || !this.darfSchreiben()) return;
    this.dialog.open(SchichtBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        pfad: { ...pfad, dienstplanId: dienstplan.id, versionId: version.id },
        zeitzone: dienstplan.zeitzone,
        datum,
        zeitraumStart: dienstplan.zeitraumStart,
        zeitraumEnde: dienstplan.zeitraumEnde,
        mitarbeiter: this.mitarbeiter(),
        schichtvorlagen: this.schichtvorlageStore.schichtvorlagen(),
        ...(schicht ? { schicht } : {}),
      },
    });
  }

  // ===== Interne Helfer =======================

  private async loadDienstplan(pfad: IFilialPfad, monat: string): Promise<void> {
    try {
      await this.dienstplanStore.loadDienstplanMonat(
        pfad,
        monat,
        this.benutzerStore.benutzerProfil()?.userRole === 'mitarbeiter',
      );
    } catch {
      // Der DienstplanStore stellt die benutzerfreundliche Fehlermeldung bereit.
    }
  }

  private async loadSchichtvorlagen(pfad: IFilialPfad): Promise<void> {
    try {
      await this.schichtvorlageStore.loadSchichtvorlagen(pfad);
    } catch {
      // Der SchichtvorlageStore stellt die benutzerfreundliche Fehlermeldung bereit.
    }
  }
}

function getAktuellerMonat(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
}

function getEinzelnenProfilFilialPfad(
  zugriffe: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>,
): IFilialPfad | null {
  const unternehmer = Object.entries(zugriffe);
  if (unternehmer.length !== 1) return null;
  const firmen = Object.entries(unternehmer[0][1]);
  if (firmen.length !== 1 || firmen[0][1].length !== 1) return null;
  return {
    unternehmerId: unternehmer[0][0],
    firmaId: firmen[0][0],
    filialeId: firmen[0][1][0],
  };
}
