// pur-system/src/app/components/data-selectors/firma-selector/firma-selector.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelect } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { IFirmaEintrag } from '../../../commons/models/domain/firma';
import { FirmaSelector } from './firma-selector';

const FIRMEN: readonly IFirmaEintrag[] = [
  {
    id: 'f1',
    nummer: 1,
    aktiv: true,
    anzeigename: 'Firma Alpha',
    firmenname: 'Firma Alpha GmbH',
    adresse: { strasse: 'Hauptstraße', hausnummer: '1', postleitzahl: '10115', ort: 'Berlin' },
    kontakt: { email: 'alpha@example.com' },
  },
  {
    id: 'f2',
    nummer: 2,
    aktiv: true,
    anzeigename: 'Firma Beta',
    firmenname: 'Firma Beta GmbH',
    adresse: { strasse: 'Nebenstraße', hausnummer: '2', postleitzahl: '20095', ort: 'Hamburg' },
    kontakt: { email: 'beta@example.com' },
  },
];

describe('FirmaSelector', () => {
  let fixture: ComponentFixture<FirmaSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirmaSelector, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FirmaSelector);
    fixture.componentRef.setInput('firmen', FIRMEN);
    fixture.detectChanges();
  });

  it('should render every company and the current selection', () => {
    fixture.componentRef.setInput('selectedFirma', FIRMEN[1]);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;

    expect(select.options.map((option) => option.viewValue)).toEqual(['Firma Alpha', 'Firma Beta']);
    expect(select.value).toBe('f2');
  });

  it('should emit the selected company object', () => {
    const selectedFirmaChangeSpy = vi.fn();
    fixture.componentInstance.selectedFirmaChange.subscribe(selectedFirmaChangeSpy);

    fixture.componentInstance.selectFirma('f2');

    expect(selectedFirmaChangeSpy).toHaveBeenCalledWith(FIRMEN[1]);
  });

  it('should emit null for an unknown selection', () => {
    const selectedFirmaChangeSpy = vi.fn();
    fixture.componentInstance.selectedFirmaChange.subscribe(selectedFirmaChangeSpy);

    fixture.componentInstance.selectFirma('unbekannt');

    expect(selectedFirmaChangeSpy).toHaveBeenCalledWith(null);
  });

  it('should disable the selection when requested or when no entries exist', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    let select = fixture.debugElement.query(By.directive(MatSelect)).componentInstance as MatSelect;
    expect(select.disabled).toBe(true);

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('firmen', []);
    fixture.detectChanges();
    select = fixture.debugElement.query(By.directive(MatSelect)).componentInstance as MatSelect;

    expect(select.disabled).toBe(true);
    expect(select.options.first.viewValue).toBe('Keine Firmen verfügbar');
  });
});
