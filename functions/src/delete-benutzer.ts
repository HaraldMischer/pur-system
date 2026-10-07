// pur-system/functions/src/delete-benutzer.ts

import { HttpsError } from 'firebase-functions/v2/https';

export interface IDeleteBenutzerData {
  uid: string;
}

interface IDeleteBenutzerRequest {
  auth: { uid: string } | null | undefined;
  data: unknown;
}

interface IDeleteBenutzerDependencies {
  getBenutzerProfil(uid: string): Promise<unknown>;
  deleteAuthBenutzer(uid: string): Promise<void>;
  deleteBenutzerProfil(uid: string): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseUid(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.includes('/') ||
    ['.', '..'].includes(value.trim())
  ) {
    throw new HttpsError('invalid-argument', 'Die Benutzer-UID ist ungültig.');
  }
  return value.trim();
}

/**
 * Löscht ein Office-, Filial- oder Mitarbeiterkonto und entfernt bei Bedarf seine Verknüpfung.
 *
 * @param request - Authentifizierter Callable-Aufruf mit der Benutzer-UID.
 * @param dependencies - Serverseitige Authentifizierungs-, Profil- und Transaktionszugriffe.
 */
export async function handleDeleteBenutzer(
  request: IDeleteBenutzerRequest,
  dependencies: IDeleteBenutzerDependencies,
): Promise<void> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Anmeldung erforderlich.');
  }

  const masterProfil = await dependencies.getBenutzerProfil(request.auth.uid);
  if (
    !isRecord(masterProfil) ||
    masterProfil['aktiv'] !== true ||
    masterProfil['userRole'] !== 'master'
  ) {
    throw new HttpsError('permission-denied', 'Nur aktive Master dürfen Benutzerkonten löschen.');
  }

  const uid = parseUid(isRecord(request.data) ? request.data['uid'] : undefined);
  const zielProfil = await dependencies.getBenutzerProfil(uid);
  if (!isRecord(zielProfil)) {
    throw new HttpsError('not-found', 'Das Benutzerprofil existiert nicht.');
  }
  if (!['office', 'filiale', 'mitarbeiter'].includes(String(zielProfil['userRole']))) {
    throw new HttpsError(
      'failed-precondition',
      'Masterkonten können über diese Aktion nicht gelöscht werden.',
    );
  }

  try {
    await dependencies.deleteAuthBenutzer(uid);
    await dependencies.deleteBenutzerProfil(uid);
  } catch (error: unknown) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      'unavailable',
      'Das Benutzerkonto konnte nicht vollständig gelöscht werden. Bitte erneut versuchen.',
    );
  }
}
