// pur-system/src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.spec.ts

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { IFirmaEintrag } from '../../../commons/models/domain/firma';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IUnternehmerEintrag } from '../../../commons/models/domain/unternehmer';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { StammdatenStore } from '../../../stores/app/stammdaten.store';
import { AppKontextSelector } from './app-kontext-selector';
import { FilialeSelector } from './filiale-selector/filiale-selector';
import { FirmaSelector } from './firma-selector/firma-selector';
import { UnternehmerSelector } from './unternehmer-selector/unternehmer-selector';

const UNTERNEHMER: IUnternehmerEintrag = {
  id: 'u1',
  nummer: 1,
  anzeigename: 'Unternehmer',
};
const WEITERER_UNTERNEHMER: IUnternehmerEintrag = {
  ...UNTERNEHMER,
  id: 'u2',
  nummer: 2,
  anzeigename: 'Weiterer Unternehmer',
};
const FIRMA: IFirmaEintrag = {
  id: 'f1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Firma',
  firmenname: 'Firma GmbH',
  adresse: {
    strasse: 'Hauptstraße',
    hausnummer: '1',
    postleitzahl: '10115',
    ort: 'Berlin',
  },
  kontakt: {},
};
const WEITERE_FIRMA: IFirmaEintrag = {
  ...FIRMA,
  id: 'f2',
  nummer: 2,
  anzeigename: 'Weitere Firma',
};
const FILIALE: IFilialeEintrag = {
  id: 'b1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Filiale',
  filialname: 'Filiale',
  adresse: {
    strasse: 'Hauptstraße',
    hausnummer: '1',
    postleitzahl: '10115',
    ort: 'Berlin',
  },
  kontakt: {},
};
const WEITERE_FILIALE: IFilialeEintrag = {
  ...FILIALE,
  id: 'b2',
  nummer: 2,
  anzeigename: 'Weitere Filiale',
};

describe('AppKontextSelector', () => {
  let fixture: ComponentFixture<AppKontextSelector>;
  const unternehmer = signal<readonly IUnternehmerEintrag[]>([UNTERNEHMER]);
  const stammdatenDownload = signal(false);
  const selectedUnternehmer = signal<IUnternehmerEintrag | null>(UNTERNEHMER);
  const firmen = signal<readonly IFirmaEintrag[]>([]);
  const selectedFirma = signal<IFirmaEintrag | null>(null);
  const filialen = signal<readonly IFilialeEintrag[]>([]);
  const selectedFilialen = signal<readonly IFilialeEintrag[]>([]);
  const appKontextStoreMock = {
    selectedUnternehmer,
    firmen,
    selectedFirma,
    filialen,
    selectedFilialen,
    selectUnternehmer: vi.fn(),
    selectFirma: vi.fn(),
    selectFilialen: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    unternehmer.set([UNTERNEHMER]);
    stammdatenDownload.set(false);
    selectedUnternehmer.set(UNTERNEHMER);
    firmen.set([]);
    selectedFirma.set(null);
    filialen.set([]);
    selectedFilialen.set([]);

    await TestBed.configureTestingModule({
      imports: [AppKontextSelector, NoopAnimationsModule],
      providers: [
        { provide: AppKontextStore, useValue: appKontextStoreMock },
        {
          provide: StammdatenStore,
          useValue: { unternehmer, download: stammdatenDownload },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppKontextSelector);
    fixture.detectChanges();
  });

  it('should hide selectors without a real choice', () => {
    firmen.set([FIRMA]);
    selectedFirma.set(FIRMA);
    filialen.set([FILIALE]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(UnternehmerSelector))).toBeNull();
    expect(fixture.debugElement.query(By.directive(FirmaSelector))).toBeNull();
    expect(fixture.debugElement.query(By.directive(FilialeSelector))).toBeNull();
  });

  it('should show selectors immediately after multiple options have loaded', () => {
    stammdatenDownload.set(true);
    unternehmer.set([UNTERNEHMER, WEITERER_UNTERNEHMER]);
    firmen.set([FIRMA, WEITERE_FIRMA]);
    selectedFirma.set(FIRMA);
    filialen.set([FILIALE, WEITERE_FILIALE]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(UnternehmerSelector))).toBeNull();
    expect(fixture.debugElement.query(By.directive(FirmaSelector))).toBeNull();
    expect(fixture.debugElement.query(By.directive(FilialeSelector))).toBeNull();

    stammdatenDownload.set(false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(UnternehmerSelector))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(FirmaSelector))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(FilialeSelector))).not.toBeNull();
  });

  it('should keep the branch selector disabled', () => {
    selectedFirma.set(FIRMA);
    filialen.set([FILIALE, WEITERE_FILIALE]);
    fixture.detectChanges();
    const filialeSelector = fixture.debugElement.query(By.directive(FilialeSelector))
      .componentInstance as FilialeSelector;

    expect(filialeSelector.disabled()).toBe(true);
  });

  it('should apply hidden, readonly and editable selector modes', () => {
    unternehmer.set([UNTERNEHMER, WEITERER_UNTERNEHMER]);
    selectedFirma.set(FIRMA);
    filialen.set([FILIALE, WEITERE_FILIALE]);
    fixture.componentRef.setInput('konfiguration', {
      unternehmer: 'readonly',
      firma: 'hidden',
      filiale: 'editable',
    });
    fixture.detectChanges();
    const unternehmerSelector = fixture.debugElement.query(By.directive(UnternehmerSelector))
      .componentInstance as UnternehmerSelector;
    const filialeSelector = fixture.debugElement.query(By.directive(FilialeSelector))
      .componentInstance as FilialeSelector;

    expect(unternehmerSelector.disabled()).toBe(true);
    expect(fixture.debugElement.query(By.directive(FirmaSelector))).toBeNull();
    expect(filialeSelector.disabled()).toBe(false);
  });

  it('should forward context selections to the app context store', () => {
    unternehmer.set([UNTERNEHMER, WEITERER_UNTERNEHMER]);
    firmen.set([FIRMA, WEITERE_FIRMA]);
    selectedFirma.set(FIRMA);
    filialen.set([FILIALE, WEITERE_FILIALE]);
    fixture.detectChanges();
    const unternehmerSelector = fixture.debugElement.query(By.directive(UnternehmerSelector))
      .componentInstance as UnternehmerSelector;
    const firmaSelector = fixture.debugElement.query(By.directive(FirmaSelector))
      .componentInstance as FirmaSelector;
    const filialeSelector = fixture.debugElement.query(By.directive(FilialeSelector))
      .componentInstance as FilialeSelector;

    unternehmerSelector.selectedUnternehmerChange.emit(UNTERNEHMER);
    firmaSelector.selectedFirmaChange.emit(null);
    filialeSelector.selectedFilialenChange.emit([FILIALE, WEITERE_FILIALE]);

    expect(appKontextStoreMock.selectUnternehmer).toHaveBeenCalledWith(UNTERNEHMER);
    expect(appKontextStoreMock.selectFirma).toHaveBeenCalledWith(null);
    expect(appKontextStoreMock.selectFilialen).toHaveBeenCalledWith([FILIALE, WEITERE_FILIALE]);
  });
});
