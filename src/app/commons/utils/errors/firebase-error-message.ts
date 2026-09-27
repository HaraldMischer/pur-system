// pur-system/src/app/commons/utils/errors/firebase-error-message.ts

import { IFirebaseErrorLike } from '../../models/app/firebase-error.types';

const FALLBACK_ERROR_MESSAGE = 'Die Aktion konnte nicht ausgeführt werden.';

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'app/offline': 'Diese Aktion benötigt eine Internetverbindung.',
  unavailable: 'Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.',
  'auth/invalid-credential': 'Anmeldename oder Passwort ist nicht korrekt.',
  'auth/invalid-email': 'Anmeldename oder Passwort ist nicht korrekt.',
  'auth/requires-recent-login': 'Bitte melde dich erneut an und versuche es noch einmal.',
  'auth/weak-password': 'Das neue Passwort ist nicht sicher genug.',
  'auth/network-request-failed':
    'Die Verbindung ist fehlgeschlagen. Bitte prüfe deine Internetverbindung.',
  'auth/too-many-requests': 'Zu viele Versuche. Bitte warte kurz und versuche es später erneut.',
  'auth/user-not-found': 'Anmeldename oder Passwort ist nicht korrekt.',
  'auth/wrong-password': 'Anmeldename oder Passwort ist nicht korrekt.',
  'permission-denied': 'Du hast keine Berechtigung für diese Aktion.',
  'functions/already-exists':
    'Dieser Anmeldename wird bereits verwendet. Bitte einen anderen Namensbestandteil wählen.',
  'functions/internal': 'Der Benutzer konnte nicht vollständig angelegt werden.',
  'functions/invalid-argument': 'Die Benutzerdaten sind unvollständig oder ungültig.',
  'functions/permission-denied': 'Nur ein aktiver Master darf Benutzer anlegen.',
  'functions/unauthenticated': 'Bitte melde dich erneut an.',
  'functions/unavailable':
    'Der Dienst ist gerade nicht erreichbar. Bitte versuche es später erneut.',
};

export function getFirebaseErrorMessage(error: unknown): string {
  if (!isFirebaseErrorLike(error) || !error.code) {
    return FALLBACK_ERROR_MESSAGE;
  }

  return FIREBASE_ERROR_MESSAGES[error.code] ?? FALLBACK_ERROR_MESSAGE;
}

function isFirebaseErrorLike(error: unknown): error is IFirebaseErrorLike {
  return typeof error === 'object' && error !== null;
}
