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

  it('should render all branches and the combined context', () => {
    fixture.componentRef.setInput('filialKontext', { typ: 'alle' });
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;

    expect(select.options.map((option) => option.viewValue)).toEqual([
      'Alle Filialen',
      'Filiale Alpha',
      'Filiale Beta',
    ]);
    expect(select.value).toBe(fixture.componentInstance.alleFilialenWert);
  });

  it('should emit a concrete branch context', () => {
    const filialKontextChangeSpy = vi.fn();
    fixture.componentInstance.filialKontextChange.subscribe(filialKontextChangeSpy);

    fixture.componentInstance.selectFilialKontext('b2');

    expect(filialKontextChangeSpy).toHaveBeenCalledWith({
      typ: 'filiale',
      filiale: FILIALEN[1],
    });
  });

  it('should emit the context for all branches', () => {
    const filialKontextChangeSpy = vi.fn();
    fixture.componentInstance.filialKontextChange.subscribe(filialKontextChangeSpy);

    fixture.componentInstance.selectFilialKontext(fixture.componentInstance.alleFilialenWert);

    expect(filialKontextChangeSpy).toHaveBeenCalledWith({ typ: 'alle' });
  });

  it('should offer the combined context for a single branch', () => {
    fixture.componentRef.setInput('filialen', [FILIALEN[0]]);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;

    expect(select.options.map((option) => option.viewValue)).toEqual([
      'Alle Filialen',
      'Filiale Alpha',
    ]);
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
