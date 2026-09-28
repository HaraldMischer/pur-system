// pur-system/src/app/commons/utils/errors/firebase-error-message.spec.ts

import { getFirebaseErrorMessage } from './firebase-error-message';

describe('getFirebaseErrorMessage', () => {
  it('should return a friendly message for known Firebase auth errors', () => {
    const message = getFirebaseErrorMessage({ code: 'auth/invalid-credential' });

    expect(message).toBe('Anmeldename oder Passwort ist nicht korrekt.');
  });

  it('should return a friendly message for permission errors', () => {
    const message = getFirebaseErrorMessage({ code: 'permission-denied' });

    expect(message).toBe('Du hast keine Berechtigung für diese Aktion.');
  });

  it('should return a friendly message for an offline action', () => {
    const message = getFirebaseErrorMessage({ code: 'app/offline' });

    expect(message).toBe('Diese Aktion benötigt eine Internetverbindung.');
  });

  it('should return a friendly message for an invalid user profile', () => {
    const message = getFirebaseErrorMessage({ code: 'app/invalid-user-profile' });

    expect(message).toBe(
      'Das Benutzerprofil enthält unvollständige oder widersprüchliche Datenzugriffe.',
    );
  });

  it('should return the fallback message for unknown errors', () => {
    const message = getFirebaseErrorMessage({ code: 'unknown-error' });

    expect(message).toBe('Die Aktion konnte nicht ausgeführt werden.');
  });

  it('should return the fallback message when the error is not Firebase-like', () => {
    const message = getFirebaseErrorMessage('kaputt');

    expect(message).toBe('Die Aktion konnte nicht ausgeführt werden.');
  });
});
