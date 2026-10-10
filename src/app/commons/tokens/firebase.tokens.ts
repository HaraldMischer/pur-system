// pur-system/src/app/commons/tokens/firebase.tokens.ts

import { InjectionToken } from '@angular/core';
import {
  EmailAuthProvider,
  authState,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from '@angular/fire/auth';
import {
  addDoc,
  collection,
  collectionData,
  deleteField,
  deleteDoc,
  doc,
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { httpsCallable } from '@angular/fire/functions';

export const AUTH_STATE = new InjectionToken<typeof authState>('AUTH_STATE', {
  providedIn: 'root',
  factory: () => authState,
});

export const SIGN_IN_WITH_EMAIL_AND_PASSWORD = new InjectionToken<
  typeof signInWithEmailAndPassword
>('SIGN_IN_WITH_EMAIL_AND_PASSWORD', {
  providedIn: 'root',
  factory: () => signInWithEmailAndPassword,
});

export const SIGN_OUT = new InjectionToken<typeof signOut>('SIGN_OUT', {
  providedIn: 'root',
  factory: () => signOut,
});

export const SEND_PASSWORD_RESET_EMAIL = new InjectionToken<typeof sendPasswordResetEmail>(
  'SEND_PASSWORD_RESET_EMAIL',
  {
    providedIn: 'root',
    factory: () => sendPasswordResetEmail,
  },
);

export const EMAIL_AUTH_CREDENTIAL = new InjectionToken<typeof EmailAuthProvider.credential>(
  'EMAIL_AUTH_CREDENTIAL',
  {
    providedIn: 'root',
    factory: () => EmailAuthProvider.credential,
  },
);

export const REAUTHENTICATE_WITH_CREDENTIAL = new InjectionToken<
  typeof reauthenticateWithCredential
>('REAUTHENTICATE_WITH_CREDENTIAL', {
  providedIn: 'root',
  factory: () => reauthenticateWithCredential,
});

export const UPDATE_PASSWORD = new InjectionToken<typeof updatePassword>('UPDATE_PASSWORD', {
  providedIn: 'root',
  factory: () => updatePassword,
});

export const FIRESTORE_DOC = new InjectionToken<typeof doc>('FIRESTORE_DOC', {
  providedIn: 'root',
  factory: () => doc,
});

export const FIRESTORE_GET_DOC_FROM_CACHE = new InjectionToken<typeof getDocFromCache>(
  'FIRESTORE_GET_DOC_FROM_CACHE',
  {
    providedIn: 'root',
    factory: () => getDocFromCache,
  },
);

export const FIRESTORE_GET_DOC_FROM_SERVER = new InjectionToken<typeof getDocFromServer>(
  'FIRESTORE_GET_DOC_FROM_SERVER',
  {
    providedIn: 'root',
    factory: () => getDocFromServer,
  },
);

export const FIRESTORE_GET_DOCS_FROM_CACHE = new InjectionToken<typeof getDocsFromCache>(
  'FIRESTORE_GET_DOCS_FROM_CACHE',
  {
    providedIn: 'root',
    factory: () => getDocsFromCache,
  },
);

export const FIRESTORE_GET_DOCS_FROM_SERVER = new InjectionToken<typeof getDocsFromServer>(
  'FIRESTORE_GET_DOCS_FROM_SERVER',
  {
    providedIn: 'root',
    factory: () => getDocsFromServer,
  },
);

export const FIRESTORE_DELETE_DOC = new InjectionToken<typeof deleteDoc>('FIRESTORE_DELETE_DOC', {
  providedIn: 'root',
  factory: () => deleteDoc,
});

export const FIRESTORE_DELETE_FIELD = new InjectionToken<typeof deleteField>(
  'FIRESTORE_DELETE_FIELD',
  {
    providedIn: 'root',
    factory: () => deleteField,
  },
);

export const FIRESTORE_ON_SNAPSHOT = new InjectionToken<typeof onSnapshot>(
  'FIRESTORE_ON_SNAPSHOT',
  {
    providedIn: 'root',
    factory: () => onSnapshot,
  },
);

export const FIRESTORE_COLLECTION = new InjectionToken<typeof collection>('FIRESTORE_COLLECTION', {
  providedIn: 'root',
  factory: () => collection,
});

export const FIRESTORE_COLLECTION_DATA = new InjectionToken<typeof collectionData>(
  'FIRESTORE_COLLECTION_DATA',
  {
    providedIn: 'root',
    factory: () => collectionData,
  },
);

export const FIRESTORE_QUERY = new InjectionToken<typeof query>('FIRESTORE_QUERY', {
  providedIn: 'root',
  factory: () => query,
});

export const FIRESTORE_WHERE = new InjectionToken<typeof where>('FIRESTORE_WHERE', {
  providedIn: 'root',
  factory: () => where,
});

export const HTTPS_CALLABLE = new InjectionToken<typeof httpsCallable>('HTTPS_CALLABLE', {
  providedIn: 'root',
  factory: () => httpsCallable,
});

export const FIRESTORE_ADD_DOC = new InjectionToken<typeof addDoc>('FIRESTORE_ADD_DOC', {
  providedIn: 'root',
  factory: () => addDoc,
});

export const FIRESTORE_SET_DOC = new InjectionToken<typeof setDoc>('FIRESTORE_SET_DOC', {
  providedIn: 'root',
  factory: () => setDoc,
});

export const FIRESTORE_WRITE_BATCH = new InjectionToken<typeof writeBatch>(
  'FIRESTORE_WRITE_BATCH',
  {
    providedIn: 'root',
    factory: () => writeBatch,
  },
);

export const FIRESTORE_RUN_TRANSACTION = new InjectionToken<typeof runTransaction>(
  'FIRESTORE_RUN_TRANSACTION',
  {
    providedIn: 'root',
    factory: () => runTransaction,
  },
);

export const FIRESTORE_SERVER_TIMESTAMP = new InjectionToken<typeof serverTimestamp>(
  'FIRESTORE_SERVER_TIMESTAMP',
  {
    providedIn: 'root',
    factory: () => serverTimestamp,
  },
);
