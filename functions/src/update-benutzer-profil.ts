// pur-system/functions/src/update-benutzer-profil.ts

import { HttpsError } from 'firebase-functions/v2/https';

const USER_ROLES = ['filiale', 'office', 'master', 'mitarbeiter'] as const;
const APP_BEREICHE = [
  'dashboard',
  'schichtplan',
  'mitarbeiter',
  'verwaltung',
  'systemverwaltung',
] as const;
const WAEHLBARE_APP_BEREICHE = ['schichtplan', 'mitarbeiter', 'verwaltung'] as const;

type TUserRole = (typeof USER_ROLES)[number];
type TAppBereich = (typeof APP_BEREICHE)[number];

export interface IUpdateBenutzerProfilData {
  uid: string;
  anzeigename: string;
  aktiv: boolean;
  erlaubteBereiche: TAppBereich[];
}

interface IUpdateBenutzerProfilRequest {
  auth: { uid: string } | null | undefined;
  data: unknown;
}

interface IUpdateBenutzerProfilDependencies {
  getBenutzerProfil(uid: string): Promise<unknown>;
  updateBenutzerProfil(uid: string, data: Omit<IUpdateBenutzerProfilData, 'uid'>): Promise<void>;
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

function parseData(value: unknown, userRole: TUserRole): IUpdateBenutzerProfilData {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', 'Die Profildaten fehlen.');
  }

  const anzeigename = typeof value['anzeigename'] === 'string' ? value['anzeigename'].trim() : '';
  const aktiv = value['aktiv'];
  const erlaubteBereiche = value['erlaubteBereiche'];
  if (!anzeigename || typeof aktiv !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Die Profildaten sind unvollständig.');
  }
  if (
    !Array.isArray(erlaubteBereiche) ||
    erlaubteBereiche.some(
      (bereich) => typeof bereich !== 'string' || !APP_BEREICHE.includes(bereich as TAppBereich),
    )
  ) {
    throw new HttpsError('invalid-argument', 'Die erlaubten Bereiche sind ungültig.');
  }

  const ausgewaehlteBereiche = new Set(erlaubteBereiche);
  const normalisierteBereiche: TAppBereich[] = [
    'dashboard',
    ...WAEHLBARE_APP_BEREICHE.filter((bereich) => ausgewaehlteBereiche.has(bereich)),
  ];
  if (userRole === 'master') normalisierteBereiche.push('systemverwaltung');

  return {
    uid: parseUid(value['uid']),
    anzeigename,
    aktiv,
    erlaubteBereiche: normalisierteBereiche,
  };
}

/**
 * Aktualisiert die allgemeinen Profildaten eines Benutzerkontos.
 *
 * @param request - Authentifizierter Callable-Aufruf mit den Profildaten.
 * @param dependencies - Serverseitige Profilzugriffe.
 */
export async function handleUpdateBenutzerProfil(
  request: IUpdateBenutzerProfilRequest,
  dependencies: IUpdateBenutzerProfilDependencies,
): Promise<void> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Anmeldung erforderlich.');

  const masterProfil = await dependencies.getBenutzerProfil(request.auth.uid);
  if (
    !isRecord(masterProfil) ||
    masterProfil['aktiv'] !== true ||
    masterProfil['userRole'] !== 'master'
  ) {
    throw new HttpsError('permission-denied', 'Nur aktive Master dürfen Benutzerprofile ändern.');
  }

  const uid = parseUid(isRecord(request.data) ? request.data['uid'] : undefined);
  const zielProfil = await dependencies.getBenutzerProfil(uid);
  if (!isRecord(zielProfil)) {
    throw new HttpsError('not-found', 'Das Benutzerprofil existiert nicht.');
  }
  const userRole = zielProfil['userRole'];
  if (typeof userRole !== 'string' || !USER_ROLES.includes(userRole as TUserRole)) {
    throw new HttpsError('failed-precondition', 'Das Benutzerprofil besitzt keine gültige Rolle.');
  }

  const data = parseData(request.data, userRole as TUserRole);
  if (request.auth.uid === data.uid && !data.aktiv) {
    throw new HttpsError(
      'failed-precondition',
      'Das eigene Masterprofil darf nicht deaktiviert werden.',
    );
  }

  try {
    const { uid: _uid, ...aktualisierung } = data;
    await dependencies.updateBenutzerProfil(uid, aktualisierung);
  } catch (error: unknown) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      'unavailable',
      'Das Benutzerprofil konnte nicht aktualisiert werden. Bitte erneut versuchen.',
    );
  }
}
