// pur-system/src/app/components/app-shell/app-sidenav/app-sidenav-nested-navigation/app-sidenav-nested-navigation.spec.ts

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { TNavigationEintrag } from '../../../../commons/models/app/navigation';
import { AppSidenavNestedNavigation } from './app-sidenav-nested-navigation';

@Component({
  template: '',
})
class TestRouteComponent {}

const EINTRAEGE: readonly TNavigationEintrag[] = [
  {
    typ: 'link',
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    route: '/dashboard',
    bereich: 'dashboard',
  },
  {
    typ: 'gruppe',
    id: 'systemverwaltung',
    label: 'Systemverwaltung',
    icon: 'admin_panel_settings',
    kinder: [
      {
        typ: 'link',
        id: 'benutzeranlage',
        label: 'Benutzer anlegen',
        icon: 'person_add',
        route: '/systemverwaltung/benutzer/anlegen',
        bereich: 'systemverwaltung',
      },
      {
        typ: 'link',
        id: 'benutzerverwaltung',
        label: 'Benutzer verwalten',
        icon: 'manage_accounts',
        route: '/systemverwaltung/benutzer/verwalten',
        bereich: 'systemverwaltung',
      },
      {
        typ: 'link',
        id: 'datenstruktur',
        label: 'Datenstruktur',
        icon: 'account_tree',
        route: '/systemverwaltung/datenstruktur',
        bereich: 'systemverwaltung',
      },
    ],
  },
];

describe('AppSidenavNestedNavigation', () => {
  let fixture: ComponentFixture<AppSidenavNestedNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidenavNestedNavigation],
      providers: [
        provideRouter([
          { path: 'dashboard', component: TestRouteComponent },
          { path: 'systemverwaltung/datenstruktur', component: TestRouteComponent },
          { path: 'systemverwaltung/benutzer/anlegen', component: TestRouteComponent },
          { path: 'systemverwaltung/benutzer/verwalten', component: TestRouteComponent },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSidenavNestedNavigation);
    fixture.componentRef.setInput('eintraege', EINTRAEGE);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render direct links and expandable groups', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('a[mat-list-item]')?.textContent).toContain('Dashboard');
    expect(compiled.querySelector('button[mat-list-item]')?.textContent).toContain(
      'Systemverwaltung',
    );
  });

  it('should expand and collapse a group without emitting a navigation selection', () => {
    const navigationSelectedSpy = vi.fn();
    fixture.componentInstance.navigationSelected.subscribe(navigationSelectedSpy);
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector<HTMLButtonElement>('button[mat-list-item]');
    const children = compiled.querySelector('.app-sidenav-nested-navigation__children');

    expect(children?.classList).toContain('app-sidenav-nested-navigation__children--hidden');

    toggle?.click();
    fixture.detectChanges();

    expect(children?.classList).not.toContain('app-sidenav-nested-navigation__children--hidden');
    expect(navigationSelectedSpy).not.toHaveBeenCalled();

    toggle?.click();
    fixture.detectChanges();

    expect(children?.classList).toContain('app-sidenav-nested-navigation__children--hidden');
    expect(navigationSelectedSpy).not.toHaveBeenCalled();
  });

  it('should emit the navigation selection when a child link is selected', () => {
    const navigationSelectedSpy = vi.fn();
    fixture.componentInstance.navigationSelected.subscribe(navigationSelectedSpy);
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button[mat-list-item]')?.click();
    fixture.detectChanges();
    const childLink = [...compiled.querySelectorAll<HTMLAnchorElement>('a[mat-list-item]')].find(
      (link) => link.textContent?.includes('Benutzer verwalten'),
    );

    childLink?.click();

    expect(navigationSelectedSpy).toHaveBeenCalledOnce();
  });

  it.each([
    ['/systemverwaltung/benutzer/anlegen', 'Benutzer anlegen'],
    ['/systemverwaltung/benutzer/verwalten', 'Benutzer verwalten'],
  ])('should expand the group for the active child route %s', async (route, label) => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl(route);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const children = compiled.querySelector('.app-sidenav-nested-navigation__children');
    const activeLink = compiled.querySelector('.active-nav-item');

    expect(children?.classList).not.toContain('app-sidenav-nested-navigation__children--hidden');
    expect(activeLink?.textContent).toContain(label);
  });

  it('should omit groups without visible children', () => {
    fixture.componentRef.setInput('eintraege', [
      ...EINTRAEGE,
      {
        typ: 'gruppe',
        id: 'leer',
        label: 'Leere Gruppe',
        icon: 'folder',
        kinder: [],
      },
    ] satisfies readonly TNavigationEintrag[]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).not.toContain('Leere Gruppe');
  });
});
