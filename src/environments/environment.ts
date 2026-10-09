// pur-system/src/environments/environment.ts

import {
  TFirestoreCacheArt,
  TFirestoreLesestrategien,
} from '../app/commons/models/app/firestore-lesestrategie.types';
import { firebaseConfig } from './firebase-config';
import { TUserRole } from '../app/commons/models/domain/benutzer';

export const environment = {
  production: false,
  serviceWorkerEnabled: false,
  appTitle: 'Pur-System',
  loginUserRole: null as TUserRole | null,
  firestoreCache: 'memory' as TFirestoreCacheArt,
  firestoreLesestrategien: {
    benutzerprofil: 'networkOnly',
    stammdaten: 'networkOnly',
    dienstplaene: 'networkOnly',
  } as TFirestoreLesestrategien,
  firebase: firebaseConfig,
};
