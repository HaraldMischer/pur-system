// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.ts

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IFirmaEintrag } from '../../../commons/models/domain/firma';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { hatMitarbeiterVerwaltungszugriffAufFirma } from '../../../commons/utils/mitarbeiter/mitarbeiter-berechtigung';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { StammdatenStore } from '../../../stores/app/stammdaten.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { MitarbeiterAnlegenDialog } from './mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog';
import { MitarbeiterBearbeitenDialog } from './mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog';
import { MitarbeiterCard } from './mitarbeiter-card/mitarbeiter-card';

@Component({
  selector: 'app-mitarbeiter-liste-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MitarbeiterCard,
  ],
  templateUrl: './mitarbeiter-liste-page.html',
  styleUrl: './mitarbeiter-liste-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MitarbeiterListePage implements OnInit {
  // ===== Interne Dependency Injection =========

  private readonly dialog = inject(MatDialog);
  readonly benutzerStore = inject(BenutzerStore);
  readonly stammdatenStore = inject(StammdatenStore);
  readonly mitarbeiterStore = inject(MitarbeiterStore);

  // ===== Interner State =======================

  readonly selectedUnternehmerId = signal<string | null>(null);
  readonly selectedFirmaId = signal<string | null>(null);

  // ===== Öffentliche Ableitungen ==============

  readonly firmen: Signal<readonly IFirmaEintrag[]> = computed(() => {
    const unternehmerId = this.selectedUnternehmerId();
    return unternehmerId ? this.stammdatenStore.getFirmen(unternehmerId) : [];
  });
  readonly darfSchreiben: Signal<boolean> = computed(() => {
    const profil = this.benutzerStore.benutzerProfil();
    const unternehmerId = this.selectedUnternehmerId();
    const firmaId = this.selectedFirmaId();
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

  // ===== Lifecycle Hooks ======================

  /**
   * Übernimmt eindeutige Unternehmer- und Firmenzuordnungen automatisch.
   */
  ngOnInit(): void {
    const unternehmer = this.stammdatenStore.unternehmer();
    if (unternehmer.length === 1) {
      void this.selectUnternehmer(unternehmer[0].id);
    }
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Wählt einen erlaubten Unternehmer aus und setzt die abhängige Firmenauswahl zurück.
   *
   * @param unternehmerId - Die ausgewählte Unternehmer-ID.
   */
  async selectUnternehmer(unternehmerId: string | null): Promise<void> {
    const selectedUnternehmerId = this.stammdatenStore
      .unternehmer()
      .some((eintrag) => eintrag.id === unternehmerId)
      ? unternehmerId
      : null;
    this.selectedUnternehmerId.set(selectedUnternehmerId);
    this.selectedFirmaId.set(null);

    const firmen = this.firmen();
    if (firmen.length === 1) {
      await this.selectFirma(firmen[0].id);
    }
  }

  /**
   * Wählt eine erlaubte Firma aus und lädt deren Mitarbeiter.
   *
   * @param firmaId - Die ausgewählte Firmen-ID.
   */
  async selectFirma(firmaId: string | null): Promise<void> {
    const unternehmerId = this.selectedUnternehmerId();
    const selectedFirmaId = this.firmen().some((eintrag) => eintrag.id === firmaId)
      ? firmaId
      : null;
    this.selectedFirmaId.set(selectedFirmaId);

    if (unternehmerId && selectedFirmaId) {
      try {
        await this.mitarbeiterStore.loadMitarbeiter(
          unternehmerId,
          selectedFirmaId,
          this.getMitarbeiterFilialId(unternehmerId, selectedFirmaId),
        );
      } catch {
        // Der MitarbeiterStore stellt die Fehlermeldung für die Oberfläche bereit.
      }
    }
  }

  /**
   * Lädt die Mitarbeiter der ausgewählten Firma erneut.
   */
  async retryLoadMitarbeiter(): Promise<void> {
    const unternehmerId = this.selectedUnternehmerId();
    const firmaId = this.selectedFirmaId();
    if (!unternehmerId || !firmaId) return;

    try {
      await this.mitarbeiterStore.loadMitarbeiter(
        unternehmerId,
        firmaId,
        this.getMitarbeiterFilialId(unternehmerId, firmaId),
      );
    } catch {
      // Der MitarbeiterStore stellt die Fehlermeldung für die Oberfläche bereit.
    }
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
    const unternehmerId = this.selectedUnternehmerId();
    const firmaId = this.selectedFirmaId();
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
    const unternehmerId = this.selectedUnternehmerId();
    const firmaId = this.selectedFirmaId();
    const unternehmer = this.stammdatenStore
      .unternehmer()
      .find((eintrag) => eintrag.id === unternehmerId);
    const firma = this.firmen().find((eintrag) => eintrag.id === firmaId);
    if (!unternehmerId || !firmaId || !unternehmer || !firma) return null;

    return {
      unternehmerId,
      unternehmerName: unternehmer.anzeigename,
      firmaId,
      firmaName: firma.anzeigename,
      filialen: this.stammdatenStore.getFilialen(unternehmerId, firmaId),
    };
  }
}
