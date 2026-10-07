// pur-system/functions/src/index.ts

import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  handleCreateBenutzer,
  ICreateBenutzerData,
  ICreateBenutzerResult,
} from './create-benutzer';
import { handleDeleteBenutzer, IDeleteBenutzerData } from './delete-benutzer';
import { handleDeleteStruktureintrag, IDeleteStruktureintragData } from './delete-struktureintrag';
import {
  handleUpdateBenutzerDatenzuordnung,
  IUpdateBenutzerDatenzuordnungData,
} from './update-benutzer-datenzuordnung';
import { handleUpdateBenutzerProfil, IUpdateBenutzerProfilData } from './update-benutzer-profil';
import {
  handleUpdateMitarbeiterZuordnung,
  IUpdateMitarbeiterZuordnungData,
} from './update-mitarbeiter-zuordnung';

const app = getApps().length > 0 ? getApp() : initializeApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hatZugriffsReferenz(profil: unknown, data: IDeleteStruktureintragData): boolean {
  if (!isRecord(profil) || !isRecord(profil['zugriffe'])) return false;
  const firmen = profil['zugriffe'][data.unternehmerId];
  if (data.typ === 'unternehmer') return firmen !== undefined;
  if (!isRecord(firmen) || !data.firmaId) return false;
  const filialIds = firmen[data.firmaId];
  if (data.typ === 'firma') return filialIds !== undefined;
  return Array.isArray(filialIds) && filialIds.includes(data.filialId);
}

function getMitarbeiterPfad(profil: unknown): string | null {
  if (!isRecord(profil) || !isRecord(profil['zugriffe'])) return null;
  const [unternehmerEintrag] = Object.entries(profil['zugriffe']);
  if (!unternehmerEintrag || !isRecord(unternehmerEintrag[1])) return null;
  const [firmaId] = Object.keys(unternehmerEintrag[1]);
  const mitarbeiterId = profil['firmaMitarbeiterId'];
  if (!firmaId || typeof mitarbeiterId !== 'string' || !mitarbeiterId.trim()) return null;
  return `unternehmer/${unternehmerEintrag[0]}/firma/${firmaId}/mitarbeiter/${mitarbeiterId}`;
}

