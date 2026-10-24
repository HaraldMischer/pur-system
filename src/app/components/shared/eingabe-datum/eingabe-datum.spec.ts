// pur-system/src/app/components/shared/eingabe-datum/eingabe-datum.spec.ts

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { EingabeDatum } from './eingabe-datum';

@Component({
  imports: [EingabeDatum, ReactiveFormsModule],
  template: `
    <app-eingabe-datum
      label="Datum"
      required
      [formControl]="control"
      [readonly]="schreibgeschuetzt"
    />
  `,
})
class TestHost {
  readonly control = new FormControl('2026-11-12', {
    nonNullable: true,
    validators: [Validators.required],
  });
  schreibgeschuetzt = false;
}

@Component({
  imports: [EingabeDatum, ReactiveFormsModule],
  template: `
    <app-eingabe-datum label="Datum" modus="monat-tag" required [formControl]="control" />
  `,
})
class MonatTagTestHost {
  readonly control = new FormControl('02-29', {
    nonNullable: true,
    validators: [Validators.required],
  });
}

describe('EingabeDatum', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost, MonatTagTestHost],
    }).compileComponents();
  });

  it('should display an ISO value in the fixed German format', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.value).toBe('12.11.2026');
  });

  it('should convert a valid German date input back to an ISO value', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '24122026';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('2026-12-24');
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('should reject a calendar date that does not exist', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '31.02.2026';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.invalid).toBe(true);
  });

  it('should support readonly and disabled states', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.schreibgeschuetzt = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);
    expect(input.tabIndex).toBe(-1);

    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
  });

  it('should display and normalize a recurring month and day without a year', () => {
    const fixture = TestBed.createComponent(MonatTagTestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('29.02');
    expect(input.placeholder).toBe('TT.MM');

    input.value = '2412';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('24.12');
    expect(fixture.componentInstance.control.value).toBe('12-24');
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('should reject a recurring month and day that does not exist', () => {
    const fixture = TestBed.createComponent(MonatTagTestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '3102';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('31.02');
    expect(fixture.componentInstance.control.invalid).toBe(true);
  });
});
