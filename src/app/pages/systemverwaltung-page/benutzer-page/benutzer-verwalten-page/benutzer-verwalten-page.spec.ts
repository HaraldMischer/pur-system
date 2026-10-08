// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwalten-page/benutzer-verwalten-page.spec.ts

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BenutzerVerwaltungStore } from '../../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerVerwaltung } from '../benutzer-verwaltung/benutzer-verwaltung';
import { BenutzerVerwaltenPage } from './benutzer-verwalten-page';

@Component({
  selector: 'app-benutzer-verwaltung',
  template: '',
})
class BenutzerVerwaltungStub {}

describe('BenutzerVerwaltenPage', () => {
  const clearFeedback = vi.fn();
  const selectBenutzer = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [BenutzerVerwaltenPage],
      providers: [
        {
          provide: BenutzerVerwaltungStore,
          useValue: { clearFeedback, selectBenutzer },
        },
      ],
    })
      .overrideComponent(BenutzerVerwaltenPage, {
        remove: { imports: [BenutzerVerwaltung] },
        add: { imports: [BenutzerVerwaltungStub] },
      })
      .compileComponents();
  });

  it('should show only the user management component in the limited page layout', () => {
    const fixture = TestBed.createComponent(BenutzerVerwaltenPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pur-page--limited')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-benutzer-verwaltung')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-benutzer-anlage')).toBeNull();
  });

  it('should clear the selection and feedback when leaving the page', () => {
    const fixture = TestBed.createComponent(BenutzerVerwaltenPage);
    fixture.destroy();

    expect(selectBenutzer).toHaveBeenCalledExactlyOnceWith(null);
    expect(clearFeedback).toHaveBeenCalledOnce();
  });
});
