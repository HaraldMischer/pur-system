// pur-system/src/app/components/app-shell/app-toolbar/app-toolbar.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoadingService } from '../../../services/core/loading.service';
import { NetzwerkStatusService } from '../../../services/core/netzwerk-status.service';
import { PwaUpdateService } from '../../../services/core/pwa-update.service';
import { StoreSnapshotService } from '../../../services/core/store-snapshot.service';
import { ThemeService } from '../../../services/core/theme.service';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { AppToolbar } from './app-toolbar';

describe('AppToolbar', () => {
  let benutzerStoreMock: {
    logout: ReturnType<typeof vi.fn>;
  };
  let themeServiceMock: {
    themeIcon: ReturnType<typeof vi.fn>;
    toggleThemeMode: ReturnType<typeof vi.fn>;
  };
  let storeSnapshotServiceMock: {
    logStoreSnapshots: ReturnType<typeof vi.fn>;
  };
  const isActive = signal(false);
  const isLoading = signal(false);
  const isWriting = signal(false);
  const isOnline = signal(true);
  const wiederOnline = signal(false);
  const updateVerfuegbar = signal(false);
  const updateFehler = signal<string | null>(null);
  const neuladenErforderlich = signal(false);
  const reloadAppMock = vi.fn();

  beforeEach(async () => {
    benutzerStoreMock = {
      logout: vi.fn().mockResolvedValue(undefined),
    };
    themeServiceMock = {
      themeIcon: vi.fn().mockReturnValue('dark_mode'),
      toggleThemeMode: vi.fn(),
    };
    storeSnapshotServiceMock = {
      logStoreSnapshots: vi.fn(),
    };
    isActive.set(false);
    isLoading.set(false);
    isWriting.set(false);
    isOnline.set(true);
    wiederOnline.set(false);
    updateVerfuegbar.set(false);
    updateFehler.set(null);
    neuladenErforderlich.set(false);
    reloadAppMock.mockReset();

    await TestBed.configureTestingModule({
      imports: [AppToolbar],
      providers: [
        provideRouter([]),
        { provide: BenutzerStore, useValue: benutzerStoreMock },
        { provide: LoadingService, useValue: { isActive, isLoading, isWriting } },
        { provide: NetzwerkStatusService, useValue: { isOnline, wiederOnline } },
        {
          provide: PwaUpdateService,
          useValue: {
            updateVerfuegbar,
            updateFehler,
            neuladenErforderlich,
            reloadApp: reloadAppMock,
          },
        },
        { provide: StoreSnapshotService, useValue: storeSnapshotServiceMock },
        { provide: ThemeService, useValue: themeServiceMock },
      ],
    }).compileComponents();
  });

  it('should render the current route title', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.componentRef.setInput('title', 'Systemverwaltung');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.app-toolbar__title')?.textContent).toContain(
      'Systemverwaltung',
    );
  });

  it('should show the global progress bar while data is loading', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeNull();

    isActive.set(true);
    isLoading.set(true);
    fixture.detectChanges();

    const progressBar = fixture.nativeElement.querySelector('mat-progress-bar');
    expect(progressBar).not.toBeNull();
    expect(progressBar?.getAttribute('aria-label')).toBe('Daten werden geladen');
  });

  it('should show the global progress bar while data is being written', () => {
    isActive.set(true);
    isWriting.set(true);
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();

    const progressBar = fixture.nativeElement.querySelector('mat-progress-bar');
    expect(progressBar).not.toBeNull();
    expect(progressBar?.getAttribute('aria-label')).toBe('Daten werden gespeichert');
  });

  it('should describe overlapping load and write operations', () => {
    isActive.set(true);
    isLoading.set(true);
    isWriting.set(true);
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('mat-progress-bar')?.getAttribute('aria-label'),
    ).toBe('Daten werden verarbeitet');
  });

  it('should render and toggle the theme mode', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const themeButton = compiled.querySelector<HTMLButtonElement>(
      '[aria-label="Theme umschalten"]',
    );

    expect(themeButton?.textContent).toContain('dark_mode');

    themeButton?.click();

    expect(themeServiceMock.toggleThemeMode).toHaveBeenCalledOnce();
  });

  it('should show the offline network state accessibly', () => {
    isOnline.set(false);
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();
    const status = fixture.nativeElement.querySelector('.app-toolbar__network-status');

    expect(status?.textContent).toContain('Offline');
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });

  it('should show when the network connection is restored', () => {
    wiederOnline.set(true);
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.app-toolbar__network-status')?.textContent,
    ).toContain('Wieder online');
  });

  it('should offer a fully downloaded application update without reloading automatically', () => {
    updateVerfuegbar.set(true);
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const updateStatus = compiled.querySelector('.app-toolbar__update-status');

    expect(updateStatus?.textContent).toContain('Neue Version verfügbar');
    expect(reloadAppMock).not.toHaveBeenCalled();

    updateStatus?.querySelector<HTMLButtonElement>('button')?.click();
    expect(reloadAppMock).toHaveBeenCalledOnce();
  });

  it('should explain an unrecoverable application state and offer a reload', () => {
    neuladenErforderlich.set(true);
    updateFehler.set('Die gespeicherte App-Version kann nicht weiterverwendet werden.');
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const updateStatus = compiled.querySelector('.app-toolbar__update-status');

    expect(updateStatus?.getAttribute('role')).toBe('alert');
    expect(updateStatus?.textContent).toContain(
      'Die gespeicherte App-Version kann nicht weiterverwendet werden.',
    );
    expect(updateStatus?.textContent).toContain('Neu laden');
  });

  it('should render the menu icon when the sidenav is closed', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(
      compiled.querySelector('[aria-label="Hauptnavigation umschalten"]')?.textContent,
    ).toContain('menu');
  });

  it('should hide the navigation toggle when navigation is not available', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.componentRef.setInput('navigationVisible', false);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[aria-label="Hauptnavigation umschalten"]')).toBeNull();
  });

  it('should render the product brand with its icon', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.componentRef.setInput('title', 'Pur Office');
    fixture.componentRef.setInput('brandVisible', true);
    fixture.componentRef.setInput('navigationVisible', false);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.app-toolbar__brand-icon')?.textContent).toContain('business');
    expect(compiled.querySelector('.app-toolbar__title--brand')?.textContent).toContain(
      'Pur Office',
    );
  });

  it('should render the back icon when the sidenav is open', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.componentRef.setInput('sidenavOpened', true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(
      compiled.querySelector('[aria-label="Hauptnavigation umschalten"]')?.textContent,
    ).toContain('arrow_back_ios');
  });

  it('should emit the navigation toggle event', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    const toolbar = fixture.componentInstance;
    const navigationToggleSpy = vi.fn();
    toolbar.navigationToggle.subscribe(navigationToggleSpy);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('[aria-label="Hauptnavigation umschalten"]')?.click();

    expect(navigationToggleSpy).toHaveBeenCalledOnce();
  });

  it('should logout through the store and navigate to login', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AppToolbar);

    await fixture.componentInstance.logout();

    expect(benutzerStoreMock.logout).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should hide the store snapshot action for unauthenticated users', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[aria-label="Store-Snapshots protokollieren"]')).toBeNull();
  });

  it('should log store snapshots for authenticated users in development mode', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.componentRef.setInput('isAuthenticated', true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled
      .querySelector<HTMLButtonElement>('[aria-label="Store-Snapshots protokollieren"]')
      ?.click();

    expect(storeSnapshotServiceMock.logStoreSnapshots).toHaveBeenCalledOnce();
  });
});
