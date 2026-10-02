// pur-system/src/app/components/data-selectors/app-kontext-selector/unternehmer-selector/unternehmer-selector.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelect } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { IUnternehmerEintrag } from '../../../../commons/models/domain/unternehmer';
import { UnternehmerSelector } from './unternehmer-selector';

const UNTERNEHMER: readonly IUnternehmerEintrag[] = [
  { id: 'u1', nummer: 1, anzeigename: 'Unternehmer Alpha' },
  { id: 'u2', nummer: 2, anzeigename: 'Unternehmer Beta' },
];

describe('UnternehmerSelector', () => {
  let fixture: ComponentFixture<UnternehmerSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, UnternehmerSelector],
    }).compileComponents();

    fixture = TestBed.createComponent(UnternehmerSelector);
    fixture.componentRef.setInput('unternehmer', UNTERNEHMER);
    fixture.detectChanges();
  });

  it('should render every entrepreneur and the current selection', () => {
    fixture.componentRef.setInput('selectedUnternehmer', UNTERNEHMER[1]);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;

    expect(select.options.map((option) => option.viewValue)).toEqual([
      'Unternehmer Alpha',
      'Unternehmer Beta',
    ]);
    expect(select.value).toBe('u2');
  });

  it('should emit the selected entrepreneur object', () => {
    const selectedUnternehmerChangeSpy = vi.fn();
    fixture.componentInstance.selectedUnternehmerChange.subscribe(selectedUnternehmerChangeSpy);

    fixture.componentInstance.selectUnternehmer('u2');

    expect(selectedUnternehmerChangeSpy).toHaveBeenCalledWith(UNTERNEHMER[1]);
  });

  it('should emit null for an unknown selection', () => {
    const selectedUnternehmerChangeSpy = vi.fn();
    fixture.componentInstance.selectedUnternehmerChange.subscribe(selectedUnternehmerChangeSpy);

    fixture.componentInstance.selectUnternehmer('unbekannt');

    expect(selectedUnternehmerChangeSpy).toHaveBeenCalledWith(null);
  });

  it('should disable the selection when requested or when no entries exist', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    let select = fixture.debugElement.query(By.directive(MatSelect)).componentInstance as MatSelect;
    expect(select.disabled).toBe(true);

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('unternehmer', []);
    fixture.detectChanges();
    select = fixture.debugElement.query(By.directive(MatSelect)).componentInstance as MatSelect;

    expect(select.disabled).toBe(true);
    expect(select.options.first.viewValue).toBe('Keine Unternehmer verfügbar');
  });
});
