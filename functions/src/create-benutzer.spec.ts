// pur-system/functions/src/create-benutzer.spec.ts

import { HttpsError } from 'firebase-functions/v2/https';
import { describe, expect, it, vi } from 'vitest';

import { handleCreateBenutzer, ICreateBenutzerData } from './create-benutzer';

describe('handleCreateBenutzer', () => {
  const data: ICreateBenutzerData = {
    namensbestandteil: 'Test Benutzer',
    anzeigename: 'Test Benutzer',
    userRole: 'office',
    erlaubteBereiche: ['dashboard', 'verwaltung'],
    zugriffe: { 'u-1': { 'firma-1': ['filiale-1'] } },
    passwort: 'SicheresPasswort123!',
  };

  function createDependencies() {
    return {
      getBenutzerProfil: vi.fn().mockResolvedValue({
        aktiv: true,
        userRole: 'master',
      }),
      existierenDokumente: vi.fn().mockResolvedValue(true),
      getMitarbeiterDokument: vi.fn().mockResolvedValue({ aktiv: true }),
      createAuthBenutzer: vi.fn().mockResolvedValue({ uid: 'neu-123' }),
      setBenutzerProfilDokument: vi.fn().mockResolvedValue(undefined),
      setBenutzerProfilMitMitarbeiter: vi.fn().mockResolvedValue(undefined),
      removeMitarbeiterVerknuepfung: vi.fn().mockResolvedValue(undefined),
      setAuthBenutzerDisabled: vi.fn().mockResolvedValue(undefined),
      deactivateBenutzerProfilDokument: vi.fn().mockResolvedValue(undefined),
      logAnlageError: vi.fn(),
      deleteAuthBenutzer: vi.fn().mockResolvedValue(undefined),
      logRollbackError: vi.fn(),
    };
  }

  it('should create auth user and user document for an active master', async () => {
    const dependencies = createDependencies();

    const result = await handleCreateBenutzer(
      {
        auth: { uid: 'master-123' },
        data,
      },
      dependencies,
    );

    expect(dependencies.getBenutzerProfil).toHaveBeenCalledWith('master-123');
    expect(dependencies.existierenDokumente).toHaveBeenCalledWith([
      'unternehmer/u-1',
      'unternehmer/u-1/firma/firma-1',
      'unternehmer/u-1/firma/firma-1/filiale/filiale-1',
    ]);
    expect(dependencies.createAuthBenutzer).toHaveBeenCalledWith({
      email: 'test.benutzer-office@pur-system.invalid',
      displayName: data.anzeigename,
      password: data.passwort,
      disabled: true,
    });
    expect(dependencies.setBenutzerProfilDokument).toHaveBeenCalledWith('neu-123', {
      anmeldename: 'test.benutzer-office',
      email: 'test.benutzer-office@pur-system.invalid',
      anzeigename: data.anzeigename,
      userRole: data.userRole,
      erlaubteBereiche: data.erlaubteBereiche,
      zugriffe: data.zugriffe,
    });
    expect(dependencies.setBenutzerProfilDokument.mock.calls[0][1]).not.toHaveProperty('passwort');
    expect(result).toEqual({
      uid: 'neu-123',
      anmeldename: 'test.benutzer-office',
      email: 'test.benutzer-office@pur-system.invalid',
    });
  });

  it('should reject unauthenticated requests', async () => {
    const dependencies = createDependencies();

    await expect(
      handleCreateBenutzer(
        {
          auth: null,
          data,
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({
      code: 'unauthenticated',
    });

    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
  });

  it('should reject users without the master role', async () => {
    const dependencies = createDependencies();
    dependencies.getBenutzerProfil.mockResolvedValue({
      aktiv: true,
      userRole: 'office',
    });

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'office-123' },
          data,
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({
      code: 'permission-denied',
    });
  });

  it('should reject invalid input data', async () => {
    const dependencies = createDependencies();

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master-123' },
          data: {
            ...data,
            erlaubteBereiche: ['ungueltig'],
          },
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({
      code: 'invalid-argument',
    });

    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
  });

  it('should always add dashboard and remove system administration for non-master accounts', async () => {
    const dependencies = createDependencies();

    await handleCreateBenutzer(
      {
        auth: { uid: 'master-123' },
        data: { ...data, erlaubteBereiche: ['systemverwaltung', 'verwaltung'] },
      },
      dependencies,
    );

    expect(dependencies.setBenutzerProfilDokument).toHaveBeenCalledWith(
      'neu-123',
      expect.objectContaining({ erlaubteBereiche: ['dashboard', 'verwaltung'] }),
    );
  });

  it('should always add dashboard and system administration for master accounts', async () => {
    const dependencies = createDependencies();

    await handleCreateBenutzer(
      {
        auth: { uid: 'master-123' },
        data: { ...data, userRole: 'master', erlaubteBereiche: [], zugriffe: {} },
      },
      dependencies,
    );

    expect(dependencies.setBenutzerProfilDokument).toHaveBeenCalledWith(
      'neu-123',
      expect.objectContaining({ erlaubteBereiche: ['dashboard', 'systemverwaltung'] }),
    );
  });

  it('should preserve selected optional areas between mandatory master areas', async () => {
    const dependencies = createDependencies();

    await handleCreateBenutzer(
      {
        auth: { uid: 'master-123' },
        data: {
          ...data,
          userRole: 'master',
          erlaubteBereiche: ['verwaltung', 'schichtplan'],
          zugriffe: {},
        },
      },
      dependencies,
    );

    expect(dependencies.setBenutzerProfilDokument).toHaveBeenCalledWith(
      'neu-123',
      expect.objectContaining({
        erlaubteBereiche: ['dashboard', 'schichtplan', 'verwaltung', 'systemverwaltung'],
      }),
    );
  });

  it('should create a user with a password chosen by the master', async () => {
    const dependencies = createDependencies();
    const passwordData: ICreateBenutzerData = {
      ...data,
      passwort: 'SicheresPasswort123!',
    };

    const result = await handleCreateBenutzer(
      { auth: { uid: 'master-123' }, data: passwordData },
      dependencies,
    );

    expect(dependencies.createAuthBenutzer).toHaveBeenCalledWith({
      email: 'test.benutzer-office@pur-system.invalid',
      displayName: data.anzeigename,
      password: passwordData.passwort,
      disabled: true,
    });
    expect(result).toEqual({
      uid: 'neu-123',
      anmeldename: 'test.benutzer-office',
      email: 'test.benutzer-office@pur-system.invalid',
    });
  });

  it.each([undefined, '', 'short'])(
    'should reject a missing or short password: %s',
    async (passwort) => {
      const dependencies = createDependencies();

      await expect(
        handleCreateBenutzer(
          {
            auth: { uid: 'master-123' },
            data: { ...data, passwort },
          },
          dependencies,
        ),
      ).rejects.toMatchObject({ code: 'invalid-argument' });

      expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
    },
  );

  it('should return an understandable error for an existing login name', async () => {
    const dependencies = createDependencies();
    dependencies.createAuthBenutzer.mockRejectedValue({
      code: 'auth/email-already-exists',
    });

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master-123' },
          data,
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({
      code: 'already-exists',
      message: expect.stringContaining('anderen Namensbestandteil'),
    });
  });

  it.each([undefined, '', '---'])('should reject an invalid name part: %s', async (value) => {
    const dependencies = createDependencies();

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master-123' },
          data: { ...data, namensbestandteil: value },
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
  });

  it('should delete the auth user when writing the user document fails', async () => {
    const dependencies = createDependencies();
    dependencies.setBenutzerProfilDokument.mockRejectedValue(new Error('Firestore error'));

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master-123' },
          data,
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({
      code: 'internal',
    });

    expect(dependencies.deleteAuthBenutzer).toHaveBeenCalledWith('neu-123');
  });

  it('should log a failed rollback', async () => {
    const dependencies = createDependencies();
    const rollbackError = new Error('Auth rollback error');
    dependencies.setBenutzerProfilDokument.mockRejectedValue(new Error('Firestore error'));
    dependencies.deleteAuthBenutzer.mockRejectedValue(rollbackError);

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master-123' },
          data,
        },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<HttpsError>>({
      code: 'internal',
    });

    expect(dependencies.logRollbackError).toHaveBeenCalledWith('neu-123', rollbackError);
  });
  it.each([
    [],
    { '': { f: ['b'] } },
    { 'u/other': { f: ['b'] } },
    { u: { '../f': ['b'] } },
    { u: { f: ['b/child'] } },
    { u: { f: [] } },
    { u: {} },
  ])('should reject incomplete or path-like access IDs: %j', async (zugriffe) => {
    const dependencies = createDependencies();
    await expect(
      handleCreateBenutzer({ auth: { uid: 'master' }, data: { ...data, zugriffe } }, dependencies),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(dependencies.existierenDokumente).not.toHaveBeenCalled();
    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
  });

  it.each([
    'unternehmer/u-1',
    'unternehmer/u-1/firma/firma-1',
    'unternehmer/u-1/firma/firma-1/filiale/filiale-1',
  ])('should reject a missing hierarchy document before creating auth: %s', async (fehlend) => {
    const dependencies = createDependencies();
    dependencies.existierenDokumente.mockImplementation(
      async (pfade: readonly string[]) => !pfade.includes(fehlend),
    );
    await expect(
      handleCreateBenutzer({ auth: { uid: 'master' }, data }, dependencies),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
    expect(dependencies.setBenutzerProfilDokument).not.toHaveBeenCalled();
  });

  it('should merge duplicates only within the same entrepreneur and preserve other tenants', async () => {
    const dependencies = createDependencies();
    await handleCreateBenutzer(
      {
        auth: { uid: 'master' },
        data: {
          ...data,
          zugriffe: {
            ' a ': { ' f ': [' b ', 'b'] },
            a: { f: ['c'] },
            z: { f: ['b'] },
          },
        },
      },
      dependencies,
    );
    expect(dependencies.setBenutzerProfilDokument.mock.calls[0][1].zugriffe).toEqual({
      a: { f: ['b', 'c'] },
      z: { f: ['b'] },
    });
    expect(dependencies.existierenDokumente).toHaveBeenCalledWith([
      'unternehmer/a',
      'unternehmer/a/firma/f',
      'unternehmer/a/firma/f/filiale/b',
      'unternehmer/a/firma/f/filiale/c',
      'unternehmer/z',
      'unternehmer/z/firma/f',
      'unternehmer/z/firma/f/filiale/b',
    ]);
  });

  it('should abort on hierarchy read errors without creating auth', async () => {
    const dependencies = createDependencies();
    dependencies.existierenDokumente.mockRejectedValue(new Error('offline'));
    await expect(
      handleCreateBenutzer({ auth: { uid: 'master' }, data }, dependencies),
    ).rejects.toMatchObject({ code: 'unavailable' });
    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
  });

  it('should allow a master with no scopes without querying empty paths', async () => {
    const dependencies = createDependencies();
    await handleCreateBenutzer(
      { auth: { uid: 'master' }, data: { ...data, userRole: 'master', zugriffe: {} } },
      dependencies,
    );
    expect(dependencies.existierenDokumente).not.toHaveBeenCalled();
    expect(dependencies.setBenutzerProfilDokument.mock.calls[0][1].zugriffe).toEqual({});
  });

  it('should link an employee account to exactly one company employee', async () => {
    const dependencies = createDependencies();
    const mitarbeiterData: ICreateBenutzerData = {
      ...data,
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['dashboard', 'schichtplan'],
      zugriffe: { u: { f: [] } },
      firmaMitarbeiterId: 'm-1',
    };

    await expect(
      handleCreateBenutzer({ auth: { uid: 'master' }, data: mitarbeiterData }, dependencies),
    ).resolves.toMatchObject({ uid: 'neu-123' });
    expect(dependencies.existierenDokumente).toHaveBeenCalledWith([
      'unternehmer/u',
      'unternehmer/u/firma/f',
    ]);
    expect(dependencies.getMitarbeiterDokument).toHaveBeenCalledWith(
      'unternehmer/u/firma/f/mitarbeiter/m-1',
    );
    expect(dependencies.setBenutzerProfilDokument).not.toHaveBeenCalled();
    expect(dependencies.setBenutzerProfilMitMitarbeiter).toHaveBeenCalledWith(
      'neu-123',
      expect.objectContaining({
        userRole: 'mitarbeiter',
        erlaubteBereiche: ['dashboard', 'schichtplan'],
        zugriffe: { u: { f: [] } },
        firmaMitarbeiterId: 'm-1',
      }),
      'unternehmer/u/firma/f/mitarbeiter/m-1',
    );
  });

  it.each([
    { zugriffe: {}, firmaMitarbeiterId: 'm-1' },
    { zugriffe: { u: { f: [] } }, firmaMitarbeiterId: undefined },
    { zugriffe: { u: { f: ['b'] } }, firmaMitarbeiterId: 'm-1' },
    { zugriffe: { u: { f1: [], f2: [] } }, firmaMitarbeiterId: 'm-1' },
    { zugriffe: { u1: { f: [] }, u2: { f: [] } }, firmaMitarbeiterId: 'm-1' },
  ])('should reject incomplete employee assignments: %j', async (zuordnung) => {
    const dependencies = createDependencies();

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master' },
          data: {
            ...data,
            userRole: 'mitarbeiter',
            erlaubteBereiche: ['dashboard'],
            ...zuordnung,
          },
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
    expect(dependencies.setBenutzerProfilDokument).not.toHaveBeenCalled();
  });

  it('should reject a company employee reference for another user role', async () => {
    const dependencies = createDependencies();

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master' },
          data: { ...data, firmaMitarbeiterId: 'm-1' },
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
  });

  it.each([
    [null, 'invalid-argument'],
    [{ aktiv: false }, 'failed-precondition'],
    [{ aktiv: true, benutzerUid: 'vorhanden' }, 'already-exists'],
  ])('should reject an unavailable company employee: %j', async (dokument, code) => {
    const dependencies = createDependencies();
    dependencies.getMitarbeiterDokument.mockResolvedValue(dokument);

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master' },
          data: {
            ...data,
            userRole: 'mitarbeiter',
            zugriffe: { u: { f: [] } },
            firmaMitarbeiterId: 'm-1',
          },
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code });
    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
  });

  it('should remove a possibly committed employee link after a transactional conflict', async () => {
    const dependencies = createDependencies();
    dependencies.setBenutzerProfilMitMitarbeiter.mockRejectedValue(
      new HttpsError('already-exists', 'Bereits verknüpft.'),
    );

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master' },
          data: {
            ...data,
            userRole: 'mitarbeiter',
            zugriffe: { u: { f: [] } },
            firmaMitarbeiterId: 'm-1',
          },
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'already-exists' });
    expect(dependencies.removeMitarbeiterVerknuepfung).toHaveBeenCalledWith(
      'neu-123',
      'unternehmer/u/firma/f/mitarbeiter/m-1',
    );
    expect(dependencies.deleteAuthBenutzer).toHaveBeenCalledWith('neu-123');
  });

  it('should remove the employee link when account activation fails', async () => {
    const dependencies = createDependencies();
    dependencies.setAuthBenutzerDisabled.mockRejectedValueOnce(new Error('activation timeout'));

    await expect(
      handleCreateBenutzer(
        {
          auth: { uid: 'master' },
          data: {
            ...data,
            userRole: 'mitarbeiter',
            zugriffe: { u: { f: [] } },
            firmaMitarbeiterId: 'm-1',
          },
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'internal' });
    expect(dependencies.removeMitarbeiterVerknuepfung).toHaveBeenCalledWith(
      'neu-123',
      'unternehmer/u/firma/f/mitarbeiter/m-1',
    );
    expect(dependencies.deactivateBenutzerProfilDokument).toHaveBeenCalledWith('neu-123');
    expect(dependencies.deleteAuthBenutzer).toHaveBeenCalledWith('neu-123');
  });
  it('waits for the profile write before enabling the new account', async () => {
    const dependencies = createDependencies();
    let finishWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      finishWrite = resolve;
    });
    dependencies.setBenutzerProfilDokument.mockImplementation(() => write);
    const pending = handleCreateBenutzer({ auth: { uid: 'master' }, data }, dependencies);
    await vi.waitFor(() => expect(dependencies.setBenutzerProfilDokument).toHaveBeenCalled());
    expect(dependencies.createAuthBenutzer).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: true }),
    );
    expect(dependencies.setAuthBenutzerDisabled).not.toHaveBeenCalled();
    finishWrite();
    await pending;
    expect(dependencies.setAuthBenutzerDisabled).toHaveBeenCalledExactlyOnceWith('neu-123', false);
    expect(dependencies.deleteAuthBenutzer).not.toHaveBeenCalled();
  });

  it('never enables an account after a failed profile write even if deletion fails', async () => {
    const dependencies = createDependencies();
    dependencies.setBenutzerProfilDokument.mockRejectedValue(new Error('write failed'));
    dependencies.deleteAuthBenutzer.mockRejectedValue(new Error('delete failed'));
    await expect(
      handleCreateBenutzer({ auth: { uid: 'master' }, data }, dependencies),
    ).rejects.toMatchObject({
      code: 'internal',
      message: expect.stringContaining('Bereinigung ist unvollständig'),
    });
    expect(dependencies.setAuthBenutzerDisabled).not.toHaveBeenCalled();
  });

  it('disables auth and the retained profile after an uncertain activation result', async () => {
    const dependencies = createDependencies();
    dependencies.setAuthBenutzerDisabled.mockRejectedValueOnce(new Error('activation timeout'));
    await expect(
      handleCreateBenutzer({ auth: { uid: 'master' }, data }, dependencies),
    ).rejects.toMatchObject({ code: 'internal' });
    expect(dependencies.setAuthBenutzerDisabled.mock.calls).toEqual([
      ['neu-123', false],
      ['neu-123', true],
    ]);
    expect(dependencies.deactivateBenutzerProfilDokument).toHaveBeenCalledWith('neu-123');
    expect(dependencies.deleteAuthBenutzer).toHaveBeenCalledWith('neu-123');
    expect(dependencies.logAnlageError).toHaveBeenCalledWith(
      'neu-123',
      'aktivierung',
      expect.any(Error),
    );
  });

  it.each([
    'setAuthBenutzerDisabled',
    'deactivateBenutzerProfilDokument',
    'deleteAuthBenutzer',
  ] as const)('continues cleanup and reports incomplete cleanup when %s fails', async (step) => {
    const dependencies = createDependencies();
    dependencies.setAuthBenutzerDisabled.mockRejectedValueOnce(new Error('activation timeout'));
    dependencies[step].mockRejectedValue(new Error('cleanup failed'));
    await expect(
      handleCreateBenutzer({ auth: { uid: 'master' }, data }, dependencies),
    ).rejects.toMatchObject({
      code: 'internal',
      message: expect.stringContaining('Bereinigung ist unvollständig'),
    });
    expect(dependencies.deactivateBenutzerProfilDokument).toHaveBeenCalledWith('neu-123');
    expect(dependencies.deleteAuthBenutzer).toHaveBeenCalledWith('neu-123');
  });
  it.each(['office', 'filiale'])(
    'rejects %s without scopes before creating an auth account',
    async (userRole) => {
      const dependencies = createDependencies();
      await expect(
        handleCreateBenutzer(
          { auth: { uid: 'master' }, data: { ...data, userRole, zugriffe: {} } },
          dependencies,
        ),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
      expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
      expect(dependencies.setBenutzerProfilDokument).not.toHaveBeenCalled();
    },
  );
  it.each([
    { u: { f: ['b1', 'b2'] } },
    { u: { f1: ['b'], f2: ['b'] } },
    { u1: { f: ['b'] }, u2: { f: ['b'] } },
  ])('rejects multiple branch assignments for a branch account: %j', async (zugriffe) => {
    const dependencies = createDependencies();
    await expect(
      handleCreateBenutzer(
        { auth: { uid: 'master' }, data: { ...data, userRole: 'filiale', zugriffe } },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(dependencies.createAuthBenutzer).not.toHaveBeenCalled();
    expect(dependencies.existierenDokumente).not.toHaveBeenCalled();
  });

  it('accepts exactly one branch for a branch account', async () => {
    const dependencies = createDependencies();
    await expect(
      handleCreateBenutzer(
        { auth: { uid: 'master' }, data: { ...data, userRole: 'filiale' } },
        dependencies,
      ),
    ).resolves.toMatchObject({ uid: 'neu-123' });
  });
});
