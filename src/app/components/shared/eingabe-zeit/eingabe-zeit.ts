// pur-system/src/app/components/shared/eingabe-zeit/eingabe-zeit.ts

import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  effect,
  forwardRef,
  input,
  numberAttribute,
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

function formatEingabeZeit(wert: string): string {
  const bereinigt = wert.trim();
  const eingabeMitDoppelpunkt = /^(\d{0,2}):(\d{0,2})$/.exec(bereinigt);
  if (eingabeMitDoppelpunkt) {
    return `${eingabeMitDoppelpunkt[1]}:${eingabeMitDoppelpunkt[2]}`;
  }
  const ziffern = bereinigt.replace(/\D/g, '').slice(0, 4);
  return ziffern.length > 2 ? `${ziffern.slice(0, 2)}:${ziffern.slice(2)}` : ziffern;
}

function normalisiereEingabeZeit(wert: string): string {
  const formatiert = formatEingabeZeit(wert);
  const vollstaendigeEingabe = /^(\d{1,2}):(\d{2})$/.exec(formatiert);
  if (!vollstaendigeEingabe) {
    return formatiert;
  }
  return `${vollstaendigeEingabe[1].padStart(2, '0')}:${vollstaendigeEingabe[2]}`;
}

function getMinutenschritt(minutenschritt: number): number {
  return Number.isInteger(minutenschritt) && minutenschritt > 0 && 60 % minutenschritt === 0
    ? minutenschritt
    : 1;
}

function rundeEingabeZeit(wert: string, minutenschritt: number): string {
  if (!LOKALZEIT_PATTERN.test(wert)) return wert;
  const [stunden, minuten] = wert.split(':').map(Number);
  const tagesminuten = 24 * 60;
  const gerundeteMinuten = Math.round((stunden * 60 + minuten) / minutenschritt) * minutenschritt;
  const minutenImTag = gerundeteMinuten % tagesminuten;
  return `${String(Math.floor(minutenImTag / 60)).padStart(2, '0')}:${String(minutenImTag % 60).padStart(2, '0')}`;
}

function getLokalzeitFehler(
  wert: unknown,
  erforderlich: boolean,
  minutenschritt: number,
): ValidationErrors | null {
  if (typeof wert !== 'string' || wert.length === 0) {
    return erforderlich ? { required: true } : null;
  }
  if (!LOKALZEIT_PATTERN.test(wert)) return { lokalzeit: true };
  const minuten = Number(wert.slice(3));
  return minuten % minutenschritt === 0 ? null : { minutenschritt: true };
}

@Component({
  selector: 'app-eingabe-zeit',
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EingabeZeit),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => EingabeZeit),
      multi: true,
    },
  ],
  templateUrl: './eingabe-zeit.html',
  styleUrl: './eingabe-zeit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EingabeZeit implements ControlValueAccessor, Validator {
  // ===== Öffentliche API ======================

  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly schreibgeschuetzt = input(false, {
    alias: 'readonly',
    transform: booleanAttribute,
  });
  readonly minutenschritt = input(1, { transform: numberAttribute });
  readonly subscriptSizing = input<SubscriptSizing>('fixed');

  // ===== Öffentliche Werte ====================

  readonly eingabeControl = new FormControl('', { nonNullable: true });

  // ===== Interner State =======================

  private onChange: (wert: string) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.eingabeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((wert) => {
      const formatiert = formatEingabeZeit(wert);
      if (formatiert !== wert) {
        this.eingabeControl.setValue(formatiert, { emitEvent: false });
      }
      this.onChange(formatiert);
    });
    effect(() => {
      const erforderlich = this.required();
      const minutenschritt = getMinutenschritt(this.minutenschritt());
      this.eingabeControl.setValidators([
        ...(erforderlich ? [Validators.required] : []),
        (control) => {
          return getLokalzeitFehler(control.value, erforderlich, minutenschritt);
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
    this.eingabeControl.setValue(normalisiereEingabeZeit(wert ?? ''), { emitEvent: false });
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
    return getLokalzeitFehler(
      control.value,
      this.required(),
      getMinutenschritt(this.minutenschritt()),
    );
  }

  /**
   * Registriert die Aktualisierung der übergeordneten Validierung.
   */
  registerOnValidatorChange(onValidatorChange: () => void): void {
    this.onValidatorChange = onValidatorChange;
  }

  /**
   * Normalisiert eine vollständige Eingabe und markiert das Formularfeld als berührt.
   */
  handleBlur(): void {
    const normalisiert = normalisiereEingabeZeit(this.eingabeControl.value);
    const gerundet = rundeEingabeZeit(normalisiert, getMinutenschritt(this.minutenschritt()));
    if (gerundet !== this.eingabeControl.value) {
      this.eingabeControl.setValue(gerundet);
    }
    this.onTouched();
  }
}
