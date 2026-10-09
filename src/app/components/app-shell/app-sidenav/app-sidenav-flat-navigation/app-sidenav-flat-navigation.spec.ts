// pur-system/src/app/components/app-shell/app-sidenav/app-sidenav-flat-navigation/app-sidenav-flat-navigation.spec.ts

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

import { INavigationLink } from '../../../../commons/models/app/navigation';
import { AppSidenavFlatNavigation } from './app-sidenav-flat-navigation';

@Component({
  template: '',
})
class TestRouteComponent {}

const EINTRAEGE: readonly INavigationLink[] = [
  {
    typ: 'link',
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    route: '/dashboard',
    bereich: 'dashboard',
  },
  {
    typ: 'link',
    id: 'dienstplanansicht',
    label: 'Dienstplan ansehen',
    icon: 'visibility',
    route: '/schichtplan/ansicht',
    bereich: 'schichtplan',
  },
];

describe('AppSidenavFlatNavigation', () => {
  let fixture: ComponentFixture<AppSidenavFlatNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidenavFlatNavigation],
      providers: [
        provideRouter([
          { path: 'dashboard', component: TestRouteComponent },
          {
            path: 'schichtplan',
            children: [{ path: 'ansicht', component: TestRouteComponent }],
          },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSidenavFlatNavigation);
    fixture.componentRef.setInput('eintraege', EINTRAEGE);
    fixture.detectChanges();
  });

  it('should render every configured navigation link with label and icon', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = [...compiled.querySelectorAll<HTMLAnchorElement>('a[mat-list-item]')];

    expect(links).toHaveLength(2);
    expect(links[0].textContent).toContain('dashboard');
    expect(links[0].textContent).toContain('Dashboard');
    expect(links[1].textContent).toContain('visibility');
    expect(links[1].textContent).toContain('Dienstplan ansehen');
  });

  it('should emit the navigation selection when a link is selected', () => {
    const navigationSelectedSpy = vi.fn();
    fixture.componentInstance.navigationSelected.subscribe(navigationSelectedSpy);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[mat-list-item]',
    );

    link?.click();

    expect(navigationSelectedSpy).toHaveBeenCalledOnce();
  });

  it('should mark the link of the active route', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/schichtplan/ansicht');
    fixture.detectChanges();
    await fixture.whenStable();
    const activeLink = (fixture.nativeElement as HTMLElement).querySelector('.active-nav-item');

    expect(activeLink?.textContent).toContain('Dienstplan ansehen');
  });
});
