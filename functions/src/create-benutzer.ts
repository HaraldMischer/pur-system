// pur-system/functions/src/create-benutzer.ts

import { HttpsError } from 'firebase-functions/v2/https';

import {
  buildAnmeldename,
  buildTechnischeAnmeldeadresse,
  normalizeNamensbestandteil,
} from './technische-anmeldeadresse';

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

type TBenutzerZugriffe = Record<string, Record<string, string[]>>;

export interface ICreateBenutzerData {
  namensbestandteil: string;
  anzeigename: string;
  userRole: TUserRole;
  erlaubteBereiche: TAppBereich[];
  zugriffe: TBenutzerZugriffe;
  firmaMitarbeiterId?: string;
  passwort: string;
}

export interface ICreateBenutzerResult {
  uid: string;
  anmeldename: string;
  email: string;
}

interface ICreateBenutzerProfilData {
  anmeldename: string;
  email: string;
  anzeigename: string;
  userRole: TUserRole;
  erlaubteBereiche: TAppBereich[];
  zugriffe: TBenutzerZugriffe;
  firmaMitarbeiterId?: string;
}

interface IParsedCreateBenutzerData extends ICreateBenutzerProfilData {
  passwort: string;
}

interface ICreateBenutzerRequest {
  auth: { uid: string } | null | undefined;
  data: unknown;
}

interface ICreateBenutzerDependencies {
  getBenutzerProfil(uid: string): Promise<unknown>;
  existierenDokumente(pfade: readonly string[]): Promise<boolean>;
  getMitarbeiterDokument(pfad: string): Promise<unknown>;
  createAuthBenutzer(data: {
    email: string;
    displayName: string;
    password: string;
    disabled: true;
  }): Promise<{ uid: string }>;
  setBenutzerProfilDokument(uid: string, data: ICreateBenutzerProfilData): Promise<void>;
  setBenutzerProfilMitMitarbeiter(
    uid: string,
    data: ICreateBenutzerProfilData,
    mitarbeiterPfad: string,
  ): Promise<void>;
  removeMitarbeiterVerknuepfung(uid: string, mitarbeiterPfad: string): Promise<void>;
  setAuthBenutzerDisabled(uid: string, disabled: boolean): Promise<void>;
  deactivateBenutzerProfilDokument(uid: string): Promise<void>;
  logAnlageError(uid: string, schritt: string, error: unknown): void;
  deleteAuthBenutzer(uid: string): Promise<void>;
  logRollbackError(uid: string, error: unknown): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDokumentId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    !value.includes('/') &&
    !['.', '..'].includes(value.trim())
  );
}

function parseZugriffe(value: unknown, leereFiliallisteErlaubt: boolean): TBenutzerZugriffe {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', 'Zugriffe müssen als Objekt übergeben werden.');
  }

  const unternehmer = new Map<string, Map<string, string[]>>();
  for (const [roheUnternehmerId, firmenValue] of Object.entries(value)) {
    if (!isDokumentId(roheUnternehmerId) || !isRecord(firmenValue)) {
      throw new HttpsError(
        'invalid-argument',
        'Jeder Zugriff benötigt einen gültigen Unternehmer.',
      );
    }

    const unternehmerId = roheUnternehmerId.trim();
    const firmen = unternehmer.get(unternehmerId) ?? new Map<string, string[]>();
    for (const [roheFirmaId, filialIdsValue] of Object.entries(firmenValue)) {
      if (
        !isDokumentId(roheFirmaId) ||
        !isStringArray(filialIdsValue) ||
        (!leereFiliallisteErlaubt && filialIdsValue.length === 0) ||
        !filialIdsValue.every(isDokumentId)
      ) {
        throw new HttpsError('invalid-argument', 'Jede Firma benötigt eine gültige Filialliste.');
      }

      const firmaId = roheFirmaId.trim();
      firmen.set(firmaId, [
        ...new Set([
          ...(firmen.get(firmaId) ?? []),
          ...filialIdsValue.map((filialId) => filialId.trim()),
        ]),
      ]);
    }
    if (firmen.size === 0) {
      throw new HttpsError('invalid-argument', 'Jeder Unternehmer benötigt mindestens eine Firma.');
    }
    unternehmer.set(unternehmerId, firmen);
  }

  return Object.fromEntries(
    [...unternehmer].map(([unternehmerId, firmen]) => [unternehmerId, Object.fromEntries(firmen)]),
  );
}

