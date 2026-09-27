// pur-system/src/app/stores/domain/firma.store.spec.ts

import { TestBed } from '@angular/core/testing';

import { IFirmaAnlage, IFirmaEintrag } from '../../commons/models/domain/firma';
import { FirmaService } from '../../services/domain/firma.service';
import { FirmaStore } from './firma.store';

describe('FirmaStore', () => {
  const anlage: IFirmaAnlage = {
    anzeigename: 'Firma Nord',
    firmenname: 'Firma Nord GmbH',
    adresse: {
      strasse: 'Hauptstraße',
      hausnummer: '1',
      postleitzahl: '20095',
      ort: 'Hamburg',
    },
    kontakt: {
      email: 'info@example.com',
      telefon: '040 123456',
    },
  };
  const firmaAlpha: IFirmaEintrag = {
    ...anlage,
    id: 'a',
    anzeigename: 'Alpha',
    firmenname: 'Alpha GmbH',
    nummer: 2,
    aktiv: true,
  };
  const firmaZulu: IFirmaEintrag = {
    ...anlage,
    id: 'z',
    anzeigename: 'Zulu',
    firmenname: 'Zulu GmbH',
    nummer: 4,
    aktiv: true,
  };
  let firmaServiceMock: {
    loadFirmen: ReturnType<typeof vi.fn>;
    createFirma: ReturnType<typeof vi.fn>;
    deleteFirma: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    firmaServiceMock = {
      loadFirmen: vi.fn().mockResolvedValue([firmaZulu, firmaAlpha]),
      createFirma: vi.fn().mockResolvedValue({
        id: 'n',
        nummer: 5,
        anzeigename: anlage.anzeigename,
      }),
      deleteFirma: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [FirmaStore, { provide: FirmaService, useValue: firmaServiceMock }],
    });
  });

  it('should load and sort companies for an entrepreneur', async () => {
    const store = TestBed.inject(FirmaStore);

    await store.loadFirmen('unternehmer-1');

    expect(firmaServiceMock.loadFirmen).toHaveBeenCalledWith('unternehmer-1');
    expect(store.firmen()).toEqual([firmaAlpha, firmaZulu]);
    expect(store.unternehmerId()).toBe('unternehmer-1');
    expect(store.download()).toBe(false);
    expect(store.isLoaded()).toBe(true);
  });

  it('should replace the company context when loading another entrepreneur', async () => {
    const store = TestBed.inject(FirmaStore);
    await store.loadFirmen('unternehmer-1');
    const firmaBeta: IFirmaEintrag = {
      ...anlage,
      id: 'b',
      anzeigename: 'Beta',
      firmenname: 'Beta GmbH',
      nummer: 1,
      aktiv: true,
    };
    firmaServiceMock.loadFirmen.mockResolvedValue([firmaBeta]);

    await store.loadFirmen('unternehmer-2');

    expect(store.unternehmerId()).toBe('unternehmer-2');
    expect(store.firmen()).toEqual([firmaBeta]);
  });

  it('should create a company and add it to the sorted list', async () => {
    const store = TestBed.inject(FirmaStore);
    await store.loadFirmen('unternehmer-1');

    await expect(store.createFirma('unternehmer-1', anlage)).resolves.toEqual({
      id: 'n',
      nummer: 5,
      anzeigename: 'Firma Nord',
    });
    expect(firmaServiceMock.createFirma).toHaveBeenCalledWith('unternehmer-1', anlage, 5);
    expect(store.firmen()).toEqual([
      firmaAlpha,
      {
        ...anlage,
        id: 'n',
        nummer: 5,
        aktiv: true,
      },
      firmaZulu,
    ]);
  });

  it('should delete a company from the loaded context', async () => {
    const store = TestBed.inject(FirmaStore);
    await store.loadFirmen('unternehmer-1');

    await store.deleteFirma('unternehmer-1', 'a');

    expect(firmaServiceMock.deleteFirma).toHaveBeenCalledWith('unternehmer-1', 'a');
    expect(store.firmen()).toEqual([firmaZulu]);
  });

  it('should expose errors and reset the company context', async () => {
    const store = TestBed.inject(FirmaStore);
    firmaServiceMock.loadFirmen.mockRejectedValue({ code: 'unavailable' });

    await expect(store.loadFirmen('unternehmer-1')).rejects.toEqual({ code: 'unavailable' });
    expect(store.error()).toBe('Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.');

    store.clearError();
    expect(store.error()).toBeNull();
    store.resetFirmen();
    expect(store.snapshot()).toEqual({
      firmen: [],
      unternehmerId: null,
      download: false,
      isLoaded: false,
      inProgress: false,
      error: null,
    });
  });

  it('should require the matching company list before creation', async () => {
    const store = TestBed.inject(FirmaStore);
    await store.loadFirmen('unternehmer-1');

    await expect(store.createFirma('unternehmer-2', anlage)).rejects.toThrow(
      'Die Firmen müssen vor der Anlage vollständig geladen werden.',
    );
    expect(firmaServiceMock.createFirma).not.toHaveBeenCalled();
  });
});
