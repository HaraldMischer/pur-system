// pur-system/src/app/stores/domain/filiale.store.spec.ts

import { TestBed } from '@angular/core/testing';

import { IFilialeAnlage, IFilialeEintrag } from '../../commons/models/domain/filiale';
import { FilialeService } from '../../services/domain/filiale.service';
import { FilialeStore } from './filiale.store';

describe('FilialeStore', () => {
  const anlage: IFilialeAnlage = {
    anzeigename: 'Gevelsberg 1',
    filialname: 'Spielhalle',
    adresse: {
      strasse: 'Mittelstraße',
      hausnummer: '102',
      postleitzahl: '58285',
      ort: 'Gevelsberg',
    },
    kontakt: {
      email: 'gevelsberg@example.com',
      telefon: '02332 123456',
    },
  };
  const filialeAlpha: IFilialeEintrag = {
    ...anlage,
    id: 'a',
    anzeigename: 'Alpha',
    filialname: 'Filiale Alpha',
    nummer: 2,
    aktiv: true,
  };
  const filialeZulu: IFilialeEintrag = {
    ...anlage,
    id: 'z',
    anzeigename: 'Zulu',
    filialname: 'Filiale Zulu',
    nummer: 4,
    aktiv: true,
  };
  let filialeServiceMock: {
    loadFilialen: ReturnType<typeof vi.fn>;
    createFiliale: ReturnType<typeof vi.fn>;
    deleteFiliale: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    filialeServiceMock = {
      loadFilialen: vi.fn().mockResolvedValue([filialeZulu, filialeAlpha]),
      createFiliale: vi.fn().mockResolvedValue({
        id: 'n',
        nummer: 5,
        anzeigename: anlage.anzeigename,
      }),
      deleteFiliale: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [FilialeStore, { provide: FilialeService, useValue: filialeServiceMock }],
    });
  });

  it('should load and sort branches for a company', async () => {
    const store = TestBed.inject(FilialeStore);

    await store.loadFilialen('unternehmer-1', 'firma-1');

    expect(filialeServiceMock.loadFilialen).toHaveBeenCalledWith('unternehmer-1', 'firma-1');
    expect(store.filialen()).toEqual([filialeAlpha, filialeZulu]);
    expect(store.unternehmerId()).toBe('unternehmer-1');
    expect(store.firmaId()).toBe('firma-1');
    expect(store.isLoaded()).toBe(true);
  });

  it('should replace the branch context when loading another company', async () => {
    const store = TestBed.inject(FilialeStore);
    await store.loadFilialen('unternehmer-1', 'firma-1');
    const filialeBeta: IFilialeEintrag = {
      ...anlage,
      id: 'b',
      anzeigename: 'Beta',
      filialname: 'Filiale Beta',
      nummer: 1,
      aktiv: true,
    };
    filialeServiceMock.loadFilialen.mockResolvedValue([filialeBeta]);

    await store.loadFilialen('unternehmer-1', 'firma-2');

    expect(store.firmaId()).toBe('firma-2');
    expect(store.filialen()).toEqual([filialeBeta]);
  });

  it('should create a branch and add it to the sorted list', async () => {
    const store = TestBed.inject(FilialeStore);
    await store.loadFilialen('unternehmer-1', 'firma-1');

    await expect(store.createFiliale('unternehmer-1', 'firma-1', anlage)).resolves.toEqual({
      id: 'n',
      nummer: 5,
      anzeigename: 'Gevelsberg 1',
    });
    expect(filialeServiceMock.createFiliale).toHaveBeenCalledWith(
      'unternehmer-1',
      'firma-1',
      anlage,
      5,
    );
    expect(store.filialen()).toEqual([
      filialeAlpha,
      {
        ...anlage,
        id: 'n',
        nummer: 5,
        aktiv: true,
      },
      filialeZulu,
    ]);
  });

  it('should delete a branch from the loaded context', async () => {
    const store = TestBed.inject(FilialeStore);
    await store.loadFilialen('unternehmer-1', 'firma-1');

    await store.deleteFiliale('unternehmer-1', 'firma-1', 'a');

    expect(filialeServiceMock.deleteFiliale).toHaveBeenCalledWith('unternehmer-1', 'firma-1', 'a');
    expect(store.filialen()).toEqual([filialeZulu]);
  });

  it('should expose errors and reset the branch context', async () => {
    const store = TestBed.inject(FilialeStore);
    filialeServiceMock.loadFilialen.mockRejectedValue({ code: 'unavailable' });

    await expect(store.loadFilialen('unternehmer-1', 'firma-1')).rejects.toEqual({
      code: 'unavailable',
    });
    expect(store.error()).toBe('Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.');

    store.clearError();
    expect(store.error()).toBeNull();
    store.resetFilialen();
    expect(store.snapshot()).toEqual({
      filialen: [],
      unternehmerId: null,
      firmaId: null,
      download: false,
      isLoaded: false,
      inProgress: false,
      error: null,
    });
  });

  it('should require the matching branch list before creation', async () => {
    const store = TestBed.inject(FilialeStore);
    await store.loadFilialen('unternehmer-1', 'firma-1');

    await expect(store.createFiliale('unternehmer-1', 'firma-2', anlage)).rejects.toThrow(
      'Die Filialen müssen vor der Anlage vollständig geladen werden.',
    );
    expect(filialeServiceMock.createFiliale).not.toHaveBeenCalled();
  });
});
