// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-verwaltung.ts

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';

import { TUserRole } from '../../../../commons/models/domain/benutzer';
import { BenutzerVerwaltungStore } from '../../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerBearbeitenDialog } from './benutzer-bearbeiten-dialog/benutzer-bearbeiten-dialog';
import { BenutzerDatenzuordnungDialog } from './benutzer-datenzuordnung-dialog/benutzer-datenzuordnung-dialog';
import { BenutzerLoeschenDialog } from './benutzer-loeschen-dialog/benutzer-loeschen-dialog';

@Component({
  selector: 'app-benutzer-verwaltung',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './benutzer-verwaltung.html',
  styleUrl: './benutzer-verwaltung.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerVerwaltung {
  // ===== Interne Dependency Injection =========

  private readonly dialog = inject(MatDialog);
  readonly verwaltungStore = inject(BenutzerVerwaltungStore);

  // ===== Öffentliche Werte ====================

  readonly benutzerUid = new FormControl('', { nonNullable: true });
  readonly rollenLabels: Readonly<Record<TUserRole, string>> = {
    filiale: 'Filiale',
    office: 'Office',
    mitarbeiter: 'Mitarbeiter',
    master: 'Master',
  };

  // ===== Öffentliche Aktionen =================

  /**
   * Übernimmt die ausgewählte UID in den Verwaltungs-Store.
   *
   * @param uid - UID des ausgewählten Benutzerprofils.
   */
  selectBenutzer(uid: string): void {
    this.verwaltungStore.selectBenutzer(uid || null);
  }

  /**
   * Öffnet den Bearbeitungsdialog für das ausgewählte Benutzerprofil.
   */
  openBenutzerBearbeitenDialog(): void {
    const profil = this.verwaltungStore.selectedBenutzer();
    if (!profil || this.verwaltungStore.inProgress()) return;

    this.dialog.open(BenutzerBearbeitenDialog, {
      data: { profil },
      panelClass: ['pur-dialog__panel'],
    });
  }

  /**
   * Öffnet den Datenzuordnungsdialog für das ausgewählte Benutzerprofil.
   */
  openBenutzerDatenzuordnungDialog(): void {
    const profil = this.verwaltungStore.selectedBenutzer();
    if (!profil || profil.userRole === 'master' || this.verwaltungStore.inProgress()) return;

    this.dialog.open(BenutzerDatenzuordnungDialog, {
      data: { profil },
      panelClass: ['pur-dialog__panel'],
    });
  }

  /**
   * Öffnet den Löschdialog für das ausgewählte Benutzerprofil.
   */
  openBenutzerLoeschenDialog(): void {
    const profil = this.verwaltungStore.selectedBenutzer();
    if (!profil || profil.userRole === 'master' || this.verwaltungStore.inProgress()) return;

    this.dialog.open(BenutzerLoeschenDialog, {
      data: { profil },
      panelClass: ['pur-dialog__panel'],
    });
  }
}
