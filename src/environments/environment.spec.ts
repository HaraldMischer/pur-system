// pur-system/src/environments/environment.spec.ts

import { environment as developmentEnvironment } from './environment';
import { environment as masterEnvironment } from './environment.master-prod';
import { environment as mitarbeiterEnvironment } from './environment.mitarbeiter-prod';
import { environment as filialeEnvironment } from './environment.filiale-prod';
import { environment as officeEnvironment } from './environment.office-prod';

describe('Firestore-Environment-Konfiguration', () => {
  it('should use a persistent cache only for Pur Filiale', () => {
    expect(filialeEnvironment.firestoreCache).toBe('persistent');
    expect(developmentEnvironment.firestoreCache).toBe('memory');
    expect(masterEnvironment.firestoreCache).toBe('memory');
    expect(officeEnvironment.firestoreCache).toBe('memory');
    expect(mitarbeiterEnvironment.firestoreCache).toBe('memory');
  });

  it('should use offline-capable read strategies only for Pur Filiale', () => {
    expect(filialeEnvironment.firestoreLesestrategien).toEqual({
      benutzerprofil: 'networkFirst',
      stammdaten: 'cacheFirst',
    });

    for (const environment of [
      developmentEnvironment,
      masterEnvironment,
      officeEnvironment,
      mitarbeiterEnvironment,
    ]) {
      expect(environment.firestoreLesestrategien).toEqual({
        benutzerprofil: 'networkOnly',
        stammdaten: 'networkOnly',
      });
    }
  });
});
