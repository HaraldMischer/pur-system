// pur-system/src/app/pages/verwaltung-page/verwaltung-page.ts

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { VerwaltungStore } from '../../stores/domain/verwaltung.store';
import { FilialeBearbeitenDialog } from './filiale-bearbeiten-dialog/filiale-bearbeiten-dialog';
import { FirmaBearbeitenDialog } from './firma-bearbeiten-dialog/firma-bearbeiten-dialog';

@Component({
  selector: 'app-verwaltung-page',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './verwaltung-page.html',
  styleUrl: './verwaltung-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerwaltungPage implements OnInit {
  // ===== Interne Dependency Injection =========

  private readonly dialog = inject(MatDialog);
  readonly verwaltungStore = inject(VerwaltungStore);

  // ===== Lifecycle Hooks ======================

  /**
   * Lädt beim Öffnen der Seite die für das Benutzerprofil erlaubten Unternehmer.
   */
  ngOnInit(): void {
    void this.verwaltungStore.loadUnternehmer();
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Öffnet den Bearbeitungsdialog für die aktuell ausgewählte Firma.
   */
  openFirmaBearbeitenDialog(): void {
    const firma = this.verwaltungStore.selectedFirma();
    if (!firma || this.verwaltungStore.inProgress()) return;

    this.dialog.open(FirmaBearbeitenDialog, {
      data: { firma },
      panelClass: ['pur-dialog__panel'],
    });
  }

  /**
   * Öffnet den Bearbeitungsdialog für die aktuell ausgewählte Filiale.
   */
  openFilialeBearbeitenDialog(): void {
    const filiale = this.verwaltungStore.selectedFiliale();
    if (!filiale || this.verwaltungStore.inProgress()) return;

    this.dialog.open(FilialeBearbeitenDialog, {
      data: { filiale },
      panelClass: ['pur-dialog__panel'],
    });
  }
}
