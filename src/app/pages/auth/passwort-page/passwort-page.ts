// pur-system/src/app/pages/auth/passwort-page/passwort-page.ts

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PasswortStore } from '../../../stores/domain/passwort.store';

type TPasswortForm = {
  aktuellesPasswort: FormControl<string>;
  neuesPasswort: FormControl<string>;
  passwortBestaetigung: FormControl<string>;
};
type TPasswortFeld = keyof TPasswortForm;

const passwoerterGleichValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value as {
    neuesPasswort?: string;
    passwortBestaetigung?: string;
  };

  return value.neuesPasswort === value.passwortBestaetigung ? null : { passwoerterUngleich: true };
};

@Component({
  selector: 'app-passwort-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  providers: [PasswortStore],
  templateUrl: './passwort-page.html',
  styleUrl: './passwort-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswortPage {
  readonly passwortStore = inject(PasswortStore);
  private readonly formDirective = viewChild.required(FormGroupDirective);
  readonly sichtbarePasswortFelder = signal<ReadonlySet<TPasswortFeld>>(new Set());
  readonly passwortForm = new FormGroup<TPasswortForm>(
    {
      aktuellesPasswort: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      neuesPasswort: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
      passwortBestaetigung: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [passwoerterGleichValidator] },
  );

  constructor() {
    effect(() => {
      if (this.passwortStore.inProgress()) {
        this.passwortForm.disable({ emitEvent: false });
      } else {
        this.passwortForm.enable({ emitEvent: false });
      }
    });
  }

  /**
   * Ändert das Passwort nach erfolgreicher Formularvalidierung.
   */
  async onSubmit(): Promise<void> {
    if (this.passwortForm.invalid || this.passwortStore.inProgress()) {
      this.passwortForm.markAllAsTouched();
      return;
    }

    const value = this.passwortForm.getRawValue();

    try {
      await this.passwortStore.savePasswort(value.aktuellesPasswort, value.neuesPasswort);
      this.sichtbarePasswortFelder.set(new Set());
      this.formDirective().resetForm();
    } catch {
      // Der Store stellt die benutzerfreundliche Fehlermeldung bereit.
    }
  }

  /**
   * Prüft, ob das angegebene Passwortfeld im Klartext angezeigt wird.
   *
   * @param feld - Das zu prüfende Passwortfeld.
   * @returns `true`, wenn das Passwort sichtbar ist.
   */
  istPasswortSichtbar(feld: TPasswortFeld): boolean {
    return this.sichtbarePasswortFelder().has(feld);
  }

  /**
   * Wechselt die Sichtbarkeit des angegebenen Passwortfelds.
   *
   * @param feld - Das umzuschaltende Passwortfeld.
   */
  togglePasswortSichtbarkeit(feld: TPasswortFeld): void {
    this.sichtbarePasswortFelder.update((sichtbareFelder) => {
      const aktualisierteFelder = new Set(sichtbareFelder);
      if (aktualisierteFelder.has(feld)) {
        aktualisierteFelder.delete(feld);
      } else {
        aktualisierteFelder.add(feld);
      }
      return aktualisierteFelder;
    });
  }
}
