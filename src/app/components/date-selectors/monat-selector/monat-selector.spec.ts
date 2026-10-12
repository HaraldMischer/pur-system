// pur-system/src/app/components/date-selectors/monat-selector/monat-selector.spec.ts

import { TestBed } from '@angular/core/testing';

import { MonatSelector } from './monat-selector';

describe('MonatSelector', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonatSelector],
    }).compileComponents();
  });

  it('should emit the previous and next normalized month', () => {
    const fixture = TestBed.createComponent(MonatSelector);
    fixture.componentRef.setInput('selectedMonat', '2026-01');
    const selectedMonatChange = vi.fn();
    fixture.componentInstance.selectedMonatChange.subscribe(selectedMonatChange);

    fixture.componentInstance.changeMonat(-1);
    fixture.componentInstance.changeMonat(1);

    expect(selectedMonatChange).toHaveBeenNthCalledWith(1, '2025-12');
    expect(selectedMonatChange).toHaveBeenNthCalledWith(2, '2026-02');
  });

  it('should display an externally changed month', () => {
    const fixture = TestBed.createComponent(MonatSelector);
    fixture.componentRef.setInput('selectedMonat', '2026-10');
    fixture.detectChanges();

    fixture.componentRef.setInput('selectedMonat', '2027-04');
    fixture.detectChanges();

    expect(fixture.componentInstance.monatsbezeichnung()).toBe('April 2027');
  });
});
