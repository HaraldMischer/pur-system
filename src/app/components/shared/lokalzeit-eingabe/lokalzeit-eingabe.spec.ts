// pur-system/src/app/components/shared/lokalzeit-eingabe/lokalzeit-eingabe.spec.ts

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { LokalzeitEingabe } from './lokalzeit-eingabe';

@Component({
  imports: [LokalzeitEingabe, ReactiveFormsModule],
  template: `
    <app-lokalzeit-eingabe
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

describe('LokalzeitEingabe', () => {
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

  it('should render one consistent clock icon and inherit the disabled state', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.control.setValue('08:00');
    fixture.componentInstance.control.disable();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const icon = fixture.nativeElement.querySelector('mat-icon[matIconSuffix]') as HTMLElement;
    expect(input.type).toBe('text');
    expect(input.disabled).toBe(true);
    expect(icon.textContent).toContain('schedule');
    expect(fixture.nativeElement.querySelector('[matTextSuffix]')).toBeNull();
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
