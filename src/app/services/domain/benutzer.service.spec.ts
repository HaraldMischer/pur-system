// pur-system/src/app/services/domain/benutzer.service.spec.ts

import { TestBed } from '@angular/core/testing';

import {
  IBenutzerProfilAktualisierung,
  IBenutzerProfilDokument,
} from '../../commons/models/domain/benutzer';
import { BenutzerService } from './benutzer.service';
import { FirestoreDbService } from '../firebase/firestore-db.service';

describe('BenutzerService', () => {
  const firestoreDbServiceMock = {
    createServerTimestamp: vi.fn(),
    loadCollection: vi.fn(),
    loadDocument: vi.fn(),
    observeDocument: vi.fn(),
    updateDocument: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreDbServiceMock.loadCollection.mockResolvedValue([]);
    firestoreDbServiceMock.loadDocument.mockResolvedValue(null);
    firestoreDbServiceMock.observeDocument.mockReturnValue(vi.fn());
    firestoreDbServiceMock.createServerTimestamp.mockReturnValue('server-timestamp');
    firestoreDbServiceMock.updateDocument.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        BenutzerService,
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
      ],
    });
  });

  it('should load an existing user profile', async () => {
    const profil: IBenutzerProfilDokument = {
      anmeldename: 'test-office',
      anzeigename: 'Test',
      email: 'test@example.com',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard'],
      zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
    };
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'benutzer-123',
      daten: profil,
    });
    const service = TestBed.inject(BenutzerService);

    const result = await service.getBenutzerProfil('benutzer-123');

    expect(firestoreDbServiceMock.loadDocument).toHaveBeenCalledWith('benutzerprofil/benutzer-123');
    expect(result).toEqual(profil);
  });

  it('should normalize legacy array access without granting data access', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'alt',
      daten: {
        email: 'alt@example.com',
        anzeigename: 'Altprofil',
        aktiv: true,
        userRole: 'master',
        erlaubteBereiche: ['dashboard'],
        zugriffe: [],
      },
    });
    const service = TestBed.inject(BenutzerService);

    await expect(service.getBenutzerProfil('alt')).resolves.toMatchObject({
      erlaubteBereiche: ['dashboard', 'systemverwaltung'],
      zugriffe: {},
    });
  });

  it('should discard malformed and empty access entries', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'test',
      daten: {
        email: 'test@example.com',
        anzeigename: 'Test',
        aktiv: true,
        userRole: 'office',
        erlaubteBereiche: ['systemverwaltung'],
        zugriffe: { u: { leer: [], falsch: 'b', gueltig: ['b'] } },
      },
    });
    const service = TestBed.inject(BenutzerService);

    await expect(service.getBenutzerProfil('test')).resolves.toMatchObject({
      erlaubteBereiche: ['dashboard'],
      zugriffe: { u: { gueltig: ['b'] } },
    });
  });

  it('should preserve an employee company reference with an empty branch list', async () => {
    firestoreDbServiceMock.loadDocument.mockResolvedValue({
      id: 'mitarbeiter-user',
      daten: {
        email: 'mitarbeiter@example.com',
        anzeigename: 'Mia Mitarbeiter',
        aktiv: true,
        userRole: 'mitarbeiter',
        erlaubteBereiche: ['dashboard'],
        zugriffe: { u: { f: [] } },
        firmaMitarbeiterId: 'm-1',
      },
    });
    const service = TestBed.inject(BenutzerService);

    await expect(service.getBenutzerProfil('mitarbeiter-user')).resolves.toMatchObject({
      zugriffe: { u: { f: [] } },
      firmaMitarbeiterId: 'm-1',
    });
  });

  it('should return null when the user profile does not exist', async () => {
    const service = TestBed.inject(BenutzerService);

    const result = await service.getBenutzerProfil('benutzer-123');

    expect(result).toBeNull();
  });

  it('should observe and normalize the user profile', () => {
    const next = vi.fn();
    const error = vi.fn();
    const unsubscribe = vi.fn();
    firestoreDbServiceMock.observeDocument.mockReturnValue(unsubscribe);
    const service = TestBed.inject(BenutzerService);

    const result = service.observeBenutzerProfil('benutzer-123', next, error);
    const [, dokumentNext, dokumentError] = firestoreDbServiceMock.observeDocument.mock.calls[0];
    dokumentNext({
      id: 'benutzer-123',
      daten: {
        anmeldename: 'test-office',
        anzeigename: 'Test',
        email: 'test@example.com',
        aktiv: false,
        userRole: 'office',
        erlaubteBereiche: ['systemverwaltung'],
        zugriffe: [],
      },
    });
    dokumentNext(null);
    const listenerError = { code: 'permission-denied' };
    dokumentError(listenerError);

    expect(firestoreDbServiceMock.observeDocument).toHaveBeenCalledWith(
      'benutzerprofil/benutzer-123',
      expect.any(Function),
      error,
    );
    expect(next).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        aktiv: false,
        erlaubteBereiche: ['dashboard'],
        zugriffe: {},
      }),
    );
    expect(next).toHaveBeenNthCalledWith(2, null);
    expect(error).toHaveBeenCalledWith(listenerError);
    expect(result).toBe(unsubscribe);
  });

  it('should load, normalize and sort all user profiles', async () => {
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      {
        id: 'z',
        daten: {
          anmeldename: 'zulu-office',
          email: 'z@example.com',
          anzeigename: 'Zulu',
          aktiv: true,
          userRole: 'office',
          erlaubteBereiche: ['dashboard'],
          zugriffe: { u: { f: ['b'] } },
        },
      },
      {
        id: 'a',
        daten: {
          anmeldename: 'alpha-filiale',
          email: 'a@example.com',
          anzeigename: 'Alpha',
          aktiv: true,
          userRole: 'filiale',
          erlaubteBereiche: ['dashboard'],
          zugriffe: [],
        },
      },
    ]);
    const service = TestBed.inject(BenutzerService);

    await expect(service.loadBenutzerProfile()).resolves.toEqual([
      expect.objectContaining({
        uid: 'a',
        anmeldename: 'alpha-filiale',
        anzeigename: 'Alpha',
        zugriffe: {},
      }),
      expect.objectContaining({
        uid: 'z',
        anmeldename: 'zulu-office',
        anzeigename: 'Zulu',
        zugriffe: { u: { f: ['b'] } },
      }),
    ]);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith('benutzerprofil');
  });

  it('should update editable profile data with a server timestamp', async () => {
    const service = TestBed.inject(BenutzerService);
    const aktualisierung: IBenutzerProfilAktualisierung = {
      anzeigename: 'Office Neu',
      aktiv: true,
      erlaubteBereiche: ['systemverwaltung', 'verwaltung'],
      zugriffe: { u: { f: ['b'] } },
    };

    const ergebnis = await service.updateBenutzerProfil('office-1', 'office', aktualisierung);

    expect(firestoreDbServiceMock.updateDocument).toHaveBeenCalledWith('benutzerprofil/office-1', {
      ...aktualisierung,
      erlaubteBereiche: ['dashboard', 'verwaltung'],
      aktualisiertAm: 'server-timestamp',
    });
    expect(ergebnis.erlaubteBereiche).toEqual(['dashboard', 'verwaltung']);
  });
});
