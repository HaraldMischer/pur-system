// pur-system/src/app/components/data-selectors/mitarbeiter-selector/mitarbeiter-selector.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { MitarbeiterSelector } from './mitarbeiter-selector';

const MITARBEITER: readonly IMitarbeiterEintrag[] = [
  {
    id: 'm1',
    unternehmerId: 'u1',
    firmaId: 'f1',
    person: {
      vorname: 'Anna',
      nachname: 'Beispiel',
      adresse: {
        strasse: 'Hauptstraße',
        hausnummer: '1',
        postleitzahl: '10115',
        ort: 'Berlin',
      },
      kontakt: {},
    },
    rolle: 'service',
    filialIds: ['b1'],
    aktiv: true,
  },
  {
    id: 'm2',
    unternehmerId: 'u1',
    firmaId: 'f1',
    person: {
      vorname: 'Ben',
      nachname: 'Muster',
      adresse: {
        strasse: 'Nebenstraße',
        hausnummer: '2',
        postleitzahl: '20095',
        ort: 'Hamburg',
      },
      kontakt: {},
    },
    rolle: 'kasse',
    filialIds: [],
    aktiv: true,
  },
];

describe('MitarbeiterSelector', () => {
  let fixture: ComponentFixture<MitarbeiterSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MitarbeiterSelector, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MitarbeiterSelector);
    fixture.componentRef.setInput('mitarbeiter', MITARBEITER);
    fixture.detectChanges();
  });

  it('should render every employee and the current selection', () => {
    fixture.componentRef.setInput('selectedMitarbeiter', MITARBEITER[1]);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;

    expect(select.options.map((option) => option.viewValue)).toEqual([
      'Anna Beispiel',
      'Ben Muster',
    ]);
    expect(select.value).toBe('m2');
  });

  it('should emit the selected employee object', () => {
    const selectedMitarbeiterChangeSpy = vi.fn();
    fixture.componentInstance.selectedMitarbeiterChange.subscribe(selectedMitarbeiterChangeSpy);

    fixture.componentInstance.selectMitarbeiter('m2');

    expect(selectedMitarbeiterChangeSpy).toHaveBeenCalledWith(MITARBEITER[1]);
  });

  it('should emit null for an unknown selection', () => {
    const selectedMitarbeiterChangeSpy = vi.fn();
    fixture.componentInstance.selectedMitarbeiterChange.subscribe(selectedMitarbeiterChangeSpy);

    fixture.componentInstance.selectMitarbeiter('unbekannt');

    expect(selectedMitarbeiterChangeSpy).toHaveBeenCalledWith(null);
  });

  it('should disable the selection when requested or when no entries exist', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    let select = fixture.debugElement.query(By.directive(MatSelect)).componentInstance as MatSelect;
    expect(select.disabled).toBe(true);

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('mitarbeiter', []);
    fixture.detectChanges();
    select = fixture.debugElement.query(By.directive(MatSelect)).componentInstance as MatSelect;

    expect(select.disabled).toBe(true);
    expect(select.options.first.viewValue).toBe('Keine Mitarbeiter verfügbar');
  });
});
