// pur-system/src/app/pages/zugang/passwort-page/passwort-page.spec.ts

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
  });

  it('should toggle every password field independently without submitting', () => {
    const fixture = TestBed.createComponent(PasswortPage);
    fixture.componentInstance.passwortForm.setValue({
      aktuellesPasswort: 'altes-passwort',
      neuesPasswort: 'neues-passwort',
      passwortBestaetigung: 'neues-passwort',
    });
    const component = fixture.componentInstance;

    expect(component.istPasswortSichtbar('aktuellesPasswort')).toBe(false);
    expect(component.istPasswortSichtbar('neuesPasswort')).toBe(false);
    expect(component.istPasswortSichtbar('passwortBestaetigung')).toBe(false);

    component.togglePasswortSichtbarkeit('neuesPasswort');

    expect(component.istPasswortSichtbar('aktuellesPasswort')).toBe(false);
    expect(component.istPasswortSichtbar('neuesPasswort')).toBe(true);
    expect(component.istPasswortSichtbar('passwortBestaetigung')).toBe(false);
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
    expect(component.passwortForm.disabled).toBe(true);

    resolveSave();
    await pending;
    fixture.detectChanges();

    expect(component.passwortForm.enabled).toBe(true);
  });
});
