// pur-system/src/app/components/shared/eingabe-datum/eingabe-datum.ts

import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
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

const ISO_DATUM_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONAT_TAG_PATTERN = /^(\d{2})-(\d{2})$/;
const DEUTSCHES_DATUM_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const DEUTSCHER_MONAT_TAG_PATTERN = /^(\d{2})\.(\d{2})$/;

export type TEingabeDatumModus = 'datum' | 'monat-tag';

function istGueltigesDatum(jahr: number, monat: number, tag: number): boolean {
  if (jahr < 1000 || jahr > 9999 || monat < 1 || monat > 12 || tag < 1 || tag > 31) {
    return false;
  }
  const datum = new Date(Date.UTC(jahr, monat - 1, tag));
  return (
    datum.getUTCFullYear() === jahr &&
    datum.getUTCMonth() + 1 === monat &&
    datum.getUTCDate() === tag
  );
}

function formatEingabeDatum(wert: string, modus: TEingabeDatumModus): string {
  const maximaleLaenge = modus === 'datum' ? 8 : 4;
  const ziffern = wert.replace(/\D/g, '').slice(0, maximaleLaenge);
  let formatiert = ziffern.slice(0, 2);
  if (ziffern.length > 2) formatiert += `.${ziffern.slice(2, 4)}`;
  if (modus === 'datum' && ziffern.length > 4) formatiert += `.${ziffern.slice(4, 8)}`;
  return formatiert;
}

function parseDeutschesDatum(wert: string): string | null {
  const treffer = DEUTSCHES_DATUM_PATTERN.exec(wert);
  if (!treffer) return null;
  const tag = Number(treffer[1]);
  const monat = Number(treffer[2]);
  const jahr = Number(treffer[3]);
  return istGueltigesDatum(jahr, monat, tag) ? `${treffer[3]}-${treffer[2]}-${treffer[1]}` : null;
}

function parseDeutschenMonatTag(wert: string): string | null {
  const treffer = DEUTSCHER_MONAT_TAG_PATTERN.exec(wert);
  if (!treffer) return null;
  const tag = Number(treffer[1]);
  const monat = Number(treffer[2]);
  return istGueltigesDatum(2000, monat, tag) ? `${treffer[2]}-${treffer[1]}` : null;
}

function formatFormularwert(wert: string, modus: TEingabeDatumModus): string {
  if (modus === 'datum') {
    const treffer = ISO_DATUM_PATTERN.exec(wert);
    return treffer ? `${treffer[3]}.${treffer[2]}.${treffer[1]}` : '';
  }
  const treffer = MONAT_TAG_PATTERN.exec(wert);
  return treffer ? `${treffer[2]}.${treffer[1]}` : '';
}

function getFormularwert(wert: string, modus: TEingabeDatumModus): string {
  const normalisiert = modus === 'datum' ? parseDeutschesDatum(wert) : parseDeutschenMonatTag(wert);
  return normalisiert ?? wert;
}

function getDatumFehler(
  wert: unknown,
  erforderlich: boolean,
  modus: TEingabeDatumModus,
): ValidationErrors | null {
  if (typeof wert !== 'string' || wert.length === 0) {
    return erforderlich ? { required: true } : null;
  }
  if (modus === 'datum') {
    const treffer = ISO_DATUM_PATTERN.exec(wert);
    return treffer && istGueltigesDatum(Number(treffer[1]), Number(treffer[2]), Number(treffer[3]))
      ? null
      : { datum: true };
  }
  const treffer = MONAT_TAG_PATTERN.exec(wert);
  return treffer && istGueltigesDatum(2000, Number(treffer[1]), Number(treffer[2]))
    ? null
    : { datum: true };
}

@Component({
  selector: 'app-eingabe-datum',
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EingabeDatum),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => EingabeDatum),
      multi: true,
    },
  ],
  templateUrl: './eingabe-datum.html',
  styleUrl: './eingabe-datum.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EingabeDatum implements ControlValueAccessor, Validator {
  // ===== Öffentliche API ======================

  readonly label = input.required<string>();
  readonly modus = input<TEingabeDatumModus>('datum');
  readonly required = input(false, { transform: booleanAttribute });
  readonly schreibgeschuetzt = input(false, {
    alias: 'readonly',
    transform: booleanAttribute,
  });
  readonly subscriptSizing = input<SubscriptSizing>('fixed');

  // ===== Öffentliche Werte ====================

  readonly eingabeControl = new FormControl('', { nonNullable: true });

  // ===== Öffentliche Ableitungen ==============

  readonly maxlength = computed(() => {
    return this.modus() === 'datum' ? 10 : 5;
  });
  readonly placeholder = computed(() => {
    return this.modus() === 'datum' ? 'TT.MM.JJJJ' : 'TT.MM';
  });

  // ===== Interner State =======================

  private onChange: (wert: string) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.eingabeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((wert) => {
      const formatiert = formatEingabeDatum(wert, this.modus());
      if (formatiert !== wert) {
        this.eingabeControl.setValue(formatiert, { emitEvent: false });
      }
      this.onChange(getFormularwert(formatiert, this.modus()));
      this.onValidatorChange();
    });
    effect(() => {
      const erforderlich = this.required();
      const modus = this.modus();
      this.eingabeControl.setValidators([
        ...(erforderlich ? [Validators.required] : []),
        (control) => {
          const formularwert = getFormularwert(control.value, modus);
          return getDatumFehler(formularwert, erforderlich, modus);
        },
      ]);
      this.eingabeControl.updateValueAndValidity({ emitEvent: false });
      this.onValidatorChange();
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Übernimmt einen normalisierten Datumswert in das sichtbare Eingabefeld.
   */
  writeValue(wert: string | null): void {
    this.eingabeControl.setValue(wert ? formatFormularwert(wert, this.modus()) : '', {
      emitEvent: false,
    });
  }

  /**
   * Registriert die Weitergabe geänderter Datumswerte.
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
   * Prüft den normalisierten Formularwert als vollständiges oder jährliches Datum.
   */
  validate(control: AbstractControl): ValidationErrors | null {
    return getDatumFehler(control.value, this.required(), this.modus());
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
