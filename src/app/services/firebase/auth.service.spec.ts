// pur-system/src/app/services/firebase/auth.service.spec.ts

import { Auth, User, UserCredential } from '@angular/fire/auth';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import {
  AUTH_STATE,
  EMAIL_AUTH_CREDENTIAL,
  REAUTHENTICATE_WITH_CREDENTIAL,
  SEND_PASSWORD_RESET_EMAIL,
  SIGN_IN_WITH_EMAIL_AND_PASSWORD,
  SIGN_OUT,
  UPDATE_PASSWORD,
} from '../../commons/tokens/firebase.tokens';
import { NetzwerkStatusService } from '../core/netzwerk-status.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authMock: Auth;
  let currentUser: User | null;
  let authStateMock: ReturnType<typeof vi.fn>;
  let signInMock: ReturnType<typeof vi.fn>;
  let signOutMock: ReturnType<typeof vi.fn>;
  let sendPasswordResetEmailMock: ReturnType<typeof vi.fn>;
  let emailAuthCredentialMock: ReturnType<typeof vi.fn>;
  let reauthenticateWithCredentialMock: ReturnType<typeof vi.fn>;
  let updatePasswordMock: ReturnType<typeof vi.fn>;
  let assertOnlineMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    currentUser = { uid: 'benutzer-123', email: 'test@example.com' } as User;
    authMock = {
      get currentUser() {
        return currentUser;
      },
    } as Auth;
    authStateMock = vi.fn().mockReturnValue(of({ uid: 'benutzer-123' } as User));
    signInMock = vi.fn().mockResolvedValue({ user: { uid: 'benutzer-123' } } as UserCredential);
    signOutMock = vi.fn().mockResolvedValue(undefined);
    sendPasswordResetEmailMock = vi.fn().mockResolvedValue(undefined);
    emailAuthCredentialMock = vi.fn().mockReturnValue({ providerId: 'password' });
    reauthenticateWithCredentialMock = vi.fn().mockResolvedValue(undefined);
    updatePasswordMock = vi.fn().mockResolvedValue(undefined);
    assertOnlineMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authMock },
        { provide: AUTH_STATE, useValue: authStateMock },
        { provide: SIGN_IN_WITH_EMAIL_AND_PASSWORD, useValue: signInMock },
        { provide: SIGN_OUT, useValue: signOutMock },
        { provide: SEND_PASSWORD_RESET_EMAIL, useValue: sendPasswordResetEmailMock },
        { provide: EMAIL_AUTH_CREDENTIAL, useValue: emailAuthCredentialMock },
        { provide: REAUTHENTICATE_WITH_CREDENTIAL, useValue: reauthenticateWithCredentialMock },
        { provide: UPDATE_PASSWORD, useValue: updatePasswordMock },
        { provide: NetzwerkStatusService, useValue: { assertOnline: assertOnlineMock } },
      ],
    });
  });

  it('should expose the Firebase auth state', () => {
    const service = TestBed.inject(AuthService);

    service.getAuthState();

    expect(authStateMock).toHaveBeenCalledWith(authMock);
  });

  it('should login with the technical address built from the login name', async () => {
    const service = TestBed.inject(AuthService);

    await service.login('Harald.Mischer--MASTER', 'secret-password');

    expect(assertOnlineMock).toHaveBeenCalledOnce();
    expect(signInMock).toHaveBeenCalledWith(
      authMock,
      'harald.mischer-master@pur-system.invalid',
      'secret-password',
    );
  });

  it('should logout the current user', async () => {
    const service = TestBed.inject(AuthService);

    await service.logout();

    expect(signOutMock).toHaveBeenCalledWith(authMock);
  });

  it('should request a password reset email', async () => {
    const service = TestBed.inject(AuthService);

    await service.sendPasswordResetEmail('test@example.com');

    expect(assertOnlineMock).toHaveBeenCalledOnce();
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(authMock, 'test@example.com');
  });

  it('should return the current user id', () => {
    const service = TestBed.inject(AuthService);

    expect(service.getAktuelleBenutzerId()).toBe('benutzer-123');
  });

  it('should reauthenticate the current user before changing the password', async () => {
    const service = TestBed.inject(AuthService);

    await service.changePassword('altes-passwort', 'neues-passwort');

    expect(assertOnlineMock).toHaveBeenCalledOnce();
    expect(emailAuthCredentialMock).toHaveBeenCalledWith('test@example.com', 'altes-passwort');
    expect(reauthenticateWithCredentialMock).toHaveBeenCalledWith(currentUser, {
      providerId: 'password',
    });
    expect(updatePasswordMock).toHaveBeenCalledWith(currentUser, 'neues-passwort');
    expect(reauthenticateWithCredentialMock.mock.invocationCallOrder[0]).toBeLessThan(
      updatePasswordMock.mock.invocationCallOrder[0],
    );
  });

  it('should throw when there is no current user id', () => {
    currentUser = null;
    const service = TestBed.inject(AuthService);

    expect(() => service.getAktuelleBenutzerId()).toThrow('Kein Benutzer angemeldet.');
  });

  it('should reject connection-dependent auth actions while offline', async () => {
    const error = Object.assign(new Error('offline'), { code: 'app/offline' });
    assertOnlineMock.mockImplementation(() => {
      throw error;
    });
    const service = TestBed.inject(AuthService);

    expect(() => service.login('test-master', 'secret-password')).toThrow(error);
    expect(() => service.sendPasswordResetEmail('test@example.com')).toThrow(error);
    await expect(service.changePassword('altes-passwort', 'neues-passwort')).rejects.toBe(error);
    expect(signInMock).not.toHaveBeenCalled();
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    expect(reauthenticateWithCredentialMock).not.toHaveBeenCalled();
    expect(updatePasswordMock).not.toHaveBeenCalled();
  });
});
