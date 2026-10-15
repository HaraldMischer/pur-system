// pur-system/src/app/pages/system/struktur-verwalten-page/struktur-verwalten-page.ts

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { FilialeBearbeitenDialog } from '../../../components/system/struktur-bearbeiten/filiale-bearbeiten-dialog/filiale-bearbeiten-dialog';
import { FirmaBearbeitenDialog } from '../../../components/system/struktur-bearbeiten/firma-bearbeiten-dialog/firma-bearbeiten-dialog';
import { StrukturBearbeitenStore } from '../../../stores/domain/struktur-bearbeiten.store';

@Component({
  selector: 'app-struktur-verwalten-page',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './struktur-verwalten-page.html',
  styleUrl: './struktur-verwalten-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrukturVerwaltenPage implements OnInit {
  // ===== Interne Dependency Injection =========

  private readonly dialog = inject(MatDialog);
  readonly strukturBearbeitenStore = inject(StrukturBearbeitenStore);

  // ===== Lifecycle Hooks ======================

  /**
   * Lädt beim Öffnen der Seite die für das Benutzerprofil erlaubten Unternehmer.
   */
  ngOnInit(): void {
    void this.strukturBearbeitenStore.loadUnternehmer();
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Öffnet den Bearbeitungsdialog für die aktuell ausgewählte Firma.
   */
  openFirmaBearbeitenDialog(): void {
    const firma = this.strukturBearbeitenStore.selectedFirma();
    if (!firma || this.strukturBearbeitenStore.inProgress()) return;

    this.dialog.open(FirmaBearbeitenDialog, {
      data: { firma },
      panelClass: ['pur-dialog__panel'],
    });
  }

  /**
   * Öffnet den Bearbeitungsdialog für die aktuell ausgewählte Filiale.
   */
  openFilialeBearbeitenDialog(): void {
    const filiale = this.strukturBearbeitenStore.selectedFiliale();
    if (!filiale || this.strukturBearbeitenStore.inProgress()) return;

    this.dialog.open(FilialeBearbeitenDialog, {
      data: { filiale },
      panelClass: ['pur-dialog__panel'],
    });
  }
}
