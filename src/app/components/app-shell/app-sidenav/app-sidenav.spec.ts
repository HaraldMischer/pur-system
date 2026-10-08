// pur-system/src/app/components/app-shell/app-sidenav/app-sidenav.spec.ts

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { APP_VERSION } from '../../../commons/constants/app.constants';
import { TFilialKontext } from '../../../commons/models/app/app-kontext.types';
import { IBenutzerProfilDokument, TUserRole } from '../../../commons/models/domain/benutzer';
import { IFirmaEintrag } from '../../../commons/models/domain/firma';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IUnternehmerEintrag } from '../../../commons/models/domain/unternehmer';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { StammdatenStore } from '../../../stores/app/stammdaten.store';
import { AppKontextSelector } from '../../data-selectors/app-kontext-selector/app-kontext-selector';
import { AppSidenav } from './app-sidenav';

function createProfil(userRole: TUserRole): IBenutzerProfilDokument {
  return {
    email: 'test@example.com',
    anmeldename: `test-${userRole}`,
    anzeigename: 'Test',
    aktiv: true,
    userRole,
    erlaubteBereiche: ['dashboard', 'schichtplan', 'mitarbeiter', 'verwaltung', 'systemverwaltung'],
    zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
  };
}

@Component({
  imports: [AppSidenav],
  template: '<app-sidenav [isHandset]="isHandset" />',
})
class AppSidenavHost {
  isHandset = false;
}