export const createBenutzer = onCall<ICreateBenutzerData, Promise<ICreateBenutzerResult>>(
  { region: 'europe-west1' },
  async (request) =>
    handleCreateBenutzer(
      { auth: request.auth, data: request.data },
      {
        getBenutzerProfil: async (uid) => {
          const snapshot = await firestore.doc(`benutzerprofil/${uid}`).get();
          return snapshot.exists ? snapshot.data() : null;
        },
        existierenDokumente: async (pfade) => {
          const dokumente = await firestore.getAll(...pfade.map((pfad) => firestore.doc(pfad)));
          return dokumente.every((dokument) => dokument.exists);
        },
        getMitarbeiterDokument: async (pfad) => {
          const snapshot = await firestore.doc(pfad).get();
          return snapshot.exists ? snapshot.data() : null;
        },
        createAuthBenutzer: (data) =>
          auth.createUser({
            email: data.email,
            displayName: data.displayName,
            password: data.password,
            disabled: data.disabled,
            emailVerified: false,
          }),
        setBenutzerProfilDokument: async (uid, data) => {
          await firestore.doc(`benutzerprofil/${uid}`).set({
            anmeldename: data.anmeldename,
            email: data.email,
            anzeigename: data.anzeigename,
            aktiv: true,
            userRole: data.userRole,
            erlaubteBereiche: data.erlaubteBereiche,
            zugriffe: data.zugriffe,
            ...(data.firmaMitarbeiterId ? { firmaMitarbeiterId: data.firmaMitarbeiterId } : {}),
            erstelltAm: FieldValue.serverTimestamp(),
            aktualisiertAm: FieldValue.serverTimestamp(),
          });
        },
        setBenutzerProfilMitMitarbeiter: async (uid, data, mitarbeiterPfad) => {
          const benutzerRef = firestore.doc(`benutzerprofil/${uid}`);
          const mitarbeiterRef = firestore.doc(mitarbeiterPfad);
          await firestore.runTransaction(async (transaction) => {
            const mitarbeiter = await transaction.get(mitarbeiterRef);
            if (!mitarbeiter.exists) {
              throw new HttpsError(
                'invalid-argument',
                'Der gewählte Firma-Mitarbeiter existiert nicht.',
              );
            }
            if (mitarbeiter.get('aktiv') !== true) {
              throw new HttpsError(
                'failed-precondition',
                'Der gewählte Firma-Mitarbeiter ist inaktiv.',
              );
            }
            const vorhandeneBenutzerUid = mitarbeiter.get('benutzerUid');
            if (typeof vorhandeneBenutzerUid === 'string' && vorhandeneBenutzerUid.trim()) {
              throw new HttpsError(
                'already-exists',
                'Der gewählte Firma-Mitarbeiter besitzt bereits einen Benutzerzugang.',
              );
            }

            transaction.set(benutzerRef, {
              anmeldename: data.anmeldename,
              email: data.email,
              anzeigename: data.anzeigename,
              aktiv: true,
              userRole: data.userRole,
              erlaubteBereiche: data.erlaubteBereiche,
              zugriffe: data.zugriffe,
              firmaMitarbeiterId: data.firmaMitarbeiterId,
              erstelltAm: FieldValue.serverTimestamp(),
              aktualisiertAm: FieldValue.serverTimestamp(),
            });
            transaction.update(mitarbeiterRef, {
              benutzerUid: uid,
              aktualisiertAm: FieldValue.serverTimestamp(),
            });
          });
        },
        removeMitarbeiterVerknuepfung: async (uid, mitarbeiterPfad) => {
          const benutzerRef = firestore.doc(`benutzerprofil/${uid}`);
          const mitarbeiterRef = firestore.doc(mitarbeiterPfad);
          await firestore.runTransaction(async (transaction) => {
            const [benutzer, mitarbeiter] = await Promise.all([
              transaction.get(benutzerRef),
              transaction.get(mitarbeiterRef),
            ]);
            if (mitarbeiter.exists && mitarbeiter.get('benutzerUid') === uid) {
              transaction.update(mitarbeiterRef, {
                benutzerUid: FieldValue.delete(),
                aktualisiertAm: FieldValue.serverTimestamp(),
              });
            }
            if (benutzer.exists && benutzer.get('firmaMitarbeiterId') === mitarbeiterRef.id) {
              transaction.update(benutzerRef, {
                aktiv: false,
                zugriffe: {},
                firmaMitarbeiterId: FieldValue.delete(),
                aktualisiertAm: FieldValue.serverTimestamp(),
              });
            }
          });
        },
        setAuthBenutzerDisabled: async (uid, disabled) => {
          await auth.updateUser(uid, { disabled });
        },
        deactivateBenutzerProfilDokument: async (uid) => {
          await firestore.doc(`benutzerprofil/${uid}`).update({
            aktiv: false,
            aktualisiertAm: FieldValue.serverTimestamp(),
          });
        },
        logAnlageError: (uid, schritt, error) => {
          logger.error('Benutzeranlage fehlgeschlagen; Konto und Profil prüfen.', {
            uid,
            schritt,
            error,
          });
        },
        deleteAuthBenutzer: (uid) => auth.deleteUser(uid),
        logRollbackError: (uid, error) => {
          logger.error('Auth-Benutzer konnte beim Rollback nicht entfernt werden.', { uid, error });
        },
      },
    ),
);

export const updateBenutzerProfil = onCall<IUpdateBenutzerProfilData, Promise<void>>(
  { region: 'europe-west1' },
  async (request) =>
    handleUpdateBenutzerProfil(
      { auth: request.auth, data: request.data },
      {
        getBenutzerProfil: async (uid) => {
          const snapshot = await firestore.doc(`benutzerprofil/${uid}`).get();
          return snapshot.exists ? snapshot.data() : null;
        },
        updateBenutzerProfil: async (uid, data) => {
          await firestore.doc(`benutzerprofil/${uid}`).update({
            ...data,
            aktualisiertAm: FieldValue.serverTimestamp(),
          });
        },
      },
    ),
);

