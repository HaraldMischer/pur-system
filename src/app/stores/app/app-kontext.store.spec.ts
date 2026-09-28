// pur-system/src/app/stores/app/app-kontext.store.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IFirmaEintrag } from '../../commons/models/domain/firma';
import { IFilialeEintrag } from '../../commons/models/domain/filiale';
import { IUnternehmerEintrag } from '../../commons/models/domain/unternehmer';
import { AppKontextStore } from './app-kontext.store';
import { StammdatenStore } from './stammdaten.store';

const UNTERNEHMER: readonly IUnternehmerEintrag[] = [
  { id: 'u1', nummer: 1, anzeigename: 'Unternehmer 1' },
  { id: 'u2', nummer: 2, anzeigename: 'Unternehmer 2' },
];
const FIRMA_1: IFirmaEintrag = {
  id: 'f1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Firma 1',
  firmenname: 'Firma 1 GmbH',
  adresse: { strasse: 'Hauptstraße', hausnummer: '1', postleitzahl: '10115', ort: 'Berlin' },
  kontakt: {},
};
const FIRMA_2: IFirmaEintrag = {
  ...FIRMA_1,
  id: 'f2',
  nummer: 2,
  anzeigename: 'Firma 2',
  firmenname: 'Firma 2 GmbH',
};
const FILIALE_1: IFilialeEintrag = {
  id: 'b1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Filiale 1',
  filialname: 'Filiale 1',
  adresse: { strasse: 'Hauptstraße', hausnummer: '1', postleitzahl: '10115', ort: 'Berlin' },
  kontakt: {},
};
const FILIALE_2: IFilialeEintrag = {
  ...FILIALE_1,
  id: 'b2',
  nummer: 2,
  anzeigename: 'Filiale 2',
  filialname: 'Filiale 2',
};

describe('AppKontextStore', () => {
  const unternehmer = signal<readonly IUnternehmerEintrag[]>([]);
  const firmenNachUnternehmer: Record<string, readonly IFirmaEintrag[]> = {};
  const filialenNachFirma: Record<string, Record<string, readonly IFilialeEintrag[]>> = {};
  const stammdatenStoreMock = {
    unternehmer,
    getFirmen: vi.fn((unternehmerId: string) => {
      return firmenNachUnternehmer[unternehmerId] ?? [];
    }),
    getFilialen: vi.fn((unternehmerId: string, firmaId: string) => {
      return filialenNachFirma[unternehmerId]?.[firmaId] ?? [];
    }),
  };

  beforeEach(() => {
    unternehmer.set([]);
    for (const key of Object.keys(firmenNachUnternehmer)) delete firmenNachUnternehmer[key];
    for (const key of Object.keys(filialenNachFirma)) delete filialenNachFirma[key];
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [AppKontextStore, { provide: StammdatenStore, useValue: stammdatenStoreMock }],
    });
  });

  it('should select the first available hierarchy with all branches', () => {
    unternehmer.set([UNTERNEHMER[0]]);
    firmenNachUnternehmer['u1'] = [FIRMA_1];
    filialenNachFirma['u1'] = { f1: [FILIALE_1] };
    const store = TestBed.inject(AppKontextStore);

    store.initialize();

    expect(store.selectedUnternehmer()).toEqual(UNTERNEHMER[0]);
    expect(store.selectedFirma()).toEqual(FIRMA_1);
    expect(store.filialKontext()).toEqual({ typ: 'alle' });
  });

  it('should use the first entrepreneur and its first company when multiple entries exist', () => {
    unternehmer.set(UNTERNEHMER);
    firmenNachUnternehmer['u1'] = [FIRMA_1, FIRMA_2];
    filialenNachFirma['u1'] = { f1: [FILIALE_1], f2: [FILIALE_2] };
    const store = TestBed.inject(AppKontextStore);

    store.initialize();

    expect(store.selectedUnternehmer()).toEqual(UNTERNEHMER[0]);
    expect(store.selectedFirma()).toEqual(FIRMA_1);
    expect(store.filialKontext()).toEqual({ typ: 'alle' });
  });

  it('should reset dependent selections when the entrepreneur changes', () => {
    unternehmer.set(UNTERNEHMER);
    firmenNachUnternehmer['u1'] = [FIRMA_1];
    firmenNachUnternehmer['u2'] = [FIRMA_2];
    filialenNachFirma['u1'] = { f1: [FILIALE_1] };
    filialenNachFirma['u2'] = { f2: [FILIALE_2] };
    const store = TestBed.inject(AppKontextStore);

    store.selectUnternehmer(UNTERNEHMER[0]);
    store.selectUnternehmer(UNTERNEHMER[1]);

    expect(store.selectedUnternehmer()).toEqual(UNTERNEHMER[1]);
    expect(store.selectedFirma()).toEqual(FIRMA_2);
    expect(store.filialKontext()).toEqual({ typ: 'alle' });
  });

  it('should represent all branches as a distinct context', () => {
    unternehmer.set([UNTERNEHMER[0]]);
    firmenNachUnternehmer['u1'] = [FIRMA_1];
    filialenNachFirma['u1'] = { f1: [FILIALE_1, FILIALE_2] };
    const store = TestBed.inject(AppKontextStore);
    store.initialize();

    store.selectFilialKontext({ typ: 'filiale', filiale: FILIALE_1 });
    store.selectFilialKontext({ typ: 'alle' });

    expect(store.selectedFiliale()).toBeNull();
    expect(store.filialKontext()).toEqual({ typ: 'alle' });
  });

  it('should reject entries outside the loaded hierarchy', () => {
    unternehmer.set([UNTERNEHMER[0]]);
    firmenNachUnternehmer['u1'] = [FIRMA_1];
    filialenNachFirma['u1'] = { f1: [FILIALE_1] };
    const store = TestBed.inject(AppKontextStore);
    store.initialize();

    store.selectFirma(FIRMA_2);
    store.selectFilialKontext({ typ: 'filiale', filiale: FILIALE_2 });

    expect(store.selectedFirma()).toBeNull();
    expect(store.filialKontext()).toBeNull();
  });

  it('should reset the complete context', () => {
    unternehmer.set([UNTERNEHMER[0]]);
    firmenNachUnternehmer['u1'] = [FIRMA_1];
    filialenNachFirma['u1'] = { f1: [FILIALE_1] };
    const store = TestBed.inject(AppKontextStore);
    store.initialize();

    store.reset();

    expect(store.selectedUnternehmer()).toBeNull();
    expect(store.selectedFirma()).toBeNull();
    expect(store.filialKontext()).toBeNull();
  });
});
