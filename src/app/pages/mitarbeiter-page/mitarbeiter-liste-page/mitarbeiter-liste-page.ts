// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.ts

import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { hatMitarbeiterVerwaltungszugriffAufFirma } from '../../../commons/utils/mitarbeiter/mitarbeiter-berechtigung';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { StammdatenStore } from '../../../stores/app/stammdaten.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { MitarbeiterAnlegenDialog } from './mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog';
import { MitarbeiterBearbeitenDialog } from './mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog';
import { MitarbeiterCard } from './mitarbeiter-card/mitarbeiter-card';
import { MitarbeiterZusammenfuehrenDialog } from './mitarbeiter-zusammenfuehren-dialog/mitarbeiter-zusammenfuehren-dialog';

type TMitarbeiterAnsicht = 'aktiv' | 'inaktiv' | 'alle';

@Component({
  selector: 'app-mitarbeiter-liste-page',
  imports: [MatButtonModule, MatButtonToggleModule, MatIconModule, MitarbeiterCard],
  templateUrl: './mitarbeiter-liste-page.html',
  styleUrl: './mitarbeiter-liste-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MitarbeiterListePage {
  // ===== Interne Dependency Injection =========

  private readonly dialog = inject(MatDialog);
  readonly appKontextStore = inject(AppKontextStore);
  readonly benutzerStore = inject(BenutzerStore);
  readonly stammdatenStore = inject(StammdatenStore);
  readonly mitarbeiterStore = inject(MitarbeiterStore);

  // ===== Öffentliche Werte ====================

  readonly mitarbeiterAnsicht = signal<TMitarbeiterAnsicht>('aktiv');

  // ===== Interne Ableitungen ==================

  private readonly loadMitarbeiterEffect = effect(() => {
    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    const filialId =
      unternehmerId && firmaId
        ? this.getMitarbeiterLadeFilialId(unternehmerId, firmaId)
        : undefined;

    if (unternehmerId && firmaId) {
      void this.loadMitarbeiter(unternehmerId, firmaId, filialId);
    }
  });

  // ===== Öffentliche Ableitungen ==============

  readonly darfSchreiben: Signal<boolean> = computed(() => {
    const profil = this.benutzerStore.benutzerProfil();
    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    return Boolean(
      profil &&
      unternehmerId &&
      firmaId &&
      hatMitarbeiterVerwaltungszugriffAufFirma(profil, unternehmerId, firmaId),
    );
  });
  readonly darfZusammenfuehren: Signal<boolean> = computed(() => {
    const profil = this.benutzerStore.benutzerProfil();
    return profil?.aktiv === true && profil.userRole === 'master';
  });
  readonly mitarbeiter: Signal<readonly IMitarbeiterEintrag[]> = computed(() => {
    const kontext = this.getSelectedMitarbeiterKontext();
    if (!kontext) return [];

    const mitarbeiter = this.mitarbeiterStore.getMitarbeiter(
      kontext.unternehmerId,
      kontext.firmaId,
      kontext.filialId,
    );
    const filterFilialId = this.getMitarbeiterFilterFilialId();
    const gefilterteMitarbeiter = filterFilialId
      ? mitarbeiter.filter((eintrag) => eintrag.filialIds.includes(filterFilialId))
      : mitarbeiter;
    return gefilterteMitarbeiter.filter((eintrag) => {
      if (this.mitarbeiterAnsicht() === 'aktiv') return eintrag.aktiv;
      if (this.mitarbeiterAnsicht() === 'inaktiv') return !eintrag.aktiv;
      return true;
    });
  });
  readonly mitarbeiterDownload: Signal<boolean> = computed(() => {
    const kontext = this.getSelectedMitarbeiterKontext();
    return kontext
      ? this.mitarbeiterStore.isMitarbeiterKontextLoading(
          kontext.unternehmerId,
          kontext.firmaId,
          kontext.filialId,
        )
      : false;
  });
  readonly mitarbeiterIsLoaded: Signal<boolean> = computed(() => {
    const kontext = this.getSelectedMitarbeiterKontext();
    return kontext
      ? this.mitarbeiterStore.isMitarbeiterKontextLoaded(
          kontext.unternehmerId,
          kontext.firmaId,
          kontext.filialId,
        )
      : false;
  });
  readonly mitarbeiterError: Signal<string | null> = computed(() => {
    const kontext = this.getSelectedMitarbeiterKontext();
    return kontext
      ? this.mitarbeiterStore.getMitarbeiterKontextError(
          kontext.unternehmerId,
          kontext.firmaId,
          kontext.filialId,
        )
      : null;
  });
  readonly hatZusammenfuehrungsZiel: Signal<boolean> = computed(() => {
    const kontext = this.getSelectedMitarbeiterKontext();
    if (!kontext) return false;
    return (
      this.mitarbeiterStore.getMitarbeiter(kontext.unternehmerId, kontext.firmaId, kontext.filialId)
        .length > 1
    );
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt die Mitarbeiter der ausgewählten Firma erneut.
   */
  async retryLoadMitarbeiter(): Promise<void> {
    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    if (!unternehmerId || !firmaId) return;

    await this.loadMitarbeiter(
      unternehmerId,
      firmaId,
      this.getMitarbeiterLadeFilialId(unternehmerId, firmaId),
    );
  }

  /**
   * Öffnet den Anlagedialog für die aktuell ausgewählte Firma.
   */
  openMitarbeiterAnlegenDialog(): void {
    const kontext = this.getDialogKontext();
    if (!kontext || !this.darfSchreiben() || this.mitarbeiterStore.inProgress()) return;

    this.dialog.open(MitarbeiterAnlegenDialog, {
      data: kontext,
      panelClass: ['pur-dialog__panel'],
    });
  }

  /**
   * Öffnet den Bearbeitungsdialog für einen Mitarbeiter der ausgewählten Firma.
   *
   * @param mitarbeiter - Der zu bearbeitende Mitarbeiter.
   */
  openMitarbeiterBearbeitenDialog(mitarbeiter: IMitarbeiterEintrag): void {
    const kontext = this.getDialogKontext();
    if (
      !kontext ||
      !this.darfSchreiben() ||
      this.mitarbeiterStore.inProgress() ||
      !this.mitarbeiter().some((eintrag) => eintrag.id === mitarbeiter.id)
    ) {
      return;
    }

    this.dialog.open(MitarbeiterBearbeitenDialog, {
      data: { ...kontext, mitarbeiter },
      panelClass: ['pur-dialog__panel'],
    });
  }

  /**
   * Öffnet den Dialog zum Zusammenführen eines doppelten Mitarbeiters.
   *
   * @param mitarbeiter - Der als Duplikat zu behandelnde Mitarbeiter.
   */
  openMitarbeiterZusammenfuehrenDialog(mitarbeiter: IMitarbeiterEintrag): void {
    const kontext = this.getSelectedMitarbeiterKontext();
    if (!kontext || !this.darfZusammenfuehren() || this.mitarbeiterStore.inProgress()) return;

    const alleMitarbeiter = this.mitarbeiterStore.getMitarbeiter(
      kontext.unternehmerId,
      kontext.firmaId,
      kontext.filialId,
    );
    if (!alleMitarbeiter.some((eintrag) => eintrag.id === mitarbeiter.id)) {
      return;
    }

    this.dialog.open(MitarbeiterZusammenfuehrenDialog, {
      data: { quelle: mitarbeiter, mitarbeiter: alleMitarbeiter },
    });
  }

  // ===== Interne Helfer =======================

  private getMitarbeiterLadeFilialId(unternehmerId: string, firmaId: string): string | undefined {
    const profil = this.benutzerStore.benutzerProfil();
    if (profil?.userRole !== 'filiale') return undefined;

    const filialIds = profil.zugriffe[unternehmerId]?.[firmaId];
    return Array.isArray(filialIds) && filialIds.length === 1 ? filialIds[0] : undefined;
  }

  private getMitarbeiterFilterFilialId(): string | undefined {
    return this.benutzerStore.benutzerProfil()?.userRole === 'filiale'
      ? undefined
      : this.appKontextStore.selectedFiliale()?.id;
  }

  private getSelectedMitarbeiterKontext(): {
    unternehmerId: string;
    firmaId: string;
    filialId?: string;
  } | null {
    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    if (!unternehmerId || !firmaId) {
      return null;
    }

    return {
      unternehmerId,
      firmaId,
      filialId: this.getMitarbeiterLadeFilialId(unternehmerId, firmaId),
    };
  }

  private getDialogKontext(): {
    unternehmerId: string;
    firmaId: string;
    filialen: readonly IFilialeEintrag[];
  } | null {
    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    if (!unternehmerId || !firmaId) return null;

    return {
      unternehmerId,
      firmaId,
      filialen: this.stammdatenStore.getFilialen(unternehmerId, firmaId),
    };
  }

  private async loadMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    filialId?: string,
  ): Promise<void> {
    try {
      await this.mitarbeiterStore.loadMitarbeiter(unternehmerId, firmaId, filialId);
    } catch {
      // Der MitarbeiterStore stellt die Fehlermeldung für die Oberfläche bereit.
    }
  }
}
