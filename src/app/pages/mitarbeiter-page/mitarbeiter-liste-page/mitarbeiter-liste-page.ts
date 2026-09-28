// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.ts

import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  effect,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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

@Component({
  selector: 'app-mitarbeiter-liste-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MitarbeiterCard],
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

  // ===== Interne Ableitungen ==================

  private readonly loadMitarbeiterEffect = effect(() => {
    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    const filialId =
      unternehmerId && firmaId ? this.getMitarbeiterFilialId(unternehmerId, firmaId) : undefined;

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
  readonly mitarbeiter: Signal<readonly IMitarbeiterEintrag[]> = computed(() => {
    const kontext = this.getSelectedMitarbeiterKontext();
    return kontext
      ? this.mitarbeiterStore.getMitarbeiter(
          kontext.unternehmerId,
          kontext.firmaId,
          kontext.filialId,
        )
      : [];
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
      this.getMitarbeiterFilialId(unternehmerId, firmaId),
    );
  }

  /**
   * Öffnet den Anlagedialog für die aktuell ausgewählte Firma.
   */
  openMitarbeiterAnlegenDialog(): void {
    const kontext = this.getDialogKontext();
    if (!kontext || !this.darfSchreiben() || this.mitarbeiterStore.inProgress()) return;

    this.dialog.open(MitarbeiterAnlegenDialog, { data: kontext });
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
    });
  }

  // ===== Interne Helfer =======================

  private getMitarbeiterFilialId(unternehmerId: string, firmaId: string): string | undefined {
    const profil = this.benutzerStore.benutzerProfil();
    if (profil?.userRole !== 'filiale') return undefined;

    const filialIds = profil.zugriffe[unternehmerId]?.[firmaId];
    return Array.isArray(filialIds) && filialIds.length === 1 ? filialIds[0] : undefined;
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
      filialId: this.getMitarbeiterFilialId(unternehmerId, firmaId),
    };
  }

  private getDialogKontext(): {
    unternehmerId: string;
    unternehmerName: string;
    firmaId: string;
    firmaName: string;
    filialen: readonly IFilialeEintrag[];
  } | null {
    const unternehmer = this.appKontextStore.selectedUnternehmer();
    const firma = this.appKontextStore.selectedFirma();
    const unternehmerId = unternehmer?.id;
    const firmaId = firma?.id;
    if (!unternehmerId || !firmaId || !unternehmer || !firma) return null;

    return {
      unternehmerId,
      unternehmerName: unternehmer.anzeigename,
      firmaId,
      firmaName: firma.anzeigename,
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