function parseCreateBenutzerData(value: unknown): IParsedCreateBenutzerData {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', 'Benutzerdaten fehlen.');
  }

  const namensbestandteil =
    typeof value['namensbestandteil'] === 'string'
      ? normalizeNamensbestandteil(value['namensbestandteil'])
      : '';
  const anzeigename = typeof value['anzeigename'] === 'string' ? value['anzeigename'].trim() : '';
  const userRole = value['userRole'];
  const erlaubteBereiche = value['erlaubteBereiche'];
  const firmaMitarbeiterIdValue = value['firmaMitarbeiterId'];
  const passwort = typeof value['passwort'] === 'string' ? value['passwort'] : undefined;

  if (!namensbestandteil) {
    throw new HttpsError('invalid-argument', 'Ein gültiger Namensbestandteil ist erforderlich.');
  }

  if (!anzeigename) {
    throw new HttpsError('invalid-argument', 'Ein Anzeigename ist erforderlich.');
  }

  if (typeof userRole !== 'string' || !USER_ROLES.includes(userRole as TUserRole)) {
    throw new HttpsError('invalid-argument', 'Die Benutzerrolle ist ungültig.');
  }

  const firmaMitarbeiterId =
    firmaMitarbeiterIdValue === undefined
      ? undefined
      : isDokumentId(firmaMitarbeiterIdValue)
        ? firmaMitarbeiterIdValue.trim()
        : null;
  if (firmaMitarbeiterId === null) {
    throw new HttpsError('invalid-argument', 'Die Firma-Mitarbeiter-ID ist ungültig.');
  }

  const anmeldename = buildAnmeldename(namensbestandteil, userRole);
  const email = buildTechnischeAnmeldeadresse(anmeldename);

  if (
    !isStringArray(erlaubteBereiche) ||
    erlaubteBereiche.some((bereich) => !APP_BEREICHE.includes(bereich as TAppBereich))
  ) {
    throw new HttpsError('invalid-argument', 'Die erlaubten Bereiche sind ungültig.');
  }

  if (!passwort || passwort.length < 8) {
    throw new HttpsError(
      'invalid-argument',
      'Das Anfangspasswort muss mindestens 8 Zeichen haben.',
    );
  }

  const ausgewaehlteBereiche = new Set(erlaubteBereiche);
  const normalisierteBereiche: TAppBereich[] = [
    'dashboard',
    ...WAEHLBARE_APP_BEREICHE.filter((bereich) => ausgewaehlteBereiche.has(bereich)),
  ];
  if (userRole === 'master') {
    normalisierteBereiche.push('systemverwaltung');
  }

  const parsed: IParsedCreateBenutzerData = {
    anmeldename,
    email,
    anzeigename,
    userRole: userRole as TUserRole,
    erlaubteBereiche: normalisierteBereiche,
    zugriffe: parseZugriffe(value['zugriffe'], userRole === 'mitarbeiter'),
    passwort,
  };
  if (firmaMitarbeiterId) {
    parsed.firmaMitarbeiterId = firmaMitarbeiterId;
  }
  return parsed;
}

function pruefeMitarbeiterDokument(dokument: unknown): void {
  if (!isRecord(dokument)) {
    throw new HttpsError('invalid-argument', 'Der gewählte Firma-Mitarbeiter existiert nicht.');
  }
  if (dokument['aktiv'] !== true) {
    throw new HttpsError('failed-precondition', 'Der gewählte Firma-Mitarbeiter ist inaktiv.');
  }

  const benutzerUid = dokument['benutzerUid'];
  if (typeof benutzerUid === 'string' && benutzerUid.trim()) {
    throw new HttpsError(
      'already-exists',
      'Der gewählte Firma-Mitarbeiter besitzt bereits einen Benutzerzugang.',
    );
  }
}

