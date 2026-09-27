// pur-system/src/app/pages/schichtplan-page/schichtplan-page.spec.ts

import { TestBed } from '@angular/core/testing';

import { SchichtplanPage } from './schichtplan-page';

describe('SchichtplanPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchichtplanPage],
    }).compileComponents();
  });

  it('should create the page', () => {
    const fixture = TestBed.createComponent(SchichtplanPage);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the page content without a duplicate route title', () => {
    const fixture = TestBed.createComponent(SchichtplanPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')).toBeNull();
    expect(compiled.textContent).toContain('Schichtpläne der Filialen.');
  });
});
