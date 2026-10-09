// pur-system/src/app/components/mitarbeiter/mitarbeiter-zusammenfuehren-dialog/mitarbeiter-zusammenfuehren-dialog.ts

import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { sortMitarbeiter } from '../../../commons/utils/mitarbeiter/mitarbeiter-dokument';
import { istAehnlicherMitarbeiterName } from '../../../commons/utils/mitarbeiter/mitarbeiter-namensaehnlichkeit';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';

export interface IMitarbeiterZusammenfuehrenDialogDaten {
  ziel: IMitarbeiterEintrag;
  mitarbeiter: readonly IMitarbeiterEintrag[];
}

@Component({
  selector: 'app-mitarbeiter-zusammenfuehren-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './mitarbeiter-zusammenfuehren-dialog.html',
  styleUrl: './mitarbeiter-zusammenfuehren-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MitarbeiterZusammenfuehrenDialog {
  // ===== Interne Dependency Injection =========

  private readonly dialogRef = inject(MatDialogRef<MitarbeiterZusammenfuehrenDialog, boolean>);
  readonly dialogDaten = inject<IMitarbeiterZusammenfuehrenDialogDaten>(MAT_DIALOG_DATA);
  readonly mitarbeiterStore = inject(MitarbeiterStore);

  // ===== Öffentliche Werte ====================

  readonly duplikate = sortMitarbeiter(
    this.dialogDaten.mitarbeiter.filter((mitarbeiter) => {
      return (
        mitarbeiter.id !== this.dialogDaten.ziel.id &&
        istAehnlicherMitarbeiterName(this.dialogDaten.ziel.person, mitarbeiter.person)
      );
    }),
  );
  readonly zusammenfuehrenForm = new FormGroup({
    duplikatIds: new FormControl<string[]>([], {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      const inProgress = this.mitarbeiterStore.inProgress();
      untracked(() => {
        if (inProgress) {
          this.zusammenfuehrenForm.disable({ emitEvent: false });
        } else {
          this.zusammenfuehrenForm.enable({ emitEvent: false });
        }
      });
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Liefert die aktuell im Formular ausgewählten Duplikate.
   *
   * @returns Die ausgewählten Mitarbeiter in der Reihenfolge der Auswahlliste.
   */
  getAusgewaehlteDuplikate(): readonly IMitarbeiterEintrag[] {
    const duplikatIds = new Set(this.zusammenfuehrenForm.controls.duplikatIds.value);
    return this.duplikate.filter((mitarbeiter) => {
      return duplikatIds.has(mitarbeiter.id);
    });
  }

  /**
   * Führt den ausgewählten Quellmitarbeiter in den gewählten Zielmitarbeiter über.
   */
  async onSubmit(): Promise<void> {
    if (this.zusammenfuehrenForm.invalid || this.mitarbeiterStore.inProgress()) {
      this.zusammenfuehrenForm.markAllAsTouched();
      return;
    }

    const ziel = this.dialogDaten.ziel;
    const duplikatIds = this.getAusgewaehlteDuplikate().map((mitarbeiter) => mitarbeiter.id);
    this.dialogRef.disableClose = true;
    try {
      await this.mitarbeiterStore.mergeMitarbeiter(
        ziel.unternehmerId,
        ziel.firmaId,
        duplikatIds,
        ziel.id,
      );
      this.dialogRef.close(true);
    } catch {
      // Der MitarbeiterStore stellt die benutzerfreundliche Fehlermeldung bereit.
    } finally {
      this.dialogRef.disableClose = false;
    }
  }

  /**
   * Erstellt den vollständigen Namen eines Mitarbeiters.
   *
   * @param mitarbeiter - Mitarbeiter, dessen Name ausgegeben werden soll.
   * @returns Vor- und Nachname als bereinigter Anzeigename.
   */
  getMitarbeiterName(mitarbeiter: IMitarbeiterEintrag): string {
    return `${mitarbeiter.person.vorname} ${mitarbeiter.person.nachname}`.trim();
  }
}