export const updateBenutzerDatenzuordnung = onCall<
  IUpdateBenutzerDatenzuordnungData,
  Promise<void>
>({ region: 'europe-west1' }, async (request) =>
  handleUpdateBenutzerDatenzuordnung(
    { auth: request.auth, data: request.data },
    {
      getBenutzerProfil: async (uid) => {
        const snapshot = await firestore.doc(`benutzerprofil/${uid}`).get();
        return snapshot.exists ? snapshot.data() : null;
      },
      existierenDokumente: async (pfade) => {
        const dokumente = await firestore.getAll(...pfade.map((pfad) => firestore.doc(pfad)));
        return dokumente.every((dokument) => dokument.exists);
      },
      updateDatenzuordnung: async (uid, zugriffe) => {
        const profilRef = firestore.doc(`benutzerprofil/${uid}`);
        await firestore.runTransaction(async (transaction) => {
          const profil = await transaction.get(profilRef);
          if (!profil.exists) {
            throw new HttpsError('not-found', 'Das Benutzerprofil existiert nicht.');
          }
          if (!['office', 'filiale'].includes(profil.get('userRole'))) {
            throw new HttpsError(
              'failed-precondition',
              'Nur Office- und Filialkonten können so neu zugeordnet werden.',
            );
          }
          transaction.update(profilRef, {
            zugriffe,
            aktualisiertAm: FieldValue.serverTimestamp(),
          });
        });
      },
    },
  ),
);

export const updateMitarbeiterZuordnung = onCall<IUpdateMitarbeiterZuordnungData, Promise<void>>(
  { region: 'europe-west1' },
  async (request) =>
    handleUpdateMitarbeiterZuordnung(
      { auth: request.auth, data: request.data },
      {
        getBenutzerProfil: async (uid) => {
          const snapshot = await firestore.doc(`benutzerprofil/${uid}`).get();
          return snapshot.exists ? snapshot.data() : null;
        },
        updateMitarbeiterZuordnung: async (data) => {
          const profilRef = firestore.doc(`benutzerprofil/${data.uid}`);
          const unternehmerRef = firestore.doc(`unternehmer/${data.unternehmerId}`);
          const firmaRef = firestore.doc(`unternehmer/${data.unternehmerId}/firma/${data.firmaId}`);
          const neuerMitarbeiterRef = firestore.doc(
            `unternehmer/${data.unternehmerId}/firma/${data.firmaId}/mitarbeiter/${data.firmaMitarbeiterId}`,
          );

          await firestore.runTransaction(async (transaction) => {
            const profil = await transaction.get(profilRef);
            if (!profil.exists) {
              throw new HttpsError('not-found', 'Das Benutzerprofil existiert nicht.');
            }
            if (profil.get('userRole') !== 'mitarbeiter') {
              throw new HttpsError(
                'failed-precondition',
                'Nur Mitarbeiterkonten können fachlich neu zugeordnet werden.',
              );
            }

            const alterMitarbeiterPfad = getMitarbeiterPfad(profil.data());
            const alterMitarbeiterRef = alterMitarbeiterPfad
              ? firestore.doc(alterMitarbeiterPfad)
              : null;
            const [unternehmer, firma, neuerMitarbeiter, alterMitarbeiter] = await Promise.all([
              transaction.get(unternehmerRef),
              transaction.get(firmaRef),
              transaction.get(neuerMitarbeiterRef),
              alterMitarbeiterRef && alterMitarbeiterRef.path !== neuerMitarbeiterRef.path
                ? transaction.get(alterMitarbeiterRef)
                : Promise.resolve(null),
            ]);

            if (!unternehmer.exists || !firma.exists || !neuerMitarbeiter.exists) {
              throw new HttpsError(
                'invalid-argument',
                'Der gewählte Unternehmer, die Firma oder der Mitarbeiter existiert nicht.',
              );
            }
            if (neuerMitarbeiter.get('aktiv') !== true) {
              throw new HttpsError('failed-precondition', 'Der gewählte Mitarbeiter ist inaktiv.');
            }
            const vorhandeneBenutzerUid = neuerMitarbeiter.get('benutzerUid');
            if (
              typeof vorhandeneBenutzerUid === 'string' &&
              vorhandeneBenutzerUid.trim() &&
              vorhandeneBenutzerUid !== data.uid
            ) {
              throw new HttpsError(
                'failed-precondition',
                'Der gewählte Mitarbeiter besitzt bereits einen Benutzerzugang.',
              );
            }

            if (
              alterMitarbeiterRef &&
              alterMitarbeiter?.exists &&
              alterMitarbeiter.get('benutzerUid') === data.uid
            ) {
              transaction.update(alterMitarbeiterRef, {
                benutzerUid: FieldValue.delete(),
                aktualisiertAm: FieldValue.serverTimestamp(),
              });
            }
            transaction.update(neuerMitarbeiterRef, {
              benutzerUid: data.uid,
              aktualisiertAm: FieldValue.serverTimestamp(),
            });
            transaction.update(profilRef, {
              zugriffe: { [data.unternehmerId]: { [data.firmaId]: [] } },
              firmaMitarbeiterId: data.firmaMitarbeiterId,
              aktualisiertAm: FieldValue.serverTimestamp(),
            });
          });
        },
      },
    ),
);

