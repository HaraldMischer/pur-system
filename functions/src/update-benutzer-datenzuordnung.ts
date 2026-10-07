// pur-system/functions/src/update-benutzer-datenzuordnung.ts

import { HttpsError } from 'firebase-functions/v2/https';

type TBenutzerZugriffe = Record<string, Record<string, string[]>>;

export interface IUpdateBenutzerDatenzuordnungData {
  uid: string;
  zugriffe: TBenutzerZugriffe;
}

interface IUpdateBenutzerDatenzuordnungRequest {
  auth: { uid: string } | null | undefined;
  data: unknown;
}

interface IUpdateBenutzerDatenzuordnungDependencies {
  getBenutzerProfil(uid: string): Promise<unknown>;
  existierenDokumente(pfade: readonly string[]): Promise<boolean>;
  updateDatenzuordnung(uid: string, zugriffe: TBenutzerZugriffe): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDokumentId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    !value.includes('/') &&
    !['.', '..'].includes(value.trim())
  );
}

function parseUid(value: unknown): string {
  if (!isDokumentId(value)) {
    throw new HttpsError('invalid-argument', 'Die Benutzer-UID ist ungültig.');
  }
  return value.trim();
}

function parseZugriffe(value: unknown, userRole: 'office' | 'filiale'): TBenutzerZugriffe {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', 'Die Datenzuordnung fehlt.');
  }

  const unternehmer = new Map<string, Map<string, string[]>>();
  for (const [unternehmerId, firmenValue] of Object.entries(value)) {
    if (!isDokumentId(unternehmerId) || !isRecord(firmenValue)) {
      throw new HttpsError('invalid-argument', 'Die Datenzuordnung enthält ungültige Einträge.');
    }
    const firmen = new Map<string, string[]>();
    for (const [firmaId, filialIdsValue] of Object.entries(firmenValue)) {
      if (
        !isDokumentId(firmaId) ||
        !Array.isArray(filialIdsValue) ||
        filialIdsValue.length === 0 ||
        !filialIdsValue.every(isDokumentId)
      ) {
        throw new HttpsError('invalid-argument', 'Jede Firma benötigt gültige Filialen.');
      }
      firmen.set(firmaId.trim(), [...new Set(filialIdsValue.map((filialId) => filialId.trim()))]);
    }
    if (firmen.size === 0) {
      throw new HttpsError('invalid-argument', 'Der Unternehmer benötigt mindestens eine Firma.');
    }
    unternehmer.set(unternehmerId.trim(), firmen);
  }

  const zugriffe = Object.fromEntries(
    [...unternehmer].map(([unternehmerId, firmen]) => [unternehmerId, Object.fromEntries(firmen)]),
  );
  const firmen = Object.values(zugriffe).flatMap((eintrag) => Object.values(eintrag));
  if (
    Object.keys(zugriffe).length !== 1 ||
    firmen.length === 0 ||
    (userRole === 'filiale' && (firmen.length !== 1 || firmen[0].length !== 1))
  ) {
    throw new HttpsError('invalid-argument', 'Die Datenzuordnung passt nicht zur Benutzerrolle.');
  }
  return zugriffe;
}

function getPfade(zugriffe: TBenutzerZugriffe): string[] {
  return Object.entries(zugriffe).flatMap(([unternehmerId, firmen]) => [
    `unternehmer/${unternehmerId}`,
    ...Object.entries(firmen).flatMap(([firmaId, filialIds]) => [
      `unternehmer/${unternehmerId}/firma/${firmaId}`,
      ...filialIds.map(
        (filialId) => `unternehmer/${unternehmerId}/firma/${firmaId}/filiale/${filialId}`,
      ),
    ]),
  ]);
}

/**
 * Aktualisiert die Datenzuordnung eines Office- oder Filialkontos.
 *
 * @param request - Authentifizierter Callable-Aufruf mit der Datenzuordnung.
 * @param dependencies - Serverseitige Profil- und Strukturzugriffe.
 */
export async function handleUpdateBenutzerDatenzuordnung(
  request: IUpdateBenutzerDatenzuordnungRequest,
  dependencies: IUpdateBenutzerDatenzuordnungDependencies,
): Promise<void> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Anmeldung erforderlich.');

  const masterProfil = await dependencies.getBenutzerProfil(request.auth.uid);
  if (
    !isRecord(masterProfil) ||
    masterProfil['aktiv'] !== true ||
    masterProfil['userRole'] !== 'master'
  ) {
    throw new HttpsError('permission-denied', 'Nur aktive Master dürfen Datenzuordnungen ändern.');
  }

  const uid = parseUid(isRecord(request.data) ? request.data['uid'] : undefined);
  const zielProfil = await dependencies.getBenutzerProfil(uid);
  if (!isRecord(zielProfil)) {
    throw new HttpsError('not-found', 'Das Benutzerprofil existiert nicht.');
  }
  const userRole = zielProfil['userRole'];
  if (userRole !== 'office' && userRole !== 'filiale') {
    throw new HttpsError(
      'failed-precondition',
      'Nur Office- und Filialkonten können über diese Aktion neu zugeordnet werden.',
    );
  }

  const zugriffe = parseZugriffe(
    isRecord(request.data) ? request.data['zugriffe'] : undefined,
    userRole,
  );
  if (!(await dependencies.existierenDokumente(getPfade(zugriffe)))) {
    throw new HttpsError(
      'invalid-argument',
      'Mindestens ein gewählter Unternehmer-, Firmen- oder Filialeintrag existiert nicht.',
    );
  }

  try {
    await dependencies.updateDatenzuordnung(uid, zugriffe);
  } catch (error: unknown) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      'unavailable',
      'Die Datenzuordnung konnte nicht aktualisiert werden. Bitte erneut versuchen.',
    );
  }
}
