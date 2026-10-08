// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-loeschen-dialog/benutzer-loeschen-dialog.ts

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { IBenutzerProfilEintrag } from '../../../../../commons/models/domain/benutzer';
import { BenutzerVerwaltungStore } from '../../../../../stores/domain/benutzer-verwaltung.store';

// ===== Konstanten & Typen ===================

export interface IBenutzerLoeschenDialogDaten {
  profil: IBenutzerProfilEintrag;
}

@Component({
  selector: 'app-benutzer-loeschen-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './benutzer-loeschen-dialog.html',
  styleUrl: './benutzer-loeschen-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenutzerLoeschenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(MatDialogRef<BenutzerLoeschenDialog, boolean | undefined>);
  private readonly dialogDaten = inject<IBenutzerLoeschenDialogDaten>(MAT_DIALOG_DATA);
  readonly verwaltungStore = inject(BenutzerVerwaltungStore);

  // ===== Öffentliche Werte ====================

  readonly profil = this.dialogDaten.profil;

  // ===== Öffentliche Aktionen =================

  /**
   * Löscht das ausgewählte Benutzerkonto und schließt den Dialog nach bestätigtem Erfolg.
   */
  async deleteBenutzer(): Promise<void> {
    if (this.profil.userRole === 'master' || this.verwaltungStore.inProgress()) return;

    this.dialogRef.disableClose = true;
    try {
      await this.verwaltungStore.deleteBenutzer();
      this.dialogRef.close(true);
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }
}