export const deleteBenutzer = onCall<IDeleteBenutzerData, Promise<void>>(
  { region: 'europe-west1' },
  async (request) =>
    handleDeleteBenutzer(
      { auth: request.auth, data: request.data },
      {
        getBenutzerProfil: async (uid) => {
          const snapshot = await firestore.doc(`benutzerprofil/${uid}`).get();
          return snapshot.exists ? snapshot.data() : null;
        },
        deleteAuthBenutzer: async (uid) => {
          try {
            await auth.deleteUser(uid);
          } catch (error: unknown) {
            if (!isRecord(error) || error['code'] !== 'auth/user-not-found') throw error;
          }
        },
        deleteBenutzerProfil: async (uid) => {
          const profilRef = firestore.doc(`benutzerprofil/${uid}`);
          await firestore.runTransaction(async (transaction) => {
            const profil = await transaction.get(profilRef);
            if (!profil.exists) return;

            const mitarbeiterPfad = getMitarbeiterPfad(profil.data());
            const mitarbeiterRef = mitarbeiterPfad ? firestore.doc(mitarbeiterPfad) : null;
            const mitarbeiter = mitarbeiterRef ? await transaction.get(mitarbeiterRef) : null;
            if (mitarbeiterRef && mitarbeiter?.exists && mitarbeiter.get('benutzerUid') === uid) {
              transaction.update(mitarbeiterRef, {
                benutzerUid: FieldValue.delete(),
                aktualisiertAm: FieldValue.serverTimestamp(),
              });
            }
            transaction.delete(profilRef);
          });
        },
      },
    ),
);

export const deleteStruktureintrag = onCall<IDeleteStruktureintragData, Promise<void>>(
  { region: 'europe-west1' },
  async (request) =>
    handleDeleteStruktureintrag(
      { auth: request.auth, data: request.data },
      {
        getBenutzerProfil: async (uid) => {
          const snapshot = await firestore.doc(`benutzerprofil/${uid}`).get();
          return snapshot.exists ? snapshot.data() : null;
        },
        existiertDokument: async (pfad) => {
          return (await firestore.doc(pfad).get()).exists;
        },
        hatReferenzen: async (data) => {
          const profile = await firestore.collection('benutzerprofil').get();
          if (profile.docs.some((profil) => hatZugriffsReferenz(profil.data(), data))) return true;
          if (data.typ !== 'filiale' || !data.firmaId || !data.filialId) return false;

          const mitarbeiter = await firestore
            .collection(`unternehmer/${data.unternehmerId}/firma/${data.firmaId}/mitarbeiter`)
            .where('filialIds', 'array-contains', data.filialId)
            .limit(1)
            .get();
          return !mitarbeiter.empty;
        },
        deleteRekursiv: async (pfad) => {
          await firestore.recursiveDelete(firestore.doc(pfad));
        },
      },
    ),
);
