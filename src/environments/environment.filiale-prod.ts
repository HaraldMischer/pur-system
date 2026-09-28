// pur-system/src/environments/environment.filiale-prod.ts

import {
  TFirestoreCacheArt,
  TFirestoreLesestrategien,
} from '../app/commons/models/app/firestore-lesestrategie.types';
import { firebaseConfig } from './firebase-config';
import {TUserRole} from '../app/commons/models/domain/benutzer';

export const environment = {
  production: true,
  serviceWorkerEnabled: true,
  appTitle: 'Pur Filiale',
  loginUserRole: 'filiale' as TUserRole | null,
  firestoreCache: 'persistent' as TFirestoreCacheArt,
  firestoreLesestrategien: {
    benutzerprofil: 'networkFirst',
    stammdaten: 'cacheFirst',
  } as TFirestoreLesestrategien,
  firebase: firebaseConfig,
};
