// pur-system/src/app/pages/initialisierungsfehler-page/initialisierungsfehler-page.spec.ts

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AppSitzungsInitService } from '../../services/core/app-sitzungs-init.service';
import { BenutzerStore } from '../../stores/app/benutzer.store';
import { InitialisierungsfehlerPage } from './initialisierungsfehler-page';

describe('InitialisierungsfehlerPage', () => {
  let fixture: ComponentFixture<InitialisierungsfehlerPage>;
  let status: ReturnType<typeof signal<'error' | 'ready'>>;
  let initialisierungsfehler: ReturnType<typeof signal<string | null>>;
  let benutzerfehler: ReturnType<typeof signal<string | null>>;
  let appSitzungsInitServiceMock: {
    status: typeof status;
    error: typeof initialisierungsfehler;
    retry: ReturnType<typeof vi.fn>;
  };
  let benutzerStoreMock: {
    error: typeof benutzerfehler;
    logout: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    navigate: ReturnType<typeof vi.fn>;
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    status = signal<'error' | 'ready'>('error');
    initialisierungsfehler = signal('Die Stammdaten konnten nicht geladen werden.');
    benutzerfehler = signal<string | null>(null);
    appSitzungsInitServiceMock = {
      status,
      error: initialisierungsfehler,
      retry: vi.fn().mockImplementation(async () => {
        status.set('ready');
      }),
    };
    benutzerStoreMock = {
      error: benutzerfehler,
      logout: vi.fn().mockResolvedValue(undefined),
    };
    routerMock = {
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [InitialisierungsfehlerPage],
      providers: [
        { provide: AppSitzungsInitService, useValue: appSitzungsInitServiceMock },
        { provide: BenutzerStore, useValue: benutzerStoreMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ returnUrl: '/verwaltung?ansicht=firma' }),
            },
            queryParamMap: of(convertToParamMap({ returnUrl: '/verwaltung?ansicht=firma' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InitialisierungsfehlerPage);
    fixture.detectChanges();
  });

  it('should show the concrete initialization error and both recovery actions', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Die Stammdaten konnten nicht geladen werden.');
    expect(text).toContain('Erneut versuchen');
    expect(text).toContain('Abmelden');
  });

  it('should return to the requested route after a successful retry', async () => {
    await fixture.componentInstance.retry();

    expect(appSitzungsInitServiceMock.retry).toHaveBeenCalledOnce();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/verwaltung?ansicht=firma');
  });

  it('should remain on the error page when retry fails again', async () => {
    appSitzungsInitServiceMock.retry.mockImplementation(async () => {
      initialisierungsfehler.set('Der zweite Versuch ist fehlgeschlagen.');
    });

    await fixture.componentInstance.retry();
    fixture.detectChanges();

    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Der zweite Versuch ist fehlgeschlagen.');
  });

  it('should logout and navigate to login', async () => {
    await fixture.componentInstance.logout();

    expect(benutzerStoreMock.logout).toHaveBeenCalledOnce();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });
});
