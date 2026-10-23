// pur-system/src/app/components/shared/eingabe-zeit/eingabe-zeit.spec.ts

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { EingabeZeit } from './eingabe-zeit';

@Component({
  imports: [EingabeZeit, ReactiveFormsModule],
  template: `
    <app-eingabe-zeit
      label="Beginn"
      required
      [formControl]="control"
      [readonly]="schreibgeschuetzt"
    />
  `,
})
class TestHost {
  readonly control = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  schreibgeschuetzt = false;
}

describe('EingabeZeit', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
  });

  it('should format four entered digits as a valid local time', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '0730';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('07:30');
    expect(fixture.componentInstance.control.value).toBe('07:30');
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('should reject incomplete and out-of-range local times', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '25';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.control.hasError('lokalzeit')).toBe(true);

    input.value = '2560';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.control.value).toBe('25:60');
    expect(fixture.componentInstance.control.hasError('lokalzeit')).toBe(true);
  });

  it('should preserve an intermediate edit and the cursor position', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.control.setValue('07:00');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.focus();
    input.value = '0:00';
    input.setSelectionRange(1, 1);
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('0:00');
    expect(input.selectionStart).toBe(1);
    expect(fixture.componentInstance.control.value).toBe('0:00');
    expect(fixture.componentInstance.control.hasError('lokalzeit')).toBe(true);

    input.value = '08:00';
    input.setSelectionRange(2, 2);
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('08:00');
    expect(input.selectionStart).toBe(2);
    expect(fixture.componentInstance.control.value).toBe('08:00');
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('should allow replacing the complete hour and minute segments', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.control.setValue('06:00');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.focus();
    input.value = ':00';
    input.setSelectionRange(0, 0);
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe(':00');
    expect(input.selectionStart).toBe(0);
    expect(fixture.componentInstance.control.value).toBe(':00');
    expect(fixture.componentInstance.control.hasError('lokalzeit')).toBe(true);

    input.value = '08:00';
    input.setSelectionRange(2, 2);
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('08:00');
    expect(input.selectionStart).toBe(2);
    expect(fixture.componentInstance.control.value).toBe('08:00');
    expect(fixture.componentInstance.control.valid).toBe(true);

    input.value = '08:';
    input.setSelectionRange(3, 3);
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('08:');
    expect(input.selectionStart).toBe(3);
    expect(fixture.componentInstance.control.value).toBe('08:');
    expect(fixture.componentInstance.control.hasError('lokalzeit')).toBe(true);

    input.value = '08:45';
    input.setSelectionRange(5, 5);
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('08:45');
    expect(input.selectionStart).toBe(5);
    expect(fixture.componentInstance.control.value).toBe('08:45');
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('should normalize a complete one-digit hour after leaving the input', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '7:30';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input.value).toBe('07:30');
    expect(fixture.componentInstance.control.value).toBe('07:30');
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('should inherit the disabled state', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.control.setValue('08:00');
    fixture.componentInstance.control.disable();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.disabled).toBe(true);
  });

  it('should render a readonly value without disabling it', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.control.setValue('16:30');
    fixture.componentInstance.schreibgeschuetzt = true;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('16:30');
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);
  });
});
