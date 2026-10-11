// pur-system/src/app/components/data-selectors/app-kontext-selector/filiale-selector/filiale-selector.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelect } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { IFilialeEintrag } from '../../../../commons/models/domain/filiale';
import { FilialeSelector } from './filiale-selector';

const FILIALEN: readonly IFilialeEintrag[] = [
  {
    id: 'b1',
    nummer: 1,
    aktiv: true,
    anzeigename: 'Filiale Alpha',
    filialname: 'Filiale Alpha',
    adresse: { strasse: 'Hauptstraße', hausnummer: '1', postleitzahl: '10115', ort: 'Berlin' },
    kontakt: {},
  },
  {
    id: 'b2',
    nummer: 2,
    aktiv: true,
    anzeigename: 'Filiale Beta',
    filialname: 'Filiale Beta',
    adresse: { strasse: 'Nebenstraße', hausnummer: '2', postleitzahl: '20095', ort: 'Hamburg' },
    kontakt: {},
  },
];

describe('FilialeSelector', () => {
  let fixture: ComponentFixture<FilialeSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilialeSelector, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FilialeSelector);
    fixture.componentRef.setInput('filialen', FILIALEN);
    fixture.detectChanges();
  });

  it('should render and select concrete branches', () => {
    fixture.componentRef.setInput('selectedFilialen', FILIALEN);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;

    expect(select.multiple).toBe(true);
    expect(select.options.map((option) => option.viewValue)).toEqual([
      'Filiale Alpha',
      'Filiale Beta',
    ]);
    expect(select.value).toEqual(['b1', 'b2']);
  });

  it('should emit multiple concrete branches in their available order', () => {
    const selectedFilialenChangeSpy = vi.fn();
    fixture.componentInstance.selectedFilialenChange.subscribe(selectedFilialenChangeSpy);

    fixture.componentInstance.selectFilialen(['b2', 'b1']);

    expect(selectedFilialenChangeSpy).toHaveBeenCalledWith(FILIALEN);
  });

  it('should emit an empty branch selection', () => {
    const selectedFilialenChangeSpy = vi.fn();
    fixture.componentInstance.selectedFilialenChange.subscribe(selectedFilialenChangeSpy);

    fixture.componentInstance.selectFilialen([]);

    expect(selectedFilialenChangeSpy).toHaveBeenCalledWith([]);
  });

  it('should offer only the concrete option for a single branch', () => {
    fixture.componentRef.setInput('filialen', [FILIALEN[0]]);
    fixture.componentRef.setInput('selectedFilialen', [FILIALEN[0]]);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;

    expect(select.options.map((option) => option.viewValue)).toEqual(['Filiale Alpha']);
  });

  it('should disable an empty selection and show its empty state', () => {
    fixture.componentRef.setInput('filialen', []);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;

    expect(select.disabled).toBe(true);
    expect(select.options.first.viewValue).toBe('Keine Filialen verfügbar');
  });
});
