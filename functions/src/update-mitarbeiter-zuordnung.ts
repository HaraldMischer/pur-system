// pur-system/functions/src/update-mitarbeiter-zuordnung.ts

import { HttpsError } from 'firebase-functions/v2/https';

export interface IUpdateMitarbeiterZuordnungData {
  uid: string;
  unternehmerId: string;
  firmaId: string;
  firmaMitarbeiterId: string;
}

interface IUpdateMitarbeiterZuordnungRequest {
  auth: { uid: string } | null | undefined;
  data: unknown;
}

interface IUpdateMitarbeiterZuordnungDependencies {
  getBenutzerProfil(uid: string): Promise<unknown>;
  updateMitarbeiterZuordnung(data: IUpdateMitarbeiterZuordnungData): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDokumentId(value: unknown, feldname: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.includes('/') ||
    ['.', '..'].includes(value.trim())
  ) {
    throw new HttpsError('invalid-argument', `${feldname} ist ungültig.`);
  }

  return value.trim();
}

function parseData(value: unknown): IUpdateMitarbeiterZuordnungData {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', 'Die Mitarbeiterzuordnung fehlt.');
  }

  return {
    uid: parseDokumentId(value['uid'], 'Benutzer-UID'),
    unternehmerId: parseDokumentId(value['unternehmerId'], 'Unternehmer-ID'),
    firmaId: parseDokumentId(value['firmaId'], 'Firma-ID'),
    firmaMitarbeiterId: parseDokumentId(value['firmaMitarbeiterId'], 'Firma-Mitarbeiter-ID'),
  };
}

/**
 * Ordnet ein vorhandenes Mitarbeiterkonto einem anderen fachlichen Mitarbeiter zu.
 *
 * @param request - Authentifizierter Callable-Aufruf mit der neuen Zuordnung.
 * @param dependencies - Serverseitige Profil- und Transaktionszugriffe.
 */
export async function handleUpdateMitarbeiterZuordnung(
  request: IUpdateMitarbeiterZuordnungRequest,
  dependencies: IUpdateMitarbeiterZuordnungDependencies,
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
    throw new HttpsError(
      'permission-denied',
      'Nur aktive Master dürfen Mitarbeiterkonten neu zuordnen.',
    );
  }

  const data = parseData(request.data);
  const zielProfil = await dependencies.getBenutzerProfil(data.uid);
  if (!isRecord(zielProfil)) {
    throw new HttpsError('not-found', 'Das Benutzerprofil existiert nicht.');
  }
  if (zielProfil['userRole'] !== 'mitarbeiter') {
    throw new HttpsError(
      'failed-precondition',
      'Nur Mitarbeiterkonten können fachlich neu zugeordnet werden.',
    );
  }

  try {
    await dependencies.updateMitarbeiterZuordnung(data);
  } catch (error: unknown) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      'unavailable',
      'Die Mitarbeiterzuordnung konnte nicht aktualisiert werden. Bitte erneut versuchen.',
    );
  }
}
