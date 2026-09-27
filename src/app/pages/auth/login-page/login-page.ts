// pur-system/src/app/pages/auth/login-page/login-page.ts

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import {
  buildAnmeldename,
  normalizeAnmeldename,
  normalizeNamensbestandteil,
} from '../../../commons/utils/auth/technische-anmeldeadresse';
import { NetzwerkStatusService } from '../../../services/core/netzwerk-status.service';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { environment } from '../../../../environments/environment';

type TLoginForm = {
  anmeldename: FormControl<string>;
  password: FormControl<string>;
};

@Component({
  selector: 'app-login-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly _benutzerStore = inject(BenutzerStore);
  private readonly _netzwerkStatusService = inject(NetzwerkStatusService);
  private readonly _router = inject(Router);

  readonly inProgress = this._benutzerStore.inProgress;
  readonly isOnline = this._netzwerkStatusService.isOnline;
  readonly error = this._benutzerStore.error;
  readonly appTitle = environment.appTitle;
  readonly isDevelopmentMode = isDevMode();
  readonly passwortSichtbar = signal(false);
  readonly loginForm = new FormGroup<TLoginForm>({
    anmeldename: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      if (this._benutzerStore.darfBereichNutzen('dashboard')) {
        void this._router.navigate(['/dashboard']);
      }
    });
  }

  async submitLogin(): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    const anmeldenameControl = this.loginForm.controls.anmeldename;
    const eingegebenerAnmeldename = anmeldenameControl.getRawValue();
    const normalisierterAnmeldename = environment.loginUserRole
      ? normalizeNamensbestandteil(eingegebenerAnmeldename)
      : normalizeAnmeldename(eingegebenerAnmeldename);
    anmeldenameControl.setValue(normalisierterAnmeldename);
    anmeldenameControl.updateValueAndValidity();

    if (this.loginForm.invalid || this.inProgress()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { password } = this.loginForm.getRawValue();
    const vollstaendigerAnmeldename = environment.loginUserRole
      ? buildAnmeldename(normalisierterAnmeldename, environment.loginUserRole)
      : normalisierterAnmeldename;
    await this._benutzerStore.login(vollstaendigerAnmeldename, password);
    await this._router.navigate(['/dashboard']);
  }

  /**
   * Schaltet die sichtbare Darstellung des eingegebenen Passworts um.
   */
  togglePasswortSichtbarkeit(): void {
    this.passwortSichtbar.update((sichtbar) => !sichtbar);
  }

  patchLoginForm(anmeldename: string): void {
    this.loginForm.patchValue({
      anmeldename: anmeldename,
      password: '',
    });
  }
}
