// pur-system/functions/src/update-benutzer-datenzuordnung.spec.ts

import { HttpsError } from 'firebase-functions/v2/https';
import { describe, expect, it, vi } from 'vitest';

import { handleUpdateBenutzerDatenzuordnung } from './update-benutzer-datenzuordnung';

function createDependencies(userRole: 'office' | 'filiale' = 'office') {
  return {
    getBenutzerProfil: vi.fn().mockImplementation((uid: string) => {
      return Promise.resolve(
        uid === 'master-1' ? { aktiv: true, userRole: 'master' } : { aktiv: true, userRole },
      );
    }),
    existierenDokumente: vi.fn().mockResolvedValue(true),
    updateDatenzuordnung: vi.fn().mockResolvedValue(undefined),
  };
}

describe('handleUpdateBenutzerDatenzuordnung', () => {
  it('should update a valid office assignment', async () => {
    const dependencies = createDependencies();
    const zugriffe = { u: { f1: ['b1'], f2: ['b2'] } };

    await handleUpdateBenutzerDatenzuordnung(
      { auth: { uid: 'master-1' }, data: { uid: 'office-1', zugriffe } },
      dependencies,
    );

    expect(dependencies.existierenDokumente).toHaveBeenCalledWith([
      'unternehmer/u',
      'unternehmer/u/firma/f1',
      'unternehmer/u/firma/f1/filiale/b1',
      'unternehmer/u/firma/f2',
      'unternehmer/u/firma/f2/filiale/b2',
    ]);
    expect(dependencies.updateDatenzuordnung).toHaveBeenCalledWith('office-1', zugriffe);
  });

  it('should require exactly one company and branch for a branch account', async () => {
    const dependencies = createDependencies('filiale');

    await expect(
      handleUpdateBenutzerDatenzuordnung(
        {
          auth: { uid: 'master-1' },
          data: { uid: 'filiale-1', zugriffe: { u: { f: ['b1', 'b2'] } } },
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'invalid-argument' });
  });

  it('should reject non-master requests and unsupported target roles', async () => {
    const dependencies = createDependencies();
    const data = { uid: 'office-1', zugriffe: { u: { f: ['b'] } } };
    dependencies.getBenutzerProfil.mockResolvedValue({ aktiv: true, userRole: 'office' });
    await expect(
      handleUpdateBenutzerDatenzuordnung({ auth: { uid: 'office-1' }, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'permission-denied' });

    dependencies.getBenutzerProfil.mockResolvedValueOnce({ aktiv: true, userRole: 'master' });
    dependencies.getBenutzerProfil.mockResolvedValueOnce({ aktiv: true, userRole: 'mitarbeiter' });
    await expect(
      handleUpdateBenutzerDatenzuordnung({ auth: { uid: 'master-1' }, data }, dependencies),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'failed-precondition' });
  });

  it('should reject assignments with missing structure documents', async () => {
    const dependencies = createDependencies();
    dependencies.existierenDokumente.mockResolvedValue(false);

    await expect(
      handleUpdateBenutzerDatenzuordnung(
        {
          auth: { uid: 'master-1' },
          data: { uid: 'office-1', zugriffe: { u: { f: ['b'] } } },
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: 'invalid-argument' });
  });
});
