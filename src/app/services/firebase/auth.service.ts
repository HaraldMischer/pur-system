// pur-system/src/app/services/firebase/auth.service.ts

import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Auth, User, UserCredential } from '@angular/fire/auth';
import { Observable } from 'rxjs';

import {
  AUTH_STATE,
  EMAIL_AUTH_CREDENTIAL,
  REAUTHENTICATE_WITH_CREDENTIAL,
  SEND_PASSWORD_RESET_EMAIL,
  SIGN_IN_WITH_EMAIL_AND_PASSWORD,
  SIGN_OUT,
  UPDATE_PASSWORD,
} from '../../commons/tokens/firebase.tokens';
import { buildTechnischeAnmeldeadresse } from '../../commons/utils/auth/technische-anmeldeadresse';
import { NetzwerkStatusService } from '../core/netzwerk-status.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _injector = inject(Injector);
  private readonly _auth = inject(Auth);
  private readonly _authState = inject(AUTH_STATE);
  private readonly _signInWithEmailAndPassword = inject(SIGN_IN_WITH_EMAIL_AND_PASSWORD);
  private readonly _signOut = inject(SIGN_OUT);
  private readonly _sendPasswordResetEmail = inject(SEND_PASSWORD_RESET_EMAIL);
  private readonly _emailAuthCredential = inject(EMAIL_AUTH_CREDENTIAL);
  private readonly _reauthenticateWithCredential = inject(REAUTHENTICATE_WITH_CREDENTIAL);
  private readonly _updatePassword = inject(UPDATE_PASSWORD);
  private readonly _netzwerkStatusService = inject(NetzwerkStatusService);

  getAuthState(): Observable<User | null> {
    return runInInjectionContext(this._injector, () => this._authState(this._auth));
  }

  login(anmeldename: string, password: string): Promise<UserCredential> {
    this._netzwerkStatusService.assertOnline();
    const technischeAnmeldeadresse = buildTechnischeAnmeldeadresse(anmeldename);

    return runInInjectionContext(this._injector, () =>
      this._signInWithEmailAndPassword(this._auth, technischeAnmeldeadresse, password),
    );
  }

  logout(): Promise<void> {
    return runInInjectionContext(this._injector, () => this._signOut(this._auth));
  }

  sendPasswordResetEmail(email: string): Promise<void> {
    this._netzwerkStatusService.assertOnline();

    return runInInjectionContext(this._injector, () =>
      this._sendPasswordResetEmail(this._auth, email),
    );
  }

  async changePassword(aktuellesPasswort: string, neuesPasswort: string): Promise<void> {
    this._netzwerkStatusService.assertOnline();

    const benutzer = this._auth.currentUser;
    const email = benutzer?.email;

    if (!benutzer || !email) {
      throw new Error('Kein Benutzer mit E-Mail-Adresse angemeldet.');
    }

    const credential = this._emailAuthCredential(email, aktuellesPasswort);
    await runInInjectionContext(this._injector, () =>
      this._reauthenticateWithCredential(benutzer, credential),
    );
    await runInInjectionContext(this._injector, () =>
      this._updatePassword(benutzer, neuesPasswort),
    );
  }

  getAktuelleBenutzerId(): string {
    const benutzerId = this._auth.currentUser?.uid;

    if (!benutzerId) {
      throw new Error('Kein Benutzer angemeldet.');
    }

    return benutzerId;
  }
}