function mapAuthError(error: unknown): HttpsError {
  const code = isRecord(error) && typeof error['code'] === 'string' ? error['code'] : '';

  if (code === 'auth/email-already-exists') {
    return new HttpsError(
      'already-exists',
      'Für diesen Anmeldenamen existiert bereits ein Konto. Bitte einen anderen Namensbestandteil verwenden.',
    );
  }

  if (code === 'auth/invalid-email') {
    return new HttpsError('internal', 'Die technische Anmeldeadresse konnte nicht erzeugt werden.');
  }

  return new HttpsError('internal', 'Der Auth-Benutzer konnte nicht angelegt werden.');
}

export async function handleCreateBenutzer(
  request: ICreateBenutzerRequest,
  dependencies: ICreateBenutzerDependencies,
): Promise<ICreateBenutzerResult> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Anmeldung erforderlich.');
  }

  const masterProfil = await dependencies.getBenutzerProfil(request.auth.uid);

  if (
    !isRecord(masterProfil) ||
    masterProfil['aktiv'] !== true ||
    masterProfil['userRole'] !== 'master'
  ) {
    throw new HttpsError('permission-denied', 'Nur aktive Master dürfen Benutzer anlegen.');
  }

  const data = parseCreateBenutzerData(request.data);
  const zugriffsEintraege = Object.entries(data.zugriffe).flatMap(([unternehmerId, firmen]) =>
    Object.entries(firmen).map(([firmaId, filialIds]) => ({
      unternehmerId,
      firmaId,
      filialIds,
    })),
  );
  if (
    data.userRole === 'mitarbeiter' &&
    (Object.keys(data.zugriffe).length !== 1 ||
      zugriffsEintraege.length !== 1 ||
      zugriffsEintraege[0].filialIds.length !== 0 ||
      !data.firmaMitarbeiterId)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Mitarbeiterzugänge benötigen genau einen Unternehmer, eine Firma und einen Firma-Mitarbeiter.',
    );
  }
  if (data.userRole !== 'mitarbeiter' && data.firmaMitarbeiterId !== undefined) {
    throw new HttpsError(
      'invalid-argument',
      'Eine Firma-Mitarbeiter-ID ist nur für Mitarbeiterzugänge zulässig.',
    );
  }
  if (
    data.userRole !== 'master' &&
    data.userRole !== 'mitarbeiter' &&
    zugriffsEintraege.length === 0
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Office- und Filialkonten benötigen mindestens eine vollständige Datenzuordnung.',
    );
  }
  if (
    data.userRole === 'filiale' &&
    (Object.keys(data.zugriffe).length !== 1 ||
      zugriffsEintraege.length !== 1 ||
      zugriffsEintraege[0].filialIds.length !== 1)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Filialkonten benötigen genau eine Firma mit genau einer Filiale.',
    );
  }
  const pfade = [
    ...new Set(
      zugriffsEintraege.flatMap((zugriff) => {
        const unternehmer = `unternehmer/${zugriff.unternehmerId}`;
        const firma = `${unternehmer}/firma/${zugriff.firmaId}`;
        return [unternehmer, firma, ...zugriff.filialIds.map((id) => `${firma}/filiale/${id}`)];
      }),
    ),
  ];
  if (pfade.length > 0) {
    let vorhanden: boolean;
    try {
      vorhanden = await dependencies.existierenDokumente(pfade);
    } catch {
      throw new HttpsError(
        'unavailable',
        'Die Datenzugriffe konnten nicht geprüft werden. Bitte erneut versuchen.',
      );
    }
    if (!vorhanden) {
      throw new HttpsError(
        'invalid-argument',
        'Die gewählten Unternehmer, Firmen oder Filialen existieren nicht in dieser Zuordnung.',
      );
    }
  }
  const mitarbeiterPfad =
    data.userRole === 'mitarbeiter'
      ? `unternehmer/${zugriffsEintraege[0].unternehmerId}/firma/${zugriffsEintraege[0].firmaId}/mitarbeiter/${data.firmaMitarbeiterId}`
      : null;
  if (mitarbeiterPfad) {
    try {
      pruefeMitarbeiterDokument(await dependencies.getMitarbeiterDokument(mitarbeiterPfad));
    } catch (error: unknown) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        'unavailable',
        'Der Firma-Mitarbeiter konnte nicht geprüft werden. Bitte erneut versuchen.',
      );
    }
  }
  let authBenutzer: { uid: string };

  try {
    authBenutzer = await dependencies.createAuthBenutzer({
      email: data.email,
      displayName: data.anzeigename,
      password: data.passwort,
      disabled: true,
    });
  } catch (error: unknown) {
    throw mapAuthError(error);
  }

  let aktivierungVersucht = false;
  let verknuepfungVersucht = false;
  try {
    const { passwort, ...benutzerProfilDokument } = data;
    if (mitarbeiterPfad) {
      verknuepfungVersucht = true;
      await dependencies.setBenutzerProfilMitMitarbeiter(
        authBenutzer.uid,
        benutzerProfilDokument,
        mitarbeiterPfad,
      );
    } else {
      await dependencies.setBenutzerProfilDokument(authBenutzer.uid, benutzerProfilDokument);
    }

    aktivierungVersucht = true;
    await dependencies.setAuthBenutzerDisabled(authBenutzer.uid, false);

    return {
      uid: authBenutzer.uid,
      anmeldename: data.anmeldename,
      email: data.email,
    };
  } catch (error: unknown) {
    dependencies.logAnlageError(
      authBenutzer.uid,
      aktivierungVersucht ? 'aktivierung' : 'profil',
      error,
    );
    let bereinigungFehlgeschlagen = false;
    if (aktivierungVersucht) {
      // Ein Fehler kann auch nach erfolgreicher Aktivierung auftreten (z. B. Timeout).
      // Das Profil bleibt erhalten, damit vorhandene Tokens nie Legacy-Rechte erhalten.
      for (const [schritt, bereinigen] of [
        ['auth-deaktivieren', () => dependencies.setAuthBenutzerDisabled(authBenutzer.uid, true)],
        [
          'profil-deaktivieren',
          () => dependencies.deactivateBenutzerProfilDokument(authBenutzer.uid),
        ],
      ] as const) {
        try {
          await bereinigen();
        } catch (cleanupError: unknown) {
          bereinigungFehlgeschlagen = true;
          dependencies.logAnlageError(authBenutzer.uid, schritt, cleanupError);
        }
      }
    }
    if (mitarbeiterPfad && verknuepfungVersucht) {
      try {
        await dependencies.removeMitarbeiterVerknuepfung(authBenutzer.uid, mitarbeiterPfad);
      } catch (cleanupError: unknown) {
        bereinigungFehlgeschlagen = true;
        dependencies.logAnlageError(
          authBenutzer.uid,
          'mitarbeiter-verknuepfung-entfernen',
          cleanupError,
        );
      }
    }
    try {
      await dependencies.deleteAuthBenutzer(authBenutzer.uid);
    } catch (rollbackError: unknown) {
      bereinigungFehlgeschlagen = true;
      dependencies.logRollbackError(authBenutzer.uid, rollbackError);
    }

    if (!bereinigungFehlgeschlagen && error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      bereinigungFehlgeschlagen
        ? 'Die Benutzeranlage ist fehlgeschlagen. Die Bereinigung ist unvollständig; bitte den Administrator zur Prüfung verständigen.'
        : 'Die Benutzeranlage ist fehlgeschlagen. Das Auth-Konto wurde entfernt; ein eventuell gespeichertes Profil bleibt zur Absicherung erhalten.',
    );
  }
}
