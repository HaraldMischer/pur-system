// pur-system/src/app/components/shared/hinweis-dialog/hinweis-dialog.ts

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

// ===== Konstanten & Typen ===================

export interface IHinweisDialogDaten {
  readonly titel: string;
  readonly nachricht: string;
  readonly schliessenText?: string;
}

@Component({
  selector: 'app-hinweis-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './hinweis-dialog.html',
  styleUrl: './hinweis-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HinweisDialog {
  // ===== Interne Dependency Injection =========

  readonly daten = inject<IHinweisDialogDaten>(MAT_DIALOG_DATA);
}
