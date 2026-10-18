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

  it('should render all global message variants', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.pur-message--info')).not.toBeNull();
    expect(compiled.querySelector('.pur-message--success')).not.toBeNull();
    expect(compiled.querySelector('.pur-message--warning')).not.toBeNull();
    expect(compiled.querySelector('.pur-message--error')).not.toBeNull();
  });

  it('should render the global message width variants', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.pur-message--full')).not.toBeNull();
    expect(compiled.querySelector('.pur-message--auto')).not.toBeNull();
  });

  it('should render the global message appearance variants', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.pur-message--surface')).not.toBeNull();
    expect(compiled.querySelector('.pur-message--surface.pur-message--dashed')).not.toBeNull();
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
