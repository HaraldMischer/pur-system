// pur-system/src/environments/environment.prod.ts

import { firebaseConfig } from './firebase-config';

export const environment = {
  production: true,
  debugLog: false,
  serviceWorkerEnabled: true,
  appTitle: 'Pur Office',
  loginUserRole: 'office' as 'filiale' | 'office' | 'mitarbeiter' | 'master' | null,
  firebase: firebaseConfig,
};
