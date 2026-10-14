// pur-system/src/app/pages/dashboard-page/dashboard-page.spec.ts

import { TestBed } from '@angular/core/testing';

import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
    }).compileComponents();
  });

  it('should create the page', () => {
    const fixture = TestBed.createComponent(DashboardPage);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the page content without a duplicate route title', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('section')?.classList.contains('pur-page')).toBe(true);
    expect(compiled.querySelector('div')?.classList.contains('pur-page-section')).toBe(true);
    expect(compiled.querySelector('p')?.classList.contains('pur-text')).toBe(true);
    expect(compiled.querySelector('h1')).toBeNull();
    expect(compiled.textContent).toContain('Noch zu bestimmende Daten der einzelnen Filialen.');
  });

  it('should render the tertiary preview action', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;

    expect(button).not.toBeNull();
    expect(button?.type).toBe('button');
    expect(button?.classList.contains('pur-button--tertiary')).toBe(true);
  });
});
