// pur-system/src/app/app.spec.ts

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';

import { AppToolbar } from './components/app-shell/app-toolbar/app-toolbar';
import { AppInitialisierungService } from './services/core/app-initialisierung.service';
import { BenutzerStore } from './stores/app/benutzer.store';
import { App } from './app';

@Component({
  template: '',
})
class AuthTestPage {}

describe('App', () => {
  let benutzerStoreMock: {
    benutzerProfil: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    inProgress: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    darfBereichNutzen: ReturnType<typeof vi.fn>;
    istInaktiv: WritableSignal<boolean>;
    istMaster: ReturnType<typeof vi.fn>;
  };
  let appInitialisierungServiceMock: {
    init: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    benutzerStoreMock = {
      benutzerProfil: vi.fn().mockReturnValue(null),
      isAuthenticated: vi.fn().mockReturnValue(false),
      inProgress: vi.fn().mockReturnValue(false),
      logout: vi.fn().mockResolvedValue(undefined),
      darfBereichNutzen: vi.fn().mockReturnValue(true),
      istInaktiv: signal(false),
      istMaster: vi.fn().mockReturnValue(true),
    };
    appInitialisierungServiceMock = {
      init: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App, NoopAnimationsModule],
      providers: [
        provideRouter([
          {
            path: 'login',
            component: AuthTestPage,
            data: { layout: 'auth' },
          },
        ]),
        { provide: AppInitialisierungService, useValue: appInitialisierungServiceMock },
        { provide: BenutzerStore, useValue: benutzerStoreMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize the app session', () => {
    TestBed.createComponent(App);

    expect(appInitialisierungServiceMock.init).toHaveBeenCalledOnce();
  });

  it('should render the app shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('mat-sidenav-container')).toBeTruthy();
    expect(compiled.querySelector('app-toolbar')).toBeTruthy();
    expect(compiled.querySelector('app-sidenav')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should leave the initial toolbar title empty before route recognition', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const toolbar = fixture.debugElement.query(By.directive(AppToolbar))
      .componentInstance as AppToolbar;

    expect(toolbar.title()).toBe('');
  });

  it('should show the configured product title in the toolbar without authentication', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);

    await router.navigateByUrl('/login');
    fixture.detectChanges();

    const toolbar = fixture.debugElement.query(By.directive(AppToolbar))
      .componentInstance as AppToolbar;

    expect(toolbar.title()).toBe('Pur-System');
  });

  it('should show the global notice only for an inactive own profile', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.global-banner')).toBeNull();

    benutzerStoreMock.istInaktiv.set(true);
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.global-banner') as HTMLElement;

    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.querySelector('.global-banner__text')?.textContent?.trim()).toBe(
      'Dieses Profil ist inaktiv. Bitte wende dich an einen Administrator.',
    );

    benutzerStoreMock.istInaktiv.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.global-banner')).toBeNull();
  });
});
