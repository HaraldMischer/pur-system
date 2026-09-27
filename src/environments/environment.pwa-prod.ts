// pur-system/src/environments/environment.pwa-prod.ts

import { firebaseConfig } from './firebase-config';

export const environment = {
  production: true,
  debugLog: false,
  serviceWorkerEnabled: true,
  appTitle: 'Pur Filiale',
  loginUserRole: 'filiale' as 'filiale' | 'office' | 'mitarbeiter' | 'master' | null,
  firebase: firebaseConfig,
};
