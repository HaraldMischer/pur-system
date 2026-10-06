// pur-system/functions/src/delete-benutzer.spec.ts

import { HttpsError } from 'firebase-functions/v2/https';
import { describe, expect, it, vi } from 'vitest';

import { handleDeleteBenutzer } from './delete-benutzer';

function createDependencies() {
  return {
    getBenutzerProfil: vi.fn().mockImplementation((uid: string) => {
      return Promise.resolve(
        uid === 'master-1'
          ? { aktiv: true, userRole: 'master' }
          : { aktiv: true, userRole: 'mitarbeiter' },
      );
    }),
    deleteAuthBenutzer: vi.fn().mockResolvedValue(undefined),
    deleteBenutzerProfil: vi.fn().mockResolvedValue(undefined),
  };
}

describe('handleDeleteBenutzer', () => {
  it('should delete authentication before the employee profile', async () => {
    const dependencies = createDependencies();

    await handleDeleteBenutzer(
      { auth: { uid: 'master-1' }, data: { uid: 'mitarbeiter-user' } },
      dependencies,
    );

    expect(dependencies.deleteAuthBenutzer).toHaveBeenCalledWith('mitarbeiter-user');
    expect(dependencies.deleteBenutzerProfil).toHaveBeenCalledWith('mitarbeiter-user');
    expect(dependencies.deleteAuthBenutzer.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.deleteBenutzerProfil.mock.invocationCallOrder[0],
    );
  });

  it('should reject unauthenticated and non-master requests', async () => {
    const dependencies = createDependencies();

    await expect(
      handleDeleteBenutzer({ auth: null, data: { uid: 'mitarbeiter-user' } }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'unauthenticated' });

    dependencies.getBenutzerProfil.mockResolvedValue({ aktiv: true, userRole: 'office' });
    await expect(
      handleDeleteBenutzer(
        { auth: { uid: 'office-1' }, data: { uid: 'mitarbeiter-user' } },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'permission-denied' });
  });

  it('should reject invalid identifiers and non-employee profiles', async () => {
    const dependencies = createDependencies();

    await expect(
      handleDeleteBenutzer(
        { auth: { uid: 'master-1' }, data: { uid: 'ungueltig/id' } },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'invalid-argument' });

    dependencies.getBenutzerProfil.mockResolvedValueOnce({ aktiv: true, userRole: 'master' });
    dependencies.getBenutzerProfil.mockResolvedValueOnce({ aktiv: true, userRole: 'office' });
    await expect(
      handleDeleteBenutzer(
        { auth: { uid: 'master-1' }, data: { uid: 'office-user' } },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'failed-precondition' });
  });

  it('should not delete the profile when authentication deletion fails', async () => {
    const dependencies = createDependencies();
    dependencies.deleteAuthBenutzer.mockRejectedValue(new Error('Auth'));

    await expect(
      handleDeleteBenutzer(
        { auth: { uid: 'master-1' }, data: { uid: 'mitarbeiter-user' } },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'unavailable' });
    expect(dependencies.deleteBenutzerProfil).not.toHaveBeenCalled();
  });
});
