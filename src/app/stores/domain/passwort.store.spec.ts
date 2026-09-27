// pur-system/src/app/stores/domain/passwort.store.spec.ts

import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../services/firebase/auth.service';
import { PasswortStore } from './passwort.store';

describe('PasswortStore', () => {
  let authServiceMock: { changePassword: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { changePassword: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({
      providers: [PasswortStore, { provide: AuthService, useValue: authServiceMock }],
    });
  });

  it('should change the password and expose success', async () => {
    const store = TestBed.inject(PasswortStore);

    await store.savePasswort('altes-passwort', 'neues-passwort');

    expect(authServiceMock.changePassword).toHaveBeenCalledWith('altes-passwort', 'neues-passwort');
    expect(store.erfolgreich()).toBe(true);
    expect(store.inProgress()).toBe(false);
  });

  it('should provide a snapshot without password values', async () => {
    const store = TestBed.inject(PasswortStore);

    await store.savePasswort('altes-passwort', 'neues-passwort');

    expect(store.snapshot()).toEqual({
      inProgress: false,
      error: null,
      erfolgreich: true,
    });
    expect(store.snapshot()).not.toHaveProperty('aktuellesPasswort');
    expect(store.snapshot()).not.toHaveProperty('neuesPasswort');
  });

  it('should expose a friendly error', async () => {
    authServiceMock.changePassword.mockRejectedValue({ code: 'auth/invalid-credential' });
    const store = TestBed.inject(PasswortStore);

    await expect(store.savePasswort('falsch', 'neues-passwort')).rejects.toEqual({
      code: 'auth/invalid-credential',
    });
    expect(store.error()).toBe('Anmeldename oder Passwort ist nicht korrekt.');
    expect(store.erfolgreich()).toBe(false);
  });
});
