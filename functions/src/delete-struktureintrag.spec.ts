// pur-system/functions/src/delete-struktureintrag.spec.ts

import { HttpsError } from 'firebase-functions/v2/https';
import { describe, expect, it, vi } from 'vitest';

import { handleDeleteStruktureintrag } from './delete-struktureintrag';

function createDependencies() {
  return {
    getBenutzerProfil: vi.fn().mockResolvedValue({ aktiv: true, userRole: 'master' }),
    existiertDokument: vi.fn().mockResolvedValue(true),
    hatReferenzen: vi.fn().mockResolvedValue(false),
    deleteRekursiv: vi.fn().mockResolvedValue(undefined),
  };
}

describe('handleDeleteStruktureintrag', () => {
  it.each([
    [{ typ: 'unternehmer', unternehmerId: 'u-1' }, 'unternehmer/u-1'],
    [{ typ: 'firma', unternehmerId: 'u-1', firmaId: 'f-1' }, 'unternehmer/u-1/firma/f-1'],
    [
      { typ: 'filiale', unternehmerId: 'u-1', firmaId: 'f-1', filialId: 'b-1' },
      'unternehmer/u-1/firma/f-1/filiale/b-1',
    ],
  ] as const)('should delete %s recursively for an active master', async (data, expectedPath) => {
    const dependencies = createDependencies();

    await handleDeleteStruktureintrag({ auth: { uid: 'master-1' }, data }, dependencies);

    expect(dependencies.hatReferenzen).toHaveBeenCalledWith(data);
    expect(dependencies.deleteRekursiv).toHaveBeenCalledWith(expectedPath);
  });

  it('should reject unauthenticated and non-master requests', async () => {
    const dependencies = createDependencies();
    const data = { typ: 'unternehmer', unternehmerId: 'u-1' };

    await expect(
      handleDeleteStruktureintrag({ auth: null, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'unauthenticated' });

    dependencies.getBenutzerProfil.mockResolvedValue({ aktiv: true, userRole: 'office' });
    await expect(
      handleDeleteStruktureintrag({ auth: { uid: 'office-1' }, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'permission-denied' });
  });

  it('should reject invalid identifiers and missing documents', async () => {
    const dependencies = createDependencies();

    await expect(
      handleDeleteStruktureintrag(
        {
          auth: { uid: 'master-1' },
          data: { typ: 'firma', unternehmerId: 'u-1', firmaId: 'ungueltig/id' },
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'invalid-argument' });

    dependencies.existiertDokument.mockResolvedValue(false);
    await expect(
      handleDeleteStruktureintrag(
        { auth: { uid: 'master-1' }, data: { typ: 'unternehmer', unternehmerId: 'u-1' } },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'not-found' });
  });

  it('should reject referenced entries without deleting them', async () => {
    const dependencies = createDependencies();
    dependencies.hatReferenzen.mockResolvedValue(true);

    await expect(
      handleDeleteStruktureintrag(
        {
          auth: { uid: 'master-1' },
          data: { typ: 'filiale', unternehmerId: 'u-1', firmaId: 'f-1', filialId: 'b-1' },
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'failed-precondition' });
    expect(dependencies.deleteRekursiv).not.toHaveBeenCalled();
  });

  it('should map recursive deletion failures', async () => {
    const dependencies = createDependencies();
    dependencies.deleteRekursiv.mockRejectedValue(new Error('Firestore nicht erreichbar'));

    await expect(
      handleDeleteStruktureintrag(
        { auth: { uid: 'master-1' }, data: { typ: 'unternehmer', unternehmerId: 'u-1' } },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'unavailable' });
  });
});
