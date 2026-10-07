// pur-system/src/app/pages/auth/passwort-page/passwort-page.spec.ts

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { FormGroupDirective } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { AuthService } from '../../../services/firebase/auth.service';
import { PasswortPage } from './passwort-page';

describe('PasswortPage', () => {
  let authServiceMock: { changePassword: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authServiceMock = { changePassword: vi.fn().mockResolvedValue(undefined) };
    await TestBed.configureTestingModule({
      imports: [PasswortPage, NoopAnimationsModule],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();
  });

  it('should require all password fields', () => {
    const fixture = TestBed.createComponent(PasswortPage);
    expect(fixture.componentInstance.passwortForm.invalid).toBe(true);
  });

  it('should reject different new passwords', () => {
    const fixture = TestBed.createComponent(PasswortPage);
    fixture.componentInstance.passwortForm.setValue({
      aktuellesPasswort: 'altes-passwort',
      neuesPasswort: 'neues-passwort',
      passwortBestaetigung: 'anderes-passwort',
    });

    expect(fixture.componentInstance.passwortForm.hasError('passwoerterUngleich')).toBe(true);
  });

  it('should change the password for a valid form', async () => {
    let resolveSave!: () => void;
    authServiceMock.changePassword.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );
    const fixture = TestBed.createComponent(PasswortPage);
    const component = fixture.componentInstance;
    component.passwortForm.setValue({
      aktuellesPasswort: 'altes-passwort',
      neuesPasswort: 'neues-passwort',
      passwortBestaetigung: 'neues-passwort',
    });
    component.togglePasswortSichtbarkeit('neuesPasswort');
    fixture.detectChanges();
    const directive = fixture.debugElement
      .query(By.directive(FormGroupDirective))
      .injector.get(FormGroupDirective);
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(directive.submitted).toBe(true);
    resolveSave();
    await vi.waitFor(() => {
      expect(component.istPasswortSichtbar('neuesPasswort')).toBe(false);
    });
    fixture.detectChanges();

    expect(authServiceMock.changePassword).toHaveBeenCalledWith('altes-passwort', 'neues-passwort');
    expect(component.passwortStore.erfolgreich()).toBe(true);
    expect(directive.submitted).toBe(false);
    expect(component.passwortForm.pristine).toBe(true);
    expect(component.passwortForm.untouched).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.mat-mdc-form-field-invalid')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.pur-form__item--success')).not.toBeNull();
  });

  it('should toggle every password field independently without submitting', () => {
    const fixture = TestBed.createComponent(PasswortPage);
    fixture.componentInstance.passwortForm.setValue({
      aktuellesPasswort: 'altes-passwort',
      neuesPasswort: 'neues-passwort',
      passwortBestaetigung: 'neues-passwort',
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const inputs = compiled.querySelectorAll<HTMLInputElement>('input');
    const buttons = compiled.querySelectorAll<HTMLButtonElement>('button[matSuffix]');

    expect(inputs).toHaveLength(3);
    expect(buttons).toHaveLength(3);
    expect(Array.from(inputs).map((input) => input.type)).toEqual([
      'password',
      'password',
      'password',
    ]);

    buttons[1].click();
    fixture.detectChanges();

    expect(Array.from(inputs).map((input) => input.type)).toEqual(['password', 'text', 'password']);
    expect(buttons[1].getAttribute('aria-label')).toBe('Neues Passwort ausblenden');
    expect(fixture.componentInstance.passwortForm.getRawValue()).toEqual({
      aktuellesPasswort: 'altes-passwort',
      neuesPasswort: 'neues-passwort',
      passwortBestaetigung: 'neues-passwort',
    });
    expect(authServiceMock.changePassword).not.toHaveBeenCalled();
  });

  it('should disable the complete form while changing the password', async () => {
    let resolveSave!: () => void;
    authServiceMock.changePassword.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );
    const fixture = TestBed.createComponent(PasswortPage);
    const component = fixture.componentInstance;
    component.passwortForm.setValue({
      aktuellesPasswort: 'altes-passwort',
      neuesPasswort: 'neues-passwort',
      passwortBestaetigung: 'neues-passwort',
    });
    fixture.detectChanges();

    const pending = component.onSubmit();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('form') as HTMLFormElement;

    expect(component.passwortForm.disabled).toBe(true);
    expect(form.hasAttribute('inert')).toBe(true);
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(
      Array.from(compiled.querySelectorAll<HTMLInputElement>('input')).every(
        (input) => input.disabled,
      ),
    ).toBe(true);

    resolveSave();
    await pending;
    fixture.detectChanges();

    expect(component.passwortForm.enabled).toBe(true);
    expect(form.hasAttribute('inert')).toBe(false);
    expect(form.getAttribute('aria-busy')).toBe('false');
  });
});
