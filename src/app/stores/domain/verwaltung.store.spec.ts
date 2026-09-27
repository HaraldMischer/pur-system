// pur-system/src/app/stores/domain/verwaltung.store.spec.ts

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IBenutzerProfilDokument } from '../../commons/models/domain/benutzer';
import { IFirmaAktualisierung, IFirmaEintrag } from '../../commons/models/domain/firma';
import { IFilialeAktualisierung, IFilialeEintrag } from '../../commons/models/domain/filiale';
import { FilialeService } from '../../services/domain/filiale.service';
import { FirmaService } from '../../services/domain/firma.service';
import { UnternehmerService } from '../../services/domain/unternehmer.service';
import { BenutzerStore } from '../app/benutzer.store';
import { StammdatenStore } from '../app/stammdaten.store';
import { VerwaltungStore } from './verwaltung.store';

describe('VerwaltungStore', () => {
  const firma: IFirmaEintrag = {
    id: 'firma-1',
    nummer: 1,
    aktiv: true,
    anzeigename: 'Firma',
    firmenname: 'Firma GmbH',
    adresse: {
      strasse: 'Hauptstraße',
      hausnummer: '1',
      postleitzahl: '20095',
      ort: 'Hamburg',
    },
    kontakt: { email: 'info@example.com' },
  };
  const filiale: IFilialeEintrag = {
    id: 'filiale-1',
    nummer: 1,
    aktiv: true,
    anzeigename: 'Filiale',
    filialname: 'Spielhalle',
    adresse: {
      strasse: 'Nebenstraße',
      hausnummer: '2',
      postleitzahl: '20095',
      ort: 'Hamburg',
    },
    kontakt: { telefon: '040 123456' },
  };
  let profil: ReturnType<typeof signal<IBenutzerProfilDokument | null>>;
  let unternehmerServiceMock: {
    loadUnternehmer: ReturnType<typeof vi.fn>;
    loadUnternehmerEintrag: ReturnType<typeof vi.fn>;
  };
  let firmaServiceMock: {
    loadFirmen: ReturnType<typeof vi.fn>;
    loadFirmaEintrag: ReturnType<typeof vi.fn>;
    updateFirma: ReturnType<typeof vi.fn>;
  };
  let stammdatenStoreMock: {
    isLoaded: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    unternehmer: WritableSignal<never[]>;
    getFirmen: ReturnType<typeof vi.fn>;
    getFilialen: ReturnType<typeof vi.fn>;
    upsertFirma: ReturnType<typeof vi.fn>;
    upsertFiliale: ReturnType<typeof vi.fn>;
  };
  let filialeServiceMock: {
    loadFilialen: ReturnType<typeof vi.fn>;
    loadFilialeEintrag: ReturnType<typeof vi.fn>;
    updateFiliale: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    profil = signal<IBenutzerProfilDokument | null>({
      email: 'office@example.com',
      anzeigename: 'Office',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['verwaltung'],
      zugriffe: {
        'unternehmer-1': {
          'firma-1': ['filiale-1'],
        },
      },
    });
    unternehmerServiceMock = {
      loadUnternehmer: vi.fn().mockResolvedValue([]),
      loadUnternehmerEintrag: vi.fn().mockImplementation(async (id: string) => {
        return { id, anzeigename: 'Unternehmer', nummer: 1 };
      }),
    };
    firmaServiceMock = {
      loadFirmen: vi.fn().mockResolvedValue([]),
      loadFirmaEintrag: vi.fn().mockImplementation(async (_unternehmerId: string, id: string) => {
        return { ...firma, id };
      }),
      updateFirma: vi.fn().mockResolvedValue(undefined),
    };
    stammdatenStoreMock = {
      isLoaded: signal(false),
      error: signal(null),
      unternehmer: signal([]),
      getFirmen: vi.fn().mockReturnValue([]),
      getFilialen: vi.fn().mockReturnValue([]),
      upsertFirma: vi.fn(),
      upsertFiliale: vi.fn(),
    };
    filialeServiceMock = {
      loadFilialen: vi.fn().mockResolvedValue([]),
      loadFilialeEintrag: vi
        .fn()
        .mockImplementation(async (_unternehmerId: string, _firmaId: string, id: string) => {
          return { ...filiale, id };
        }),
      updateFiliale: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        VerwaltungStore,
        { provide: BenutzerStore, useValue: { benutzerProfil: profil } },
        { provide: StammdatenStore, useValue: stammdatenStoreMock },
        { provide: UnternehmerService, useValue: unternehmerServiceMock },
        { provide: FirmaService, useValue: firmaServiceMock },
        { provide: FilialeService, useValue: filialeServiceMock },
      ],
    });
  });

  it('should load only assigned documents for an office user', async () => {
    const store = TestBed.inject(VerwaltungStore);

    await store.loadUnternehmer();
    await store.selectFirma('firma-1');
    store.selectFiliale('filiale-1');

    expect(store.istMaster()).toBe(false);
    expect(store.selectedUnternehmer()?.id).toBe('unternehmer-1');
    expect(store.selectedUnternehmerId()).toBe('unternehmer-1');
    expect(unternehmerServiceMock.loadUnternehmer).not.toHaveBeenCalled();
    expect(unternehmerServiceMock.loadUnternehmerEintrag).toHaveBeenCalledWith('unternehmer-1');
    expect(firmaServiceMock.loadFirmen).not.toHaveBeenCalled();
    expect(firmaServiceMock.loadFirmaEintrag).toHaveBeenCalledWith('unternehmer-1', 'firma-1');
    expect(filialeServiceMock.loadFilialen).not.toHaveBeenCalled();
    expect(filialeServiceMock.loadFilialeEintrag).toHaveBeenCalledWith(
      'unternehmer-1',
      'firma-1',
      'filiale-1',
    );
    expect(store.selectedFilialeId()).toBe('filiale-1');
    expect(store.selectedFiliale()).toEqual(filiale);
  });

  it('should use collection loads for a master', async () => {
    profil.set({
      email: 'master@example.com',
      anzeigename: 'Master',
      aktiv: true,
      userRole: 'master',
      erlaubteBereiche: ['verwaltung'],
      zugriffe: {},
    });
    unternehmerServiceMock.loadUnternehmer.mockResolvedValue([
      { id: 'unternehmer-1', anzeigename: 'Unternehmer', nummer: 1 },
    ]);
    firmaServiceMock.loadFirmen.mockResolvedValue([firma]);
    filialeServiceMock.loadFilialen.mockResolvedValue([filiale]);
    const store = TestBed.inject(VerwaltungStore);

    await store.loadUnternehmer();
    await store.selectUnternehmer('unternehmer-1');
    await store.selectFirma('firma-1');

    expect(unternehmerServiceMock.loadUnternehmer).toHaveBeenCalledOnce();
    expect(firmaServiceMock.loadFirmen).toHaveBeenCalledWith('unternehmer-1');
    expect(filialeServiceMock.loadFilialen).toHaveBeenCalledWith('unternehmer-1', 'firma-1');
    expect(unternehmerServiceMock.loadUnternehmerEintrag).not.toHaveBeenCalled();
    expect(firmaServiceMock.loadFirmaEintrag).not.toHaveBeenCalled();
    expect(filialeServiceMock.loadFilialeEintrag).not.toHaveBeenCalled();
  });

  it('should reset dependent selections when a parent changes', async () => {
    profil.set({
      email: 'master@example.com',
      anzeigename: 'Master',
      aktiv: true,
      userRole: 'master',
      erlaubteBereiche: ['verwaltung'],
      zugriffe: {},
    });
    unternehmerServiceMock.loadUnternehmer.mockResolvedValue([
      { id: 'unternehmer-1', anzeigename: 'Unternehmer 1', nummer: 1 },
      { id: 'unternehmer-2', anzeigename: 'Unternehmer 2', nummer: 2 },
    ]);
    firmaServiceMock.loadFirmen.mockImplementation(async (unternehmerId: string) => {
      return [{ ...firma, id: unternehmerId === 'unternehmer-1' ? 'firma-1' : 'firma-2' }];
    });
    filialeServiceMock.loadFilialen.mockResolvedValue([filiale]);
    const store = TestBed.inject(VerwaltungStore);
    await store.loadUnternehmer();
    await store.selectUnternehmer('unternehmer-1');
    await store.selectFirma('firma-1');
    store.selectFiliale('filiale-1');

    await store.selectUnternehmer('unternehmer-2');

    expect(store.selectedUnternehmerId()).toBe('unternehmer-2');
    expect(store.selectedFirmaId()).toBeNull();
    expect(store.selectedFilialeId()).toBeNull();
    expect(store.filialen()).toEqual([]);
  });

  it('should update the selected company in the administration and session stores', async () => {
    const aktualisierung: IFirmaAktualisierung = {
      anzeigename: 'Firma Neu',
      firmenname: 'Firma Neu GmbH',
      adresse: {
        strasse: 'Neue Straße',
        hausnummer: '2',
        postleitzahl: '10115',
        ort: 'Berlin',
      },
      kontakt: { telefon: '030 123456' },
    };
    const store = TestBed.inject(VerwaltungStore);
    await store.loadUnternehmer();
    await store.selectFirma('firma-1');

    await expect(store.updateFirma(aktualisierung)).resolves.toEqual({
      ...firma,
      ...aktualisierung,
    });

    expect(firmaServiceMock.updateFirma).toHaveBeenCalledWith(
      'unternehmer-1',
      'firma-1',
      aktualisierung,
    );
    expect(stammdatenStoreMock.upsertFirma).toHaveBeenCalledWith('unternehmer-1', {
      ...firma,
      ...aktualisierung,
    });
    expect(store.selectedFirma()?.anzeigename).toBe('Firma Neu');
    expect(store.updateSuccess()).toBe('Firma Firma Neu wurde aktualisiert.');
    expect(store.inProgress()).toBe(false);
  });

  it('should expose update errors without changing the cached company', async () => {
    firmaServiceMock.updateFirma.mockRejectedValue({ code: 'permission-denied' });
    const store = TestBed.inject(VerwaltungStore);
    await store.loadUnternehmer();
    await store.selectFirma('firma-1');

    await expect(
      store.updateFirma({
        anzeigename: 'Firma Neu',
        firmenname: firma.firmenname,
        adresse: firma.adresse,
        kontakt: firma.kontakt,
      }),
    ).rejects.toEqual({ code: 'permission-denied' });

    expect(stammdatenStoreMock.upsertFirma).not.toHaveBeenCalled();
    expect(store.selectedFirma()).toEqual(firma);
    expect(store.updateError()).toBe('Du hast keine Berechtigung für diese Aktion.');
    expect(store.inProgress()).toBe(false);
  });

  it('should update the selected branch in the administration and session stores', async () => {
    const aktualisierung: IFilialeAktualisierung = {
      anzeigename: 'Filiale Neu',
      filialname: 'Spielhalle Neu',
      adresse: {
        strasse: 'Neue Straße',
        hausnummer: '3',
        postleitzahl: '10115',
        ort: 'Berlin',
      },
      kontakt: { email: 'filiale@example.com' },
    };
    const store = TestBed.inject(VerwaltungStore);
    await store.loadUnternehmer();
    await store.selectFirma('firma-1');
    store.selectFiliale('filiale-1');

    await expect(store.updateFiliale(aktualisierung)).resolves.toEqual({
      ...filiale,
      ...aktualisierung,
    });

    expect(filialeServiceMock.updateFiliale).toHaveBeenCalledWith(
      'unternehmer-1',
      'firma-1',
      'filiale-1',
      aktualisierung,
    );
    expect(stammdatenStoreMock.upsertFiliale).toHaveBeenCalledWith('unternehmer-1', 'firma-1', {
      ...filiale,
      ...aktualisierung,
    });
    expect(store.selectedFiliale()?.anzeigename).toBe('Filiale Neu');
    expect(store.updateSuccess()).toBe('Filiale Filiale Neu wurde aktualisiert.');
  });

  it('should expose branch update errors without changing the cached branch', async () => {
    filialeServiceMock.updateFiliale.mockRejectedValue({ code: 'permission-denied' });
    const store = TestBed.inject(VerwaltungStore);
    await store.loadUnternehmer();
    await store.selectFirma('firma-1');
    store.selectFiliale('filiale-1');

    await expect(
      store.updateFiliale({
        anzeigename: 'Filiale Neu',
        filialname: filiale.filialname,
        adresse: filiale.adresse,
        kontakt: filiale.kontakt,
      }),
    ).rejects.toEqual({ code: 'permission-denied' });

    expect(stammdatenStoreMock.upsertFiliale).not.toHaveBeenCalled();
    expect(store.selectedFiliale()).toEqual(filiale);
    expect(store.updateError()).toBe('Du hast keine Berechtigung für diese Aktion.');
    expect(store.inProgress()).toBe(false);
  });

  it('should expose separate loading errors and a complete snapshot', async () => {
    unternehmerServiceMock.loadUnternehmerEintrag.mockRejectedValue({ code: 'unavailable' });
    const store = TestBed.inject(VerwaltungStore);

    await store.loadUnternehmer();

    expect(store.unternehmerListe().error).toBe(
      'Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.',
    );
    expect(store.unternehmerListe().download).toBe(false);
    expect(store.snapshot()).toEqual({
      unternehmerListe: store.unternehmerListe(),
      firmenListe: store.firmenListe(),
      filialenListe: store.filialenListe(),
      selectedUnternehmerId: null,
      selectedFirmaId: null,
      selectedFilialeId: null,
      inProgress: false,
      updateError: null,
      updateSuccess: null,
    });
  });
});
