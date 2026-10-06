// pur-system/functions/src/update-mitarbeiter-zuordnung.spec.ts

import { HttpsError } from 'firebase-functions/v2/https';
import { describe, expect, it, vi } from 'vitest';

import { handleUpdateMitarbeiterZuordnung } from './update-mitarbeiter-zuordnung';

const data = {
  uid: 'mitarbeiter-user',
  unternehmerId: 'u-1',
  firmaId: 'f-1',
  firmaMitarbeiterId: 'm-1',
};

function createDependencies() {
  return {
    getBenutzerProfil: vi.fn().mockImplementation((uid: string) => {
      return Promise.resolve(
        uid === 'master-1'
          ? { aktiv: true, userRole: 'master' }
          : { aktiv: true, userRole: 'mitarbeiter' },
      );
    }),
    updateMitarbeiterZuordnung: vi.fn().mockResolvedValue(undefined),
  };
}

describe('handleUpdateMitarbeiterZuordnung', () => {
  it('should update an employee account assignment for an active master', async () => {
    const dependencies = createDependencies();

    await handleUpdateMitarbeiterZuordnung({ auth: { uid: 'master-1' }, data }, dependencies);

    expect(dependencies.updateMitarbeiterZuordnung).toHaveBeenCalledWith(data);
  });

  it('should reject unauthenticated and non-master requests', async () => {
    const dependencies = createDependencies();

    await expect(
      handleUpdateMitarbeiterZuordnung({ auth: null, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'unauthenticated' });

    dependencies.getBenutzerProfil.mockResolvedValue({ aktiv: true, userRole: 'office' });
    await expect(
      handleUpdateMitarbeiterZuordnung({ auth: { uid: 'office-1' }, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'permission-denied' });
  });

  it('should reject invalid identifiers and non-employee profiles', async () => {
    const dependencies = createDependencies();

    await expect(
      handleUpdateMitarbeiterZuordnung(
        { auth: { uid: 'master-1' }, data: { ...data, firmaId: 'ungueltig/id' } },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'invalid-argument' });

    dependencies.getBenutzerProfil.mockResolvedValueOnce({ aktiv: true, userRole: 'master' });
    dependencies.getBenutzerProfil.mockResolvedValueOnce({ aktiv: true, userRole: 'office' });
    await expect(
      handleUpdateMitarbeiterZuordnung({ auth: { uid: 'master-1' }, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'failed-precondition' });
  });

  it('should preserve callable transaction errors and map unexpected failures', async () => {
    const dependencies = createDependencies();
    dependencies.updateMitarbeiterZuordnung.mockRejectedValueOnce(
      new HttpsError('failed-precondition', 'Bereits verknüpft.'),
    );

    await expect(
      handleUpdateMitarbeiterZuordnung({ auth: { uid: 'master-1' }, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'failed-precondition' });

    dependencies.updateMitarbeiterZuordnung.mockRejectedValueOnce(new Error('Firestore'));
    await expect(
      handleUpdateMitarbeiterZuordnung({ auth: { uid: 'master-1' }, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'unavailable' });
  });
});
