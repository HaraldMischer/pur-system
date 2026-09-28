// pur-system/src/app/pages/auth/login-page/login-page.spec.ts

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { NetzwerkStatusService } from '../../../services/core/netzwerk-status.service';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  const isOnline = signal(true);
  let benutzerStoreMock: {
    inProgress: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    darfBereichNutzen: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    isOnline.set(true);
    benutzerStoreMock = {
      inProgress: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
      login: vi.fn().mockResolvedValue(undefined),
      darfBereichNutzen: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: NetzwerkStatusService, useValue: { isOnline } },
        { provide: BenutzerStore, useValue: benutzerStoreMock },
      ],
    }).compileComponents();
  });

  it('should provide an invalid empty form initially', () => {
    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;

    expect(page.loginForm.invalid).toBe(true);
    expect(page.loginForm.controls.anmeldename.hasError('required')).toBe(true);
    expect(page.loginForm.controls.password.hasError('required')).toBe(true);
  });

  it('should provide the master login name through the development helper', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('mat-card-title button')?.click();

    expect(compiled.querySelector('mat-card-title button')?.textContent).toContain('Master');
    expect(fixture.componentInstance.loginForm.getRawValue()).toEqual({
      anmeldename: 'harry-master',
      password: '',
    });
  });

  it('should normalize the login name, login and navigate to the dashboard', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;

    page.loginForm.setValue({
      anmeldename: ' Harald.Mischer--MASTER ',
      password: 'secret-password',
    });

    await page.submitLogin();

    expect(benutzerStoreMock.login).toHaveBeenCalledWith(
      'harald.mischer-master',
      'secret-password',
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should render a login name field without a role selection', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('input[formControlName="anmeldename"]')).not.toBeNull();
    expect(compiled.querySelector('mat-select')).toBeNull();
    expect(compiled.textContent).toContain('Anmeldename');
    expect(compiled.querySelector('form')?.getAttribute('aria-label')).toBe(
      'Bei Pur-System anmelden',
    );
  });

  it('should toggle password visibility without submitting or changing the password', () => {
    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    page.loginForm.setValue({
      anmeldename: 'test-master',
      password: 'secret-password',
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('input[formControlName="password"]');
    const button = compiled.querySelector<HTMLButtonElement>('button[matSuffix]');

    expect(input?.type).toBe('password');
    expect(button?.type).toBe('button');
    expect(button?.getAttribute('aria-label')).toBe('Passwort anzeigen');

    button?.click();
    fixture.detectChanges();

    expect(input?.type).toBe('text');
    expect(button?.getAttribute('aria-label')).toBe('Passwort ausblenden');

    button?.click();
    fixture.detectChanges();

    expect(input?.type).toBe('password');
    expect(input?.value).toBe('secret-password');
    expect(benutzerStoreMock.login).not.toHaveBeenCalled();
  });

  it('should not login when the form is invalid', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;

    await page.submitLogin();

    expect(benutzerStoreMock.login).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(page.loginForm.touched).toBe(true);
  });

  it('should explain and prevent login while offline', async () => {
    isOnline.set(false);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    page.loginForm.setValue({
      anmeldename: 'test-master',
      password: 'secret-password',
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    await page.submitLogin();

    expect(compiled.querySelector('[role="status"]')?.textContent).toContain(
      'Die Anmeldung benötigt eine Internetverbindung.',
    );
    expect(compiled.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(true);
    expect(benutzerStoreMock.login).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should render an error message from the store', () => {
    benutzerStoreMock.error.mockReturnValue('Anmeldename oder Passwort ist nicht korrekt.');
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.pur-form__error')?.textContent).toContain(
      'Anmeldename oder Passwort ist nicht korrekt.',
    );
  });
});
