// pur-system/src/app/components/shared/farbkennung-auswahl/farbkennung-auswahl.spec.ts

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatMenuTrigger } from '@angular/material/menu';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FarbkennungAuswahl } from './farbkennung-auswahl';

@Component({
  imports: [FarbkennungAuswahl, ReactiveFormsModule],
  template: `<app-farbkennung-auswahl [formControl]="farbkennung" />`,
})
class FarbkennungAuswahlTestHost {
  readonly farbkennung = new FormControl<string | null>(null);
}

describe('FarbkennungAuswahl', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarbkennungAuswahlTestHost, NoopAnimationsModule],
    }).compileComponents();
  });

  it('should pass the selected color identifier to the form control', () => {
    const fixture = TestBed.createComponent(FarbkennungAuswahlTestHost);
    fixture.detectChanges();

    const auswahl = fixture.debugElement.query(By.directive(FarbkennungAuswahl))
      .componentInstance as FarbkennungAuswahl;
    auswahl.selectFarbkennung('blau');

    expect(fixture.componentInstance.farbkennung.value).toBe('blau');
  });

  it('should open the color menu by clicking the label', () => {
    const fixture = TestBed.createComponent(FarbkennungAuswahlTestHost);
    fixture.detectChanges();

    const auswahl = fixture.debugElement.query(By.directive(FarbkennungAuswahl));
    const menuTrigger = auswahl.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
    const openMenu = vi.spyOn(menuTrigger, 'openMenu');
    const label = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.farbkennung-auswahl__label',
    );
    expect(label).not.toBeNull();
    label!.click();

    expect(openMenu).toHaveBeenCalledOnce();
  });

  it('should disable the trigger with its form control', () => {
    const fixture = TestBed.createComponent(FarbkennungAuswahlTestHost);
    fixture.componentInstance.farbkennung.disable();
    fixture.detectChanges();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Farbkennung auswählen"]',
    );

    expect(trigger?.disabled).toBe(true);
  });
});
