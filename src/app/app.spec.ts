// pur-system/src/app/app.spec.ts

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppSitzungsInitService } from './services/core/app-sitzungs-init.service';
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
  let appSitzungsInitServiceMock: {
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
    appSitzungsInitServiceMock = {
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
        { provide: AppSitzungsInitService, useValue: appSitzungsInitServiceMock },
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

    expect(appSitzungsInitServiceMock.init).toHaveBeenCalledOnce();
  });

  it('should show the global notice only for an inactive own profile', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Dieses Profil ist inaktiv. Bitte wende dich an einen Administrator.',
    );

    benutzerStoreMock.istInaktiv.set(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Dieses Profil ist inaktiv. Bitte wende dich an einen Administrator.',
    );

    benutzerStoreMock.istInaktiv.set(false);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Dieses Profil ist inaktiv. Bitte wende dich an einen Administrator.',
    );
  });
});