describe('AppSidenav', () => {
  let benutzerStoreMock: {
    benutzerProfil: ReturnType<typeof vi.fn>;
  };
  const unternehmer = signal<readonly IUnternehmerEintrag[]>([]);
  const stammdatenDownload = signal(false);
  const selectedUnternehmer = signal<IUnternehmerEintrag | null>(null);
  const firmen = signal<readonly IFirmaEintrag[]>([]);
  const selectedFirma = signal<IFirmaEintrag | null>(null);
  const filialen = signal<readonly IFilialeEintrag[]>([]);
  const filialKontext = signal<TFilialKontext>(null);
  const appKontextStoreMock = {
    selectedUnternehmer,
    firmen,
    selectedFirma,
    filialen,
    filialKontext,
    selectUnternehmer: vi.fn(),
    selectFirma: vi.fn(),
    selectFilialKontext: vi.fn(),
  };
  const stammdatenStoreMock = {
    unternehmer,
    download: stammdatenDownload,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    unternehmer.set([]);
    stammdatenDownload.set(false);
    selectedUnternehmer.set(null);
    firmen.set([]);
    selectedFirma.set(null);
    filialen.set([]);
    filialKontext.set(null);
    benutzerStoreMock = {
      benutzerProfil: vi.fn().mockReturnValue(createProfil('master')),
    };

    await TestBed.configureTestingModule({
      imports: [AppSidenavHost],
      providers: [
        provideRouter([
          { path: 'dashboard', component: AppSidenavHost, data: { bereich: 'dashboard' } },
          { path: 'schichtplan', component: AppSidenavHost, data: { bereich: 'schichtplan' } },
          { path: 'mitarbeiter', component: AppSidenavHost, data: { bereich: 'mitarbeiter' } },
          { path: 'verwaltung', component: AppSidenavHost, data: { bereich: 'verwaltung' } },
          {
            path: 'systemverwaltung',
            component: AppSidenavHost,
            data: { bereich: 'systemverwaltung' },
          },
          { path: 'passwort', component: AppSidenavHost },
        ]),
        { provide: AppKontextStore, useValue: appKontextStoreMock },
        { provide: BenutzerStore, useValue: benutzerStoreMock },
        { provide: StammdatenStore, useValue: stammdatenStoreMock },
      ],
    }).compileComponents();
  });

  it('should render the configured product title', () => {
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.app-brand-toolbar')?.textContent).toContain('Pur-System');
  });

  it('should render the application version from the central application constant', () => {
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.app-sidenav__version')?.textContent).toBe(`v${APP_VERSION}`);
  });

  it('should show the account name and login name', () => {
    benutzerStoreMock.benutzerProfil.mockReturnValue({
      ...createProfil('master'),
      anmeldename: 'pur-system-master',
      anzeigename: 'Pur System Master',
    });
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('.pur-card--user');

    expect(card?.textContent).toContain('Pur System Master');
    expect(card?.querySelector('small')?.textContent).toBe('pur-system-master');
    expect(card?.textContent).not.toContain('pur-system-master@example.com');
  });

  it('should show the fallback without a profile', () => {
    benutzerStoreMock.benutzerProfil.mockReturnValue(null);
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('.pur-card--user');

    expect(card?.textContent).toContain('Nicht angemeldet');
    expect(card?.querySelector('small')).toBeNull();
    expect(compiled.querySelector('app-sidenav-flat-navigation')).toBeNull();
    expect(compiled.querySelector('app-sidenav-nested-navigation')).toBeNull();
  });

  it('should render the allowed main navigation', () => {
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navigationText = compiled.querySelector('[aria-label="Hauptnavigation"]')?.textContent;

    expect(navigationText).toContain('Dashboard');
    expect(navigationText).toContain('Schichtplan');
    expect(navigationText).toContain('Mitarbeiter');
    expect(navigationText).toContain('Verwaltung');
    expect(navigationText).toContain('Systemverwaltung');
  });

  it('should render the app context selector for a master', async () => {
    await TestBed.inject(Router).navigateByUrl('/dashboard');
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-kontext-selector')).not.toBeNull();
  });

  it('should configure the branch selector by active area for a master', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    let selector = fixture.debugElement.query(
      (debugElement) => debugElement.componentInstance instanceof AppKontextSelector,
    ).componentInstance as AppKontextSelector;

    expect(selector.konfiguration().filiale).toBe('hidden');

    await router.navigateByUrl('/mitarbeiter');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    selector = fixture.debugElement.query(
      (debugElement) => debugElement.componentInstance instanceof AppKontextSelector,
    ).componentInstance as AppKontextSelector;

    expect(selector.konfiguration().filiale).toBe('editable');
  });

  it('should expand system administration and show all child routes for master', () => {
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('button[mat-list-item]'),
    ).find((button) => button.textContent?.includes('Systemverwaltung'));
    const children = toggle?.parentElement?.querySelector(
      '.app-sidenav-nested-navigation__children',
    );

    expect(toggle?.textContent).toContain('Systemverwaltung');
    expect(toggle?.getAttribute('aria-label')).toBe('Systemverwaltung ausklappen');
    expect(children?.classList).toContain('app-sidenav-nested-navigation__children--hidden');

    toggle?.click();
    fixture.detectChanges();

    expect(toggle?.getAttribute('aria-label')).toBe('Systemverwaltung einklappen');
    expect(children?.classList).not.toContain('app-sidenav-nested-navigation__children--hidden');
    expect(children?.textContent).toContain('Benutzer anlegen');
    expect(children?.textContent).toContain('Benutzer verwalten');
    expect(children?.textContent).toContain('Datenstruktur');
    expect(children?.textContent).toContain('Datenmigration');
  });

  it('should hide navigation entries without permission', () => {
    benutzerStoreMock.benutzerProfil.mockReturnValue({
      ...createProfil('master'),
      erlaubteBereiche: ['dashboard'],
    });
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navigationText = compiled.querySelector('[aria-label="Hauptnavigation"]')?.textContent;

    expect(navigationText).toContain('Dashboard');
    expect(navigationText).not.toContain('Schichtplan');
    expect(navigationText).not.toContain('Mitarbeiter');
    expect(navigationText).not.toContain('Verwaltung');
  });

  it('should hide administration and open context selectors from non-master users', async () => {
    benutzerStoreMock.benutzerProfil.mockReturnValue(createProfil('office'));
    await TestBed.inject(Router).navigateByUrl('/dashboard');
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navigationText = compiled.querySelector('[aria-label="Hauptnavigation"]')?.textContent;

    expect(navigationText).toContain('Dashboard');
    expect(navigationText).toContain('Mitarbeiter');
    expect(navigationText).toContain('Verwaltung');
    expect(navigationText).not.toContain('Systemverwaltung');
    expect(compiled.querySelector('app-kontext-selector')).toBeNull();
  });

  it.each([
    ['master', 'app-sidenav-nested-navigation'],
    ['office', 'app-sidenav-nested-navigation'],
    ['filiale', 'app-sidenav-nested-navigation'],
    ['mitarbeiter', 'app-sidenav-flat-navigation'],
  ] as const)('should use the configured navigation renderer for %s', (userRole, selector) => {
    benutzerStoreMock.benutzerProfil.mockReturnValue(createProfil(userRole));
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector(selector)).not.toBeNull();
  });

  it('should emit a navigation selection on handset', () => {
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.componentInstance.isHandset = true;
    fixture.detectChanges();
    const sidenav = fixture.debugElement.children[0].componentInstance as AppSidenav;
    const navigationSelectedSpy = vi.fn();
    sidenav.navigationSelected.subscribe(navigationSelectedSpy);
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLAnchorElement>('a[mat-list-item]')?.click();

    expect(navigationSelectedSpy).toHaveBeenCalledOnce();
  });
});
