// pur-system/src/app/stores/app/stammdaten.store.spec.ts

import { TestBed } from '@angular/core/testing';

import { BenutzerService } from '../../services/domain/benutzer.service';
import { FilialeService } from '../../services/domain/filiale.service';
import { FirmaService } from '../../services/domain/firma.service';
import { UnternehmerService } from '../../services/domain/unternehmer.service';
import { StammdatenStore, TStammdatenLadeauftrag } from './stammdaten.store';

describe('StammdatenStore', () => {
  const alleLadeauftrag: TStammdatenLadeauftrag = {
    alleStrukturdaten: true,
    zugriffe: {},
    benutzerprofile: true,
    lesestrategie: 'networkOnly',
  };
  let benutzerServiceMock: { loadBenutzerProfile: ReturnType<typeof vi.fn> };
  let unternehmerServiceMock: {
    loadUnternehmer: ReturnType<typeof vi.fn>;
    loadUnternehmerEintrag: ReturnType<typeof vi.fn>;
  };
  let firmaServiceMock: {
    loadFirmen: ReturnType<typeof vi.fn>;
    loadFirmaEintrag: ReturnType<typeof vi.fn>;
  };
  let filialeServiceMock: {
    loadFilialen: ReturnType<typeof vi.fn>;
    loadFilialeEintrag: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    benutzerServiceMock = {
      loadBenutzerProfile: vi.fn().mockResolvedValue([
        {
          uid: 'profil-1',
          email: 'office@example.com',
          anzeigename: 'Office',
          aktiv: true,
          userRole: 'office',
          erlaubteBereiche: ['dashboard'],
          zugriffe: {},
        },
      ]),
    };
    unternehmerServiceMock = {
      loadUnternehmer: vi
        .fn()
        .mockResolvedValue([{ id: 'u-1', nummer: 1, anzeigename: 'Unternehmer' }]),
      loadUnternehmerEintrag: vi.fn().mockImplementation(async (id: string) => {
        return { id, nummer: 1, anzeigename: 'Unternehmer' };
      }),
    };
    firmaServiceMock = {
      loadFirmen: vi.fn().mockResolvedValue([{ id: 'f-1', nummer: 1, anzeigename: 'Firma' }]),
      loadFirmaEintrag: vi.fn().mockImplementation(async (_uid: string, id: string) => {
        return { id, nummer: 1, anzeigename: 'Firma' };
      }),
    };
    filialeServiceMock = {
      loadFilialen: vi.fn().mockResolvedValue([{ id: 'b-1', nummer: 1, anzeigename: 'Filiale' }]),
      loadFilialeEintrag: vi
        .fn()
        .mockImplementation(async (_uid: string, _fid: string, id: string) => {
          return { id, nummer: 1, anzeigename: 'Filiale' };
        }),
    };
    TestBed.configureTestingModule({
      providers: [
        StammdatenStore,
        { provide: BenutzerService, useValue: benutzerServiceMock },
        { provide: UnternehmerService, useValue: unternehmerServiceMock },
        { provide: FirmaService, useValue: firmaServiceMock },
        { provide: FilialeService, useValue: filialeServiceMock },
      ],
    });
  });

  it('should load all requested structure and profile data once', async () => {
    const store = TestBed.inject(StammdatenStore);

    await Promise.all([
      store.loadStammdaten('master-1', alleLadeauftrag),
      store.loadStammdaten('master-1', alleLadeauftrag),
    ]);
    await store.loadStammdaten('master-1', alleLadeauftrag);

    expect(unternehmerServiceMock.loadUnternehmer).toHaveBeenCalledOnce();
    expect(firmaServiceMock.loadFirmen).toHaveBeenCalledWith('u-1', 'networkOnly');
    expect(filialeServiceMock.loadFilialen).toHaveBeenCalledWith('u-1', 'f-1', 'networkOnly');
    expect(benutzerServiceMock.loadBenutzerProfile).toHaveBeenCalledOnce();
    expect(store.getFirmen('u-1')).toHaveLength(1);
    expect(store.getFilialen('u-1', 'f-1')).toHaveLength(1);
    expect(store.benutzerprofile()).toHaveLength(1);
    expect(store.isLoaded()).toBe(true);
  });

  it('should load only documents selected by an assigned structure request', async () => {
    const ladeauftrag: TStammdatenLadeauftrag = {
      alleStrukturdaten: false,
      zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
      benutzerprofile: false,
      lesestrategie: 'networkOnly',
    };
    const store = TestBed.inject(StammdatenStore);

    await store.loadStammdaten('office-1', ladeauftrag);

    expect(unternehmerServiceMock.loadUnternehmer).not.toHaveBeenCalled();
    expect(unternehmerServiceMock.loadUnternehmerEintrag).toHaveBeenCalledWith(
      'u-1',
      'networkOnly',
    );
    expect(firmaServiceMock.loadFirmaEintrag).toHaveBeenCalledWith('u-1', 'f-1', 'networkOnly');
    expect(filialeServiceMock.loadFilialeEintrag).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      'b-1',
      'networkOnly',
    );
    expect(benutzerServiceMock.loadBenutzerProfile).not.toHaveBeenCalled();
    expect(store.benutzerprofile()).toEqual([]);
  });

  it('should update cached entries and clear them on reset', async () => {
    const store = TestBed.inject(StammdatenStore);
    await store.loadStammdaten('master-1', alleLadeauftrag);

    store.upsertUnternehmer({ id: 'u-2', nummer: 2, anzeigename: 'Alpha' });
    store.upsertFirma('u-1', {
      id: 'f-2',
      nummer: 2,
      anzeigename: 'Alpha',
      firmenname: 'Alpha GmbH',
      aktiv: true,
      adresse: {
        strasse: 'Hauptstraße',
        hausnummer: '1',
        postleitzahl: '20095',
        ort: 'Hamburg',
      },
      kontakt: {},
    });
    store.upsertFiliale('u-1', 'f-1', {
      id: 'b-2',
      nummer: 2,
      aktiv: true,
      anzeigename: 'Alpha',
      filialname: 'Filiale Alpha',
      adresse: {
        strasse: 'Hauptstraße',
        hausnummer: '1',
        postleitzahl: '20095',
        ort: 'Hamburg',
      },
      kontakt: {},
    });

    expect(store.unternehmer()[0].id).toBe('u-2');
    expect(store.getFirmen('u-1')[0].id).toBe('f-2');
    expect(store.getFilialen('u-1', 'f-1')[0].id).toBe('b-2');

    store.removeFiliale('u-1', 'f-1', 'b-2');
    store.removeFirma('u-1', 'f-2');
    store.removeUnternehmer('u-2');
    expect(store.getFilialen('u-1', 'f-1').map((eintrag) => eintrag.id)).toEqual(['b-1']);
    expect(store.getFirmen('u-1').some((eintrag) => eintrag.id === 'f-2')).toBe(false);
    expect(store.unternehmer().some((eintrag) => eintrag.id === 'u-2')).toBe(false);

    store.reset();
    expect(store.snapshot()).toEqual({
      benutzerId: null,
      unternehmer: [],
      firmenNachUnternehmer: {},
      filialenNachFirma: {},
      benutzerprofile: [],
      download: false,
      isLoaded: false,
      error: null,
    });
  });

  it('should expose a loading error without keeping partial data', async () => {
    unternehmerServiceMock.loadUnternehmer.mockRejectedValue({ code: 'unavailable' });
    const store = TestBed.inject(StammdatenStore);

    await expect(store.loadStammdaten('master-1', alleLadeauftrag)).rejects.toEqual({
      code: 'unavailable',
    });

    expect(store.isLoaded()).toBe(false);
    expect(store.download()).toBe(false);
    expect(store.unternehmer()).toEqual([]);
    expect(store.error()).toBe('Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.');
  });

  it('should reject a request when an assigned document does not exist', async () => {
    unternehmerServiceMock.loadUnternehmerEintrag.mockResolvedValue(null);
    const store = TestBed.inject(StammdatenStore);

    await expect(
      store.loadStammdaten('office-1', {
        alleStrukturdaten: false,
        zugriffe: { 'u-fehlt': { 'f-1': ['b-1'] } },
        benutzerprofile: false,
        lesestrategie: 'networkOnly',
      }),
    ).rejects.toEqual({ code: 'app/invalid-user-profile' });

    expect(store.isLoaded()).toBe(false);
    expect(store.error()).toBe(
      'Das Benutzerprofil enthält unvollständige oder widersprüchliche Datenzugriffe.',
    );
  });
});
