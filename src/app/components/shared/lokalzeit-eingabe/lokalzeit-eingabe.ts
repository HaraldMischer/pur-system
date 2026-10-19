// pur-system/src/app/components/shared/lokalzeit-eingabe/lokalzeit-eingabe.ts

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
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

// ===== Top-Level Helper =====================

const LOKALZEIT_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function formatLokalzeitEingabe(wert: string): string {
  const bereinigt = wert.trim();
  const eingabeMitDoppelpunkt = /^(\d{1,2}):(\d{0,2})$/.exec(bereinigt);
  if (eingabeMitDoppelpunkt) {
    return `${eingabeMitDoppelpunkt[1].padStart(2, '0')}:${eingabeMitDoppelpunkt[2]}`;
  }
  const ziffern = bereinigt.replace(/\D/g, '').slice(0, 4);
  return ziffern.length > 2 ? `${ziffern.slice(0, 2)}:${ziffern.slice(2)}` : ziffern;
}

function getLokalzeitFehler(wert: unknown, erforderlich: boolean): ValidationErrors | null {
  if (typeof wert !== 'string' || wert.length === 0) {
    return erforderlich ? { required: true } : null;
  }
  return LOKALZEIT_PATTERN.test(wert) ? null : { lokalzeit: true };
}

@Component({
  selector: 'app-lokalzeit-eingabe',
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LokalzeitEingabe),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => LokalzeitEingabe),
      multi: true,
    },
  ],
  templateUrl: './lokalzeit-eingabe.html',
  styleUrl: './lokalzeit-eingabe.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LokalzeitEingabe implements ControlValueAccessor, Validator {
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

  private onChange: (wert: string) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.eingabeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((wert) => {
      const formatiert = formatLokalzeitEingabe(wert);
      if (formatiert !== wert) {
        this.eingabeControl.setValue(formatiert, { emitEvent: false });
      }
      this.onChange(formatiert);
    });
    effect(() => {
      const erforderlich = this.required();
      this.eingabeControl.setValidators([
        ...(erforderlich ? [Validators.required] : []),
        (control) => {
          return getLokalzeitFehler(control.value, erforderlich);
        },
      ]);
      this.eingabeControl.updateValueAndValidity({ emitEvent: false });
      this.onValidatorChange();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Übernimmt einen externen Formularwert in das Eingabefeld.
   */
  writeValue(wert: string | null): void {
    this.eingabeControl.setValue(formatLokalzeitEingabe(wert ?? ''), { emitEvent: false });
  }

  /**
   * Registriert die Weitergabe geänderter Zeitwerte.
   */
  registerOnChange(onChange: (wert: string) => void): void {
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
   * Prüft den Formularwert auf eine vollständige gültige Lokalzeit.
   */
  validate(control: AbstractControl): ValidationErrors | null {
    return getLokalzeitFehler(control.value, this.required());
  }

  /**
   * Registriert die Aktualisierung der übergeordneten Validierung.
   */
  registerOnValidatorChange(onValidatorChange: () => void): void {
    this.onValidatorChange = onValidatorChange;
  }

  /**
   * Markiert das übergeordnete Formularfeld nach Verlassen der Eingabe als berührt.
   */
  handleBlur(): void {
    this.onTouched();
  }
}
