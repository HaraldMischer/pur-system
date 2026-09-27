// pur-system/src/environments/environment.mitarbeiter-prod.ts

import { firebaseConfig } from './firebase-config';

export const environment = {
  production: true,
  debugLog: false,
  serviceWorkerEnabled: true,
  appTitle: 'Pur Mitarbeiter',
  loginUserRole: 'mitarbeiter' as 'filiale' | 'office' | 'mitarbeiter' | 'master' | null,
  firebase: firebaseConfig,
};
