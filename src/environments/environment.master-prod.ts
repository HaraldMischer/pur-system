// pur-system/src/environments/environment.master-prod.ts

import {
  TFirestoreCacheArt,
  TFirestoreLesestrategien,
} from '../app/commons/models/app/firestore-lesestrategie.types';
import { firebaseConfig } from './firebase-config';
import { TUserRole } from '../app/commons/models/domain/benutzer';

export const environment = {
  production: true,
  serviceWorkerEnabled: true,
  appTitle: 'Pur Master',
  loginUserRole: 'master' as TUserRole | null,
  firestoreCache: 'memory' as TFirestoreCacheArt,
  firestoreLesestrategien: {
    benutzerprofil: 'networkOnly',
    stammdaten: 'networkOnly',
  } as TFirestoreLesestrategien,
  firebase: firebaseConfig,
};
