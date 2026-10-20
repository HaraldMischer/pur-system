// pur-system/src/app/components/app-shell/app-toolbar/app-toolbar.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoadingService } from '../../../services/core/loading.service';
import { NetzwerkStatusService } from '../../../services/core/netzwerk-status.service';
import { PwaUpdateService } from '../../../services/core/pwa-update.service';
import { StoreSnapshotService } from '../../../services/core/store-snapshot.service';
import { ThemeService, TThemeFarbschema } from '../../../services/core/theme.service';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { AppToolbar } from './app-toolbar';

describe('AppToolbar', () => {
  let benutzerStoreMock: {
    logout: ReturnType<typeof vi.fn>;
  };
  let themeServiceMock: {
    farbschemata: readonly { value: TThemeFarbschema; label: string }[];
    selectedFarbschema: ReturnType<typeof signal<TThemeFarbschema>>;
    setFarbschema: ReturnType<typeof vi.fn>;
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
      farbschemata: [
        { value: 'cyan-orange', label: 'Cyan & Orange' },
        { value: 'azure-blue', label: 'Azure & Blue' },
      ],
      selectedFarbschema: signal<TThemeFarbschema>('cyan-orange'),
      setFarbschema: vi.fn(),
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

  it('should show the global progress bar while data is loading', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeNull();

    isActive.set(true);
    isLoading.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-bar')).not.toBeNull();
  });

  it('should show the global progress bar while data is being written', () => {
    isActive.set(true);
    isWriting.set(true);
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-bar')).not.toBeNull();
  });

  it('should derive the progress state for overlapping load and write operations', () => {
    isActive.set(true);
    isLoading.set(true);
    isWriting.set(true);
    const component = TestBed.createComponent(AppToolbar).componentInstance;

    expect(component.progressLabel()).toBe('Daten werden verarbeitet');
  });

  it('should render and toggle the theme mode', () => {
    const component = TestBed.createComponent(AppToolbar).componentInstance;

    component.toggleThemeMode();

    expect(themeServiceMock.toggleThemeMode).toHaveBeenCalledOnce();
  });

  it('should select a color scheme', () => {
    const component = TestBed.createComponent(AppToolbar).componentInstance;

    component.setFarbschema('azure-blue');

    expect(themeServiceMock.setFarbschema).toHaveBeenCalledWith('azure-blue');
  });

  it('should show the offline network state', () => {
    isOnline.set(false);
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Offline');
  });

  it('should show when the network connection is restored', () => {
    wiederOnline.set(true);
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Wieder online');
  });

  it('should offer a fully downloaded application update without reloading automatically', () => {
    updateVerfuegbar.set(true);
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Neue Version verfügbar');
    expect(reloadAppMock).not.toHaveBeenCalled();

    [...compiled.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Jetzt aktualisieren'))
      ?.click();
    expect(reloadAppMock).toHaveBeenCalledOnce();
  });

  it('should explain an unrecoverable application state and offer a reload', () => {
    neuladenErforderlich.set(true);
    updateFehler.set('Die gespeicherte App-Version kann nicht weiterverwendet werden.');
    const fixture = TestBed.createComponent(AppToolbar);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain(
      'Die gespeicherte App-Version kann nicht weiterverwendet werden.',
    );
    expect(compiled.textContent).toContain('Neu laden');
  });

  it('should emit the navigation toggle event', () => {
    const fixture = TestBed.createComponent(AppToolbar);
    const toolbar = fixture.componentInstance;
    const navigationToggleSpy = vi.fn();
    toolbar.navigationToggle.subscribe(navigationToggleSpy);
    fixture.detectChanges();
    fixture.componentInstance.navigationToggle.emit();

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

  it('should log store snapshots', () => {
    const component = TestBed.createComponent(AppToolbar).componentInstance;

    component.logStoreSnapshots();

    expect(storeSnapshotServiceMock.logStoreSnapshots).toHaveBeenCalledOnce();
  });
});
