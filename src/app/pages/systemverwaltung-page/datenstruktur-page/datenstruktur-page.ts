// pur-system/src/app/pages/systemverwaltung-page/datenstruktur-page/datenstruktur-page.ts

import { BreakpointObserver } from '@angular/cdk/layout';
import type { StepperOrientation } from '@angular/cdk/stepper';
import { ChangeDetectionStrategy, Component, OnInit, Signal, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { firstValueFrom, map } from 'rxjs';

import { FirmaStore } from '../../../stores/domain/firma.store';
import { FilialeStore } from '../../../stores/domain/filiale.store';
import { UnternehmerStore } from '../../../stores/domain/unternehmer.store';
import { FirmaAnlegenDialog } from './firma-anlegen-dialog/firma-anlegen-dialog';
import { FilialeAnlegenDialog } from './filiale-anlegen-dialog/filiale-anlegen-dialog';
import { UnternehmerAnlegenDialog } from './unternehmer-anlegen-dialog/unternehmer-anlegen-dialog';

type TAuswahlForm = {
  id: FormControl<string>;
};

@Component({
  selector: 'app-datenstruktur-page',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatStepperModule,
    ReactiveFormsModule,
  ],
  templateUrl: './datenstruktur-page.html',
  styleUrl: './datenstruktur-page.scss',
  host: { class: 'pur-page pur-page--limited' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatenstrukturPage implements OnInit {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly dialog = inject(MatDialog);
  readonly firmaStore = inject(FirmaStore);
  readonly filialeStore = inject(FilialeStore);
  readonly unternehmerStore = inject(UnternehmerStore);

  readonly stepperOrientation: Signal<StepperOrientation> = toSignal(
    this.breakpointObserver
      .observe('(max-width: 720px)')
      .pipe(map((result) => (result.matches ? 'vertical' : 'horizontal'))),
    { initialValue: 'horizontal' },
  );

  readonly unternehmerForm = new FormGroup<TAuswahlForm>({
    id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly firmaForm = new FormGroup<TAuswahlForm>({
    id: new FormControl(
      { value: '', disabled: true },
      {
        nonNullable: true,
        validators: [Validators.required],
      },
    ),
  });
  readonly filialeForm = new FormGroup<TAuswahlForm>({
    id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    effect(() => {
      if (this.unternehmerStore.download()) {
        this.unternehmerForm.controls.id.disable({ emitEvent: false });
      } else {
        this.unternehmerForm.controls.id.enable({ emitEvent: false });
      }
    });
    effect(() => {
      if (this.firmaStore.download() || !this.firmaStore.isLoaded()) {
        this.firmaForm.controls.id.disable({ emitEvent: false });
      } else {
        this.firmaForm.controls.id.enable({ emitEvent: false });
      }
    });
    this.unternehmerForm.controls.id.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((unternehmerId) => {
        this.handleUnternehmerChange(unternehmerId);
      });
    this.firmaForm.controls.id.valueChanges.pipe(takeUntilDestroyed()).subscribe((firmaId) => {
      this.handleFirmaChange(firmaId);
    });
  }

  /**
   * Lädt beim Initialisieren die für die Auswahl verfügbaren Unternehmer.
   */
  ngOnInit(): void {
    void this.unternehmerStore.loadUnternehmer().catch(() => undefined);
  }

  /**
   * Öffnet den Unternehmerdialog und wählt einen neu angelegten Unternehmer aus.
   *
   * @returns Ein Promise, das nach dem Schliessen des Dialogs aufgelöst wird.
   */
  async openUnternehmerDialog(): Promise<void> {
    this.unternehmerStore.clearError();
    const ergebnis = await firstValueFrom(
      this.dialog
        .open(UnternehmerAnlegenDialog, {
          panelClass: ['pur-dialog__panel', 'pur-dialog__panel--large'],
        })
        .afterClosed(),
    );

    if (ergebnis) {
      this.unternehmerForm.controls.id.setValue(ergebnis.id);
      this.unternehmerForm.controls.id.markAsDirty();
    }
  }

  /**
   * Öffnet den Firmendialog für den ausgewählten Unternehmer und übernimmt das Ergebnis.
   *
   * @returns Ein Promise, das nach dem Schliessen des Dialogs aufgelöst wird.
   */
  async openFirmaDialog(): Promise<void> {
    const unternehmerId = this.unternehmerForm.controls.id.value;
    if (!unternehmerId || !this.firmaStore.isLoaded()) return;

    this.firmaStore.clearError();
    const ergebnis = await firstValueFrom(
      this.dialog
        .open(FirmaAnlegenDialog, {
          data: { unternehmerId },
          panelClass: ['pur-dialog__panel', 'pur-dialog__panel--large'],
        })
        .afterClosed(),
    );

    if (ergebnis) {
      this.firmaForm.controls.id.setValue(ergebnis.id);
      this.firmaForm.controls.id.markAsDirty();
    }
  }

  /**
   * Öffnet den Filialdialog für die ausgewählte Firma und übernimmt das Ergebnis.
   *
   * @returns Ein Promise, das nach dem Schliessen des Dialogs aufgelöst wird.
   */
  async openFilialeDialog(): Promise<void> {
    const unternehmerId = this.unternehmerForm.controls.id.value;
    const firmaId = this.firmaForm.controls.id.value;
    if (!unternehmerId || !firmaId || !this.filialeStore.isLoaded()) return;

    this.filialeStore.clearError();
    const ergebnis = await firstValueFrom(
      this.dialog
        .open(FilialeAnlegenDialog, {
          data: { unternehmerId, firmaId },
          panelClass: ['pur-dialog__panel', 'pur-dialog__panel--large'],
        })
        .afterClosed(),
    );

    if (ergebnis) {
      this.filialeForm.controls.id.setValue(ergebnis.id);
      this.filialeForm.controls.id.markAsDirty();
    }
  }

  /**
   * Liefert den Anzeigenamen des ausgewählten Unternehmers.
   *
   * @returns Anzeigename oder ein Hinweis auf die fehlende Auswahl.
   */
  getUnternehmerBezeichnung(): string {
    const unternehmerId = this.unternehmerForm.controls.id.value;
    return (
      this.unternehmerStore.unternehmer().find((eintrag) => eintrag.id === unternehmerId)
        ?.anzeigename ?? 'Kein Unternehmer gewählt'
    );
  }

  /**
   * Liefert den Anzeigenamen der ausgewählten Firma.
   *
   * @returns Anzeigename oder ein Hinweis auf die fehlende Auswahl.
   */
  getFirmaBezeichnung(): string {
    const firmaId = this.firmaForm.controls.id.value;
    return (
      this.firmaStore.firmen().find((eintrag) => eintrag.id === firmaId)?.anzeigename ??
      'Keine Firma gewählt'
    );
  }

  /**
   * Liefert den Anzeigenamen der neu angelegten Filiale.
   *
   * @returns Anzeigename oder ein Hinweis auf die fehlende Filiale.
   */
  getFilialeBezeichnung(): string {
    const filialeId = this.filialeForm.controls.id.value;
    return (
      this.filialeStore.filialen().find((eintrag) => eintrag.id === filialeId)?.anzeigename ??
      'Keine Filiale angelegt'
    );
  }

  private handleUnternehmerChange(unternehmerId: string): void {
    this.firmaForm.reset({ id: '' }, { emitEvent: false });
    this.filialeForm.reset({ id: '' }, { emitEvent: false });
    this.filialeStore.resetFilialen();

    if (!unternehmerId) {
      this.firmaStore.resetFirmen();
      return;
    }

    void this.firmaStore.loadFirmen(unternehmerId).catch(() => undefined);
  }

  private handleFirmaChange(firmaId: string): void {
    const unternehmerId = this.unternehmerForm.controls.id.value;
    this.filialeForm.reset({ id: '' }, { emitEvent: false });

    if (!unternehmerId || !firmaId) {
      this.filialeStore.resetFilialen();
      return;
    }

    void this.filialeStore.loadFilialen(unternehmerId, firmaId).catch(() => undefined);
  }
}
