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
import { handleDeleteStruktureintrag, IDeleteStruktureintragData } from './delete-struktureintrag';

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
