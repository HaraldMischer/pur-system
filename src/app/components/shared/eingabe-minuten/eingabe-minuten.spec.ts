// pur-system/src/app/components/shared/eingabe-minuten/eingabe-minuten.spec.ts

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { EingabeMinuten } from './eingabe-minuten';

@Component({
  imports: [EingabeMinuten, ReactiveFormsModule],
  template: `
    <app-eingabe-minuten
      label="Vorbereitung"
      required
      [formControl]="control"
      [readonly]="schreibgeschuetzt"
    />
  `,
})
class TestHost {
  readonly control = new FormControl<number | null>(15, [Validators.required]);
  schreibgeschuetzt = false;
}

describe('EingabeMinuten', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
  });

  it('should pass a whole minute value to the parent control', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '120';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe(120);
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('should remove nonnumeric characters and leading zeros', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '015x';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input.value).toBe('15');
    expect(fixture.componentInstance.control.value).toBe(15);
  });

  it('should reject values above three digits and an empty required value', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '1000';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.control.hasError('minuten')).toBe(true);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.control.hasError('required')).toBe(true);
  });

  it('should inherit readonly and disabled states', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.schreibgeschuetzt = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);

    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
  });
});
