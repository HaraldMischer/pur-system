// pur-system/src/environments/environment.master-prod.ts

import { firebaseConfig } from './firebase-config';

export const environment = {
  production: true,
  debugLog: false,
  serviceWorkerEnabled: true,
  appTitle: 'Pur Master',
  loginUserRole: 'master' as 'filiale' | 'office' | 'mitarbeiter' | 'master' | null,
  firebase: firebaseConfig,
};
