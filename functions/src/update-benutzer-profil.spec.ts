// pur-system/functions/src/update-benutzer-profil.spec.ts

import { HttpsError } from 'firebase-functions/v2/https';
import { describe, expect, it, vi } from 'vitest';

import { handleUpdateBenutzerProfil } from './update-benutzer-profil';

function createDependencies() {
  return {
    getBenutzerProfil: vi.fn().mockImplementation((uid: string) => {
      return Promise.resolve(
        uid === 'master-1'
          ? { aktiv: true, userRole: 'master' }
          : { aktiv: true, userRole: 'office' },
      );
    }),
    updateBenutzerProfil: vi.fn().mockResolvedValue(undefined),
  };
}

describe('handleUpdateBenutzerProfil', () => {
  it('should normalize and update editable profile data', async () => {
    const dependencies = createDependencies();

    await handleUpdateBenutzerProfil(
      {
        auth: { uid: 'master-1' },
        data: {
          uid: 'office-1',
          anzeigename: ' Office Neu ',
          aktiv: true,
          erlaubteBereiche: ['verwaltung', 'systemverwaltung'],
        },
      },
      dependencies,
    );

    expect(dependencies.updateBenutzerProfil).toHaveBeenCalledWith('office-1', {
      anzeigename: 'Office Neu',
      aktiv: true,
      erlaubteBereiche: ['dashboard', 'verwaltung'],
    });
  });

  it('should reject unauthenticated and non-master requests', async () => {
    const dependencies = createDependencies();
    const data = { uid: 'office-1', anzeigename: 'Office', aktiv: true, erlaubteBereiche: [] };

    await expect(
      handleUpdateBenutzerProfil({ auth: null, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'unauthenticated' });
    dependencies.getBenutzerProfil.mockResolvedValue({ aktiv: true, userRole: 'office' });
    await expect(
      handleUpdateBenutzerProfil({ auth: { uid: 'office-1' }, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'permission-denied' });
  });

  it('should prevent deactivating the own master profile', async () => {
    const dependencies = createDependencies();

    await expect(
      handleUpdateBenutzerProfil(
        {
          auth: { uid: 'master-1' },
          data: {
            uid: 'master-1',
            anzeigename: 'Master',
            aktiv: false,
            erlaubteBereiche: [],
          },
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'failed-precondition' });
    expect(dependencies.updateBenutzerProfil).not.toHaveBeenCalled();
  });
});
