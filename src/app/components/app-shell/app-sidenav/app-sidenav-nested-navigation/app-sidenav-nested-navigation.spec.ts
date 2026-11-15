// pur-system/src/app/components/app-shell/app-sidenav/app-sidenav-nested-navigation/app-sidenav-nested-navigation.spec.ts

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTree } from '@angular/material/tree';
import { By } from '@angular/platform-browser';
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
    id: 'system',
    label: 'System',
    icon: 'admin_panel_settings',
    kinder: [
      {
        typ: 'link',
        id: 'benutzeranlage',
        label: 'Benutzer anlegen',
        icon: 'person_add',
        route: '/system/benutzer/anlegen',
        bereich: 'system',
      },
      {
        typ: 'link',
        id: 'benutzerverwaltung',
        label: 'Benutzer verwalten',
        icon: 'manage_accounts',
        route: '/system/benutzer/verwalten',
        bereich: 'system',
      },
      {
        typ: 'link',
        id: 'strukturanlage',
        label: 'Struktur anlegen',
        icon: 'account_tree',
        route: '/system/struktur/anlegen',
        bereich: 'system',
      },
      {
        typ: 'link',
        id: 'strukturverwaltung',
        label: 'Struktur verwalten',
        icon: 'edit_note',
        route: '/system/struktur/bearbeiten',
        bereich: 'system',
      },
    ],
  },
  {
    typ: 'gruppe',
    id: 'mitarbeiter',
    label: 'Mitarbeiter',
    icon: 'groups',
    kinder: [
      {
        typ: 'link',
        id: 'mitarbeiterliste',
        label: 'Mitarbeiterliste',
        icon: 'badge',
        route: '/mitarbeiter/liste',
        bereich: 'mitarbeiter',
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
          { path: 'system/struktur/anlegen', component: TestRouteComponent },
          { path: 'system/struktur/bearbeiten', component: TestRouteComponent },
          { path: 'system/benutzer/anlegen', component: TestRouteComponent },
          { path: 'system/benutzer/verwalten', component: TestRouteComponent },
          { path: 'mitarbeiter/liste', component: TestRouteComponent },
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
      'System',
    );
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

  it('should close an expanded group when another group is opened', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tree = fixture.debugElement.query(By.directive(MatTree))
      .componentInstance as MatTree<TNavigationEintrag, string>;
    const system = EINTRAEGE.find((eintrag) => eintrag.id === 'system');
    const mitarbeiter = EINTRAEGE.find((eintrag) => eintrag.id === 'mitarbeiter');
    const gruppenButtons = [
      ...compiled.querySelectorAll<HTMLButtonElement>('button[mat-list-item]'),
    ];

    gruppenButtons.find((button) => button.textContent?.includes('System'))?.click();
    fixture.detectChanges();
    gruppenButtons.find((button) => button.textContent?.includes('Mitarbeiter'))?.click();
    fixture.detectChanges();

    expect(system && tree.isExpanded(system)).toBe(false);
    expect(mitarbeiter && tree.isExpanded(mitarbeiter)).toBe(true);
  });

  it('should keep only the group of the active route expanded after navigation', async () => {
    const router = TestBed.inject(Router);
    const tree = fixture.debugElement.query(By.directive(MatTree))
      .componentInstance as MatTree<TNavigationEintrag, string>;
    const system = EINTRAEGE.find((eintrag) => eintrag.id === 'system');
    const mitarbeiter = EINTRAEGE.find((eintrag) => eintrag.id === 'mitarbeiter');

    await router.navigateByUrl('/system/benutzer/verwalten');
    fixture.detectChanges();
    await fixture.whenStable();
    await router.navigateByUrl('/mitarbeiter/liste');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(system && tree.isExpanded(system)).toBe(false);
    expect(mitarbeiter && tree.isExpanded(mitarbeiter)).toBe(true);
  });

  it('should keep the active route while another group is opened manually', async () => {
    const router = TestBed.inject(Router);
    const compiled = fixture.nativeElement as HTMLElement;
    const tree = fixture.debugElement.query(By.directive(MatTree))
      .componentInstance as MatTree<TNavigationEintrag, string>;
    const system = EINTRAEGE.find((eintrag) => eintrag.id === 'system');
    const mitarbeiter = EINTRAEGE.find((eintrag) => eintrag.id === 'mitarbeiter');

    await router.navigateByUrl('/system/benutzer/verwalten');
    fixture.detectChanges();
    await fixture.whenStable();
    const mitarbeiterButton = [
      ...compiled.querySelectorAll<HTMLButtonElement>('button[mat-list-item]'),
    ].find((button) => button.textContent?.includes('Mitarbeiter'));

    mitarbeiterButton?.click();
    fixture.detectChanges();

    expect(router.url).toBe('/system/benutzer/verwalten');
    expect(system && tree.isExpanded(system)).toBe(false);
    expect(mitarbeiter && tree.isExpanded(mitarbeiter)).toBe(true);
  });

  it.each([
    ['/system/benutzer/anlegen', 'Benutzer anlegen'],
    ['/system/benutzer/verwalten', 'Benutzer verwalten'],
    ['/system/struktur/anlegen', 'Struktur anlegen'],
    ['/system/struktur/bearbeiten', 'Struktur verwalten'],
  ])('should expand the group for the active child route %s', async (route, label) => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl(route);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(label);
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
