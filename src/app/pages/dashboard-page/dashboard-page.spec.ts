// pur-system/src/app/pages/dashboard-page/dashboard-page.spec.ts

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the page', () => {
    const fixture = TestBed.createComponent(DashboardPage);

    expect(fixture.componentInstance).toBeTruthy();
  });
});
