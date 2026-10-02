// pur-system/src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TFilialKontext } from '../../../commons/models/app/app-kontext.types';
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

describe('AppKontextSelector', () => {
  let fixture: ComponentFixture<AppKontextSelector>;
  const unternehmer = vi.fn().mockReturnValue([UNTERNEHMER]);
  const stammdatenDownload = vi.fn().mockReturnValue(false);
  const selectedUnternehmer = vi.fn().mockReturnValue(UNTERNEHMER);
  const firmen = vi.fn().mockReturnValue([] as readonly IFirmaEintrag[]);
  const selectedFirma = vi.fn().mockReturnValue(null);
  const filialen = vi.fn().mockReturnValue([] as readonly IFilialeEintrag[]);
  const filialKontext = vi.fn().mockReturnValue(null as TFilialKontext);
  const appKontextStoreMock = {
    selectedUnternehmer,
    firmen,
    selectedFirma,
    filialen,
    filialKontext,
    selectUnternehmer: vi.fn(),
    selectFirma: vi.fn(),
    selectFilialKontext: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    unternehmer.mockReturnValue([UNTERNEHMER]);
    stammdatenDownload.mockReturnValue(false);
    selectedUnternehmer.mockReturnValue(UNTERNEHMER);
    firmen.mockReturnValue([]);
    selectedFirma.mockReturnValue(null);
    filialen.mockReturnValue([]);
    filialKontext.mockReturnValue(null);

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

  it('should compose all three context selectors', () => {
    expect(fixture.debugElement.query(By.directive(UnternehmerSelector))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(FirmaSelector))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(FilialeSelector))).not.toBeNull();
  });

  it('should keep the branch selector disabled', () => {
    const filialeSelector = fixture.debugElement.query(By.directive(FilialeSelector))
      .componentInstance as FilialeSelector;

    expect(filialeSelector.disabled()).toBe(true);
  });

  it('should apply hidden, readonly and editable selector modes', () => {
    selectedFirma.mockReturnValue(FIRMA);
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
    const unternehmerSelector = fixture.debugElement.query(By.directive(UnternehmerSelector))
      .componentInstance as UnternehmerSelector;
    const firmaSelector = fixture.debugElement.query(By.directive(FirmaSelector))
      .componentInstance as FirmaSelector;
    const filialeSelector = fixture.debugElement.query(By.directive(FilialeSelector))
      .componentInstance as FilialeSelector;

    unternehmerSelector.selectedUnternehmerChange.emit(UNTERNEHMER);
    firmaSelector.selectedFirmaChange.emit(null);
    filialeSelector.filialKontextChange.emit({ typ: 'alle' });

    expect(appKontextStoreMock.selectUnternehmer).toHaveBeenCalledWith(UNTERNEHMER);
    expect(appKontextStoreMock.selectFirma).toHaveBeenCalledWith(null);
    expect(appKontextStoreMock.selectFilialKontext).toHaveBeenCalledWith({ typ: 'alle' });
  });
});
