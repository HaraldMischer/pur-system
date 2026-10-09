// pur-system/src/app/pages/systemverwaltung/benutzer-anlegen-page/benutzer-anlegen-page.spec.ts

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BenutzerAnlage } from '../../../components/systemverwaltung/benutzer/benutzer-anlage/benutzer-anlage';
import { BenutzerVerwaltungStore } from '../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerAnlegenPage } from './benutzer-anlegen-page';

@Component({
  selector: 'app-benutzer-anlage',
  template: '',
})
class BenutzerAnlageStub {}

describe('BenutzerAnlegenPage', () => {
  const clearFeedback = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [BenutzerAnlegenPage],
      providers: [{ provide: BenutzerVerwaltungStore, useValue: { clearFeedback } }],
    })
      .overrideComponent(BenutzerAnlegenPage, {
        remove: { imports: [BenutzerAnlage] },
        add: { imports: [BenutzerAnlageStub] },
      })
      .compileComponents();
  });

  it('should show only the user creation component in the limited page layout', () => {
    const fixture = TestBed.createComponent(BenutzerAnlegenPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pur-page--limited')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-benutzer-anlage')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-benutzer-verwaltung')).toBeNull();
  });

  it('should clear feedback when leaving the page', () => {
    const fixture = TestBed.createComponent(BenutzerAnlegenPage);
    fixture.destroy();

    expect(clearFeedback).toHaveBeenCalledOnce();
  });
});
