// pur-system/src/app/services/firebase/benutzer-verwaltung.service.spec.ts

import { assertInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';

import { IBenutzerAnlage } from '../../commons/models/domain/benutzer';
import { HTTPS_CALLABLE } from '../../commons/tokens/firebase.tokens';
import { LoadingService } from '../core/loading.service';
import { NetzwerkStatusService } from '../core/netzwerk-status.service';
import { BenutzerVerwaltungService } from './benutzer-verwaltung.service';
import { FirestoreDbService } from './firestore-db.service';

describe('BenutzerVerwaltungService', () => {
  const functionsMock = {} as Functions;
  const anlage: IBenutzerAnlage = {
    namensbestandteil: 'testbenutzer',
    anzeigename: 'Test Benutzer',
    userRole: 'office',
    erlaubteBereiche: ['dashboard'],
    zugriffe: {},
    passwort: 'SicheresPasswort123!',
  };
  let callableMock: ReturnType<typeof vi.fn>;
  let httpsCallableMock: ReturnType<typeof vi.fn>;
  let trackWriteMock: ReturnType<typeof vi.fn>;
  let assertOnlineMock: ReturnType<typeof vi.fn>;
  const firestoreDbServiceMock = { loadCollection: vi.fn() };

  beforeEach(() => {
    callableMock = vi.fn().mockImplementation(() => {
      assertInInjectionContext(BenutzerVerwaltungService);

      return Promise.resolve({
        data: {
          uid: 'neu-123',
          anmeldename: 'testbenutzer-office',
          email: 'testbenutzer-office@pur-system.invalid',
        },
      });
    });
    httpsCallableMock = vi.fn().mockImplementation(() => {
      assertInInjectionContext(BenutzerVerwaltungService);

      return callableMock;
    });
    trackWriteMock = vi.fn().mockImplementation(async (aktion: () => Promise<unknown>) => {
      return aktion();
    });
    assertOnlineMock = vi.fn();
    firestoreDbServiceMock.loadCollection.mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        BenutzerVerwaltungService,
        { provide: Functions, useValue: functionsMock },
        { provide: HTTPS_CALLABLE, useValue: httpsCallableMock },
        { provide: LoadingService, useValue: { trackWrite: trackWriteMock } },
        { provide: NetzwerkStatusService, useValue: { assertOnline: assertOnlineMock } },
        { provide: FirestoreDbService, useValue: firestoreDbServiceMock },
      ],
    });
  });

  it('should load the reduced employee selection for a company', async () => {
    firestoreDbServiceMock.loadCollection.mockResolvedValue([
      {
        id: 'm-2',
        daten: {
          aktiv: true,
          person: { vorname: 'Zoe', nachname: 'Zimmer' },
        },
      },
      {
        id: 'm-1',
        daten: {
          aktiv: true,
          person: { vorname: 'Mia', nachname: 'Muster' },
        },
      },
      {
        id: 'm-3',
        daten: {
          aktiv: false,
          person: { vorname: 'Ina', nachname: 'Inaktiv' },
        },
      },
      {
        id: 'm-4',
        daten: {
          aktiv: true,
          benutzerUid: 'user-4',
          person: { vorname: 'Vera', nachname: 'Verknüpft' },
        },
      },
    ]);
    const service = TestBed.inject(BenutzerVerwaltungService);

    await expect(
      service.loadMitarbeiterAuswahl({ unternehmerId: 'u-1', firmaId: 'f-1' }),
    ).resolves.toEqual([
      { id: 'm-1', anzeigename: 'Muster, Mia' },
      { id: 'm-2', anzeigename: 'Zimmer, Zoe' },
    ]);
    expect(firestoreDbServiceMock.loadCollection).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/mitarbeiter',
    );
    expect(httpsCallableMock).not.toHaveBeenCalled();
  });

  it('should call the server-side user creation function', async () => {
    const service = TestBed.inject(BenutzerVerwaltungService);

    await expect(service.createBenutzer(anlage)).resolves.toEqual({
      uid: 'neu-123',
      anmeldename: 'testbenutzer-office',
      email: 'testbenutzer-office@pur-system.invalid',
    });
    expect(assertOnlineMock).toHaveBeenCalledOnce();
    expect(trackWriteMock).toHaveBeenCalledWith(expect.any(Function));
    expect(httpsCallableMock).toHaveBeenCalledWith(functionsMock, 'createBenutzer');
    expect(callableMock).toHaveBeenCalledWith(anlage);
  });

  it('should pass callable errors to the store', async () => {
    const error = { code: 'functions/already-exists' };
    callableMock.mockRejectedValue(error);
    const service = TestBed.inject(BenutzerVerwaltungService);

    await expect(service.createBenutzer(anlage)).rejects.toBe(error);
  });

  it('should reject user creation before calling the function while offline', async () => {
    const error = { code: 'app/offline' };
    assertOnlineMock.mockImplementation(() => {
      throw error;
    });
    const service = TestBed.inject(BenutzerVerwaltungService);

    await expect(service.createBenutzer(anlage)).rejects.toBe(error);
    expect(httpsCallableMock).not.toHaveBeenCalled();
    expect(callableMock).not.toHaveBeenCalled();
    expect(trackWriteMock).not.toHaveBeenCalled();
  });

  it('should pass Firestore errors while loading employees', async () => {
    const error = { code: 'permission-denied' };
    firestoreDbServiceMock.loadCollection.mockRejectedValue(error);
    const service = TestBed.inject(BenutzerVerwaltungService);

    await expect(
      service.loadMitarbeiterAuswahl({ unternehmerId: 'u-1', firmaId: 'f-1' }),
    ).rejects.toBe(error);
    expect(httpsCallableMock).not.toHaveBeenCalled();
  });
});
