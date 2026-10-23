// pur-system/src/app/components/shared/eingabe-minuten/eingabe-minuten.ts

import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  effect,
  forwardRef,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule, SubscriptSizing } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { MAX_RANDMINUTEN } from '../../../commons/constants/schichtmodell.constants';

// ===== Top-Level Helper =====================

function formatEingabeMinuten(wert: string): string {
  return wert.replace(/\D/g, '');
}

function getMinutenWert(wert: string): number | null {
  return wert.length === 0 ? null : Number(wert);
}

function getMinutenFehler(wert: unknown, erforderlich: boolean): ValidationErrors | null {
  if (wert === null || wert === undefined || wert === '') {
    return erforderlich ? { required: true } : null;
  }
  return typeof wert === 'number' && Number.isInteger(wert) && wert >= 0 && wert <= MAX_RANDMINUTEN
    ? null
    : { minuten: true };
}

@Component({
  selector: 'app-eingabe-minuten',
  imports: [MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EingabeMinuten),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => EingabeMinuten),
      multi: true,
    },
  ],
  templateUrl: './eingabe-minuten.html',
  styleUrl: './eingabe-minuten.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EingabeMinuten implements ControlValueAccessor, Validator {
  // ===== Öffentliche API ======================

  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly schreibgeschuetzt = input(false, {
    alias: 'readonly',
    transform: booleanAttribute,
  });
  readonly subscriptSizing = input<SubscriptSizing>('fixed');

  // ===== Öffentliche Werte ====================

  readonly eingabeControl = new FormControl('', { nonNullable: true });

  // ===== Interner State =======================

  private onChange: (wert: number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.eingabeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((wert) => {
      const formatiert = formatEingabeMinuten(wert);
      if (formatiert !== wert) {
        this.eingabeControl.setValue(formatiert, { emitEvent: false });
      }
      this.onChange(getMinutenWert(formatiert));
      this.onValidatorChange();
    });
    effect(() => {
      const erforderlich = this.required();
      this.eingabeControl.setValidators([
        ...(erforderlich ? [Validators.required] : []),
        (control) => {
          return getMinutenFehler(getMinutenWert(control.value), erforderlich);
        },
      ]);
      this.eingabeControl.updateValueAndValidity({ emitEvent: false });
      this.onValidatorChange();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Übernimmt einen Minutenwert in das sichtbare Eingabefeld.
   */
  writeValue(wert: number | null): void {
    this.eingabeControl.setValue(wert === null || wert === undefined ? '' : String(wert), {
      emitEvent: false,
    });
  }

  /**
   * Registriert die Weitergabe geänderter Minutenwerte.
   */
  registerOnChange(onChange: (wert: number | null) => void): void {
    this.onChange = onChange;
  }

  /**
   * Registriert die Weitergabe des Berührungszustands.
   */
  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  /**
   * Übernimmt den deaktivierten Zustand des übergeordneten Formularfelds.
   */
  setDisabledState(deaktiviert: boolean): void {
    if (deaktiviert && this.eingabeControl.enabled) {
      this.eingabeControl.disable({ emitEvent: false });
    }
    if (!deaktiviert && this.eingabeControl.disabled) {
      this.eingabeControl.enable({ emitEvent: false });
    }
  }

  /**
   * Prüft den Formularwert als ganze Minutenzahl zwischen 0 und 999.
   */
  validate(control: AbstractControl): ValidationErrors | null {
    return getMinutenFehler(control.value, this.required());
  }

  /**
   * Registriert die Aktualisierung der übergeordneten Validierung.
   */
  registerOnValidatorChange(onValidatorChange: () => void): void {
    this.onValidatorChange = onValidatorChange;
  }

  /**
   * Entfernt führende Nullen und markiert das Formularfeld als berührt.
   */
  handleBlur(): void {
    const wert = getMinutenWert(this.eingabeControl.value);
    if (wert !== null) {
      this.eingabeControl.setValue(String(wert));
    }
    this.onTouched();
  }
}
