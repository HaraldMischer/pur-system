// pur-system/src/app/components/shared/bestaetigung-dialog/bestaetigung-dialog.ts

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

// ===== Konstanten & Typen ===================

export interface IBestaetigungDialogDaten {
  readonly titel: string;
  readonly nachricht: string;
  readonly bestaetigenText?: string;
  readonly abbrechenText?: string;
}

@Component({
  selector: 'app-bestaetigung-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './bestaetigung-dialog.html',
  styleUrl: './bestaetigung-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BestaetigungDialog {
  // ===== Interne Dependency Injection =========

  readonly daten = inject<IBestaetigungDialogDaten>(MAT_DIALOG_DATA);
}
