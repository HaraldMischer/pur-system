// pur-system/functions/src/delete-struktureintrag.ts

import { HttpsError } from 'firebase-functions/v2/https';

const STRUKTUR_TYPEN = ['unternehmer', 'firma', 'filiale'] as const;

type TStrukturTyp = (typeof STRUKTUR_TYPEN)[number];

export interface IDeleteStruktureintragData {
  typ: TStrukturTyp;
  unternehmerId: string;
  firmaId?: string;
  filialId?: string;
}

interface IDeleteStruktureintragRequest {
  auth: { uid: string } | null | undefined;
  data: unknown;
}

interface IDeleteStruktureintragDependencies {
  getBenutzerProfil(uid: string): Promise<unknown>;
  existiertDokument(pfad: string): Promise<boolean>;
  hatReferenzen(data: IDeleteStruktureintragData): Promise<boolean>;
  deleteRekursiv(pfad: string): Promise<void>;
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

function parseData(value: unknown): IDeleteStruktureintragData {
  if (!isRecord(value) || !STRUKTUR_TYPEN.includes(value['typ'] as TStrukturTyp)) {
    throw new HttpsError('invalid-argument', 'Der Strukturtyp ist ungültig.');
  }

  const typ = value['typ'] as TStrukturTyp;
  const unternehmerId = parseDokumentId(value['unternehmerId'], 'Unternehmer-ID');
  const firmaId =
    typ === 'firma' || typ === 'filiale'
      ? parseDokumentId(value['firmaId'], 'Firma-ID')
      : undefined;
  const filialId = typ === 'filiale' ? parseDokumentId(value['filialId'], 'Filial-ID') : undefined;

  return {
    typ,
    unternehmerId,
    ...(firmaId ? { firmaId } : {}),
    ...(filialId ? { filialId } : {}),
  };
}

function getDokumentPfad(data: IDeleteStruktureintragData): string {
  const unternehmerPfad = `unternehmer/${data.unternehmerId}`;
  if (data.typ === 'unternehmer') return unternehmerPfad;

  const firmaPfad = `${unternehmerPfad}/firma/${data.firmaId}`;
  return data.typ === 'firma' ? firmaPfad : `${firmaPfad}/filiale/${data.filialId}`;
}

/**
 * Löscht einen unreferenzierten Strukturzweig einschließlich seiner Untercollections.
 *
 * @param request - Authentifizierter Callable-Aufruf mit dem zu löschenden Struktureintrag.
 * @param dependencies - Serverseitige Profil-, Referenz- und Firestore-Zugriffe.
 */
export async function handleDeleteStruktureintrag(
  request: IDeleteStruktureintragRequest,
  dependencies: IDeleteStruktureintragDependencies,
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
    throw new HttpsError('permission-denied', 'Nur aktive Master dürfen Strukturdaten löschen.');
  }

  const data = parseData(request.data);
  const dokumentPfad = getDokumentPfad(data);

  if (!(await dependencies.existiertDokument(dokumentPfad))) {
    throw new HttpsError('not-found', 'Der Struktureintrag existiert nicht.');
  }
  if (await dependencies.hatReferenzen(data)) {
    throw new HttpsError(
      'failed-precondition',
      'Der Struktureintrag wird noch von Benutzerprofilen oder Mitarbeitern verwendet.',
    );
  }

  try {
    await dependencies.deleteRekursiv(dokumentPfad);
  } catch {
    throw new HttpsError(
      'unavailable',
      'Der Struktureintrag konnte nicht gelöscht werden. Bitte erneut versuchen.',
    );
  }
}
