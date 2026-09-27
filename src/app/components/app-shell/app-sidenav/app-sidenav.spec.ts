// pur-system/src/app/components/app-shell/app-sidenav/app-sidenav.spec.ts

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { APP_VERSION } from '../../../commons/constants/app-version.constant';
import { IBenutzerProfilDokument, TUserRole } from '../../../commons/models/domain/benutzer';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
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

  beforeEach(async () => {
    benutzerStoreMock = {
      benutzerProfil: vi.fn().mockReturnValue(createProfil('master')),
    };

    await TestBed.configureTestingModule({
      imports: [AppSidenavHost],
      providers: [
        provideRouter([
          { path: 'dashboard', component: AppSidenavHost },
          { path: 'schichtplan', component: AppSidenavHost },
          { path: 'mitarbeiter', component: AppSidenavHost },
          { path: 'verwaltung', component: AppSidenavHost },
          { path: 'systemverwaltung', component: AppSidenavHost },
          { path: 'passwort', component: AppSidenavHost },
        ]),
        { provide: BenutzerStore, useValue: benutzerStoreMock },
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

  it('should expand system administration and show both child routes for master', () => {
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
    expect(children?.textContent).toContain('Datenstruktur anlegen');
    expect(children?.textContent).toContain('Benutzerverwaltung');
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

  it('should hide administration from users without the master role', () => {
    benutzerStoreMock.benutzerProfil.mockReturnValue(createProfil('office'));
    const fixture = TestBed.createComponent(AppSidenavHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navigationText = compiled.querySelector('[aria-label="Hauptnavigation"]')?.textContent;

    expect(navigationText).toContain('Dashboard');
    expect(navigationText).toContain('Mitarbeiter');
    expect(navigationText).toContain('Verwaltung');
    expect(navigationText).not.toContain('Systemverwaltung');
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
