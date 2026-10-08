// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-datenzuordnung-dialog/benutzer-datenzuordnung-dialog.ts

import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import {
  IBenutzerDatenzuordnung,
  IBenutzerMitarbeiterZuordnung,
  IBenutzerProfilEintrag,
} from '../../../../../commons/models/domain/benutzer';
import { IUnternehmerAuswahl } from '../../../../../commons/models/domain/datenzugriff';
import { StammdatenStore } from '../../../../../stores/app/stammdaten.store';
import { BenutzerVerwaltungStore } from '../../../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerDatenzuordnung } from './benutzer-datenzuordnung/benutzer-datenzuordnung';

// ===== Konstanten & Typen ===================

export interface IBenutzerDatenzuordnungDialogDaten {
  profil: IBenutzerProfilEintrag;
}

@Component({
  selector: 'app-benutzer-datenzuordnung-dialog',
  imports: [BenutzerDatenzuordnung, MatButtonModule, MatDialogModule],
  templateUrl: './benutzer-datenzuordnung-dialog.html',
  styleUrl: './benutzer-datenzuordnung-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerDatenzuordnungDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(
    MatDialogRef<BenutzerDatenzuordnungDialog, IBenutzerProfilEintrag | undefined>,
  );
  private readonly dialogDaten = inject<IBenutzerDatenzuordnungDialogDaten>(MAT_DIALOG_DATA);
  private readonly stammdatenStore = inject(StammdatenStore);
  readonly verwaltungStore = inject(BenutzerVerwaltungStore);

  // ===== View Queries =========================

  readonly datenzuordnung = viewChild(BenutzerDatenzuordnung);

  // ===== Öffentliche Werte ====================

  readonly profil = this.dialogDaten.profil;
  readonly dialogTitel =
    this.profil.userRole === 'filiale'
      ? 'Filial-Datenzuordnung ändern'
      : this.profil.userRole === 'office'
        ? 'Office-Datenzuordnung ändern'
        : 'Mitarbeiter-Datenzuordnung ändern';

  // ===== Öffentliche Ableitungen ==============

  readonly unternehmer = computed<readonly IUnternehmerAuswahl[]>(() => {
    return this.stammdatenStore.unternehmer().map((unternehmer) => ({
      id: unternehmer.id,
      anzeigename: unternehmer.anzeigename,
      firmen: this.stammdatenStore.getFirmen(unternehmer.id).map((firma) => ({
        id: firma.id,
        anzeigename: firma.anzeigename,
        filialen: this.stammdatenStore.getFilialen(unternehmer.id, firma.id).map((filiale) => ({
          id: filiale.id,
          anzeigename: filiale.anzeigename,
        })),
      })),
    }));
  });
  readonly speichernDeaktiviert = computed(() => {
    return this.datenzuordnung()?.speichernDeaktiviert() ?? true;
  });

  // ===== Öffentliche Aktionen =================

  /**
   * Stößt das Speichern der aktuell ausgewählten rollenabhängigen Datenzuordnung an.
   */
  saveZuordnung(): void {
    this.datenzuordnung()?.saveZuordnung();
  }

  /**
   * Speichert eine neue Office- oder Filial-Datenzuordnung und schließt den Dialog nach Erfolg.
   *
   * @param zuordnung - Vollständige neue Datenzuordnung.
   */
  async saveDatenzuordnung(zuordnung: IBenutzerDatenzuordnung): Promise<void> {
    if (this.verwaltungStore.inProgress()) return;

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.verwaltungStore.updateDatenzuordnung(zuordnung);
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  /**
   * Speichert eine neue Mitarbeiterzuordnung und schließt den Dialog nach Erfolg.
   *
   * @param zuordnung - Vollständige neue Mitarbeiterzuordnung.
   */
  async saveMitarbeiterZuordnung(zuordnung: IBenutzerMitarbeiterZuordnung): Promise<void> {
    if (this.verwaltungStore.inProgress()) return;

    this.dialogRef.disableClose = true;
    try {
      const ergebnis = await this.verwaltungStore.updateMitarbeiterZuordnung(zuordnung);
      this.dialogRef.close(ergebnis);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }
}
