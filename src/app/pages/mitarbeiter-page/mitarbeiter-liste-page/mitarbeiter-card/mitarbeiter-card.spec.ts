// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.spec.ts

import { TestBed } from '@angular/core/testing';

import { IMitarbeiterEintrag } from '../../../../commons/models/domain/mitarbeiter';
import { MitarbeiterCard } from './mitarbeiter-card';

describe('MitarbeiterCard', () => {
  const mitarbeiter: IMitarbeiterEintrag = {
    id: 'm-1',
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    person: {
      vorname: 'Mia',
      nachname: 'Muster',
      adresse: {
        strasse: 'Musterstraße',
        hausnummer: '1',
        postleitzahl: '12345',
        ort: 'Musterstadt',
      },
      kontakt: {},
    },
    rolle: 'service',
    filialIds: ['b-1', 'b-2'],
    aktiv: true,
  };

  it('should render the employee details', () => {
    const fixture = TestBed.createComponent(MitarbeiterCard);
    fixture.componentRef.setInput('mitarbeiter', mitarbeiter);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent;

    expect(text).toContain('Mia Muster');
    expect(text).toContain('Service');
    expect(text).toContain('2 Filialen zugeordnet');
    expect(text).toContain('Aktiv');
  });

  it('should identify an inactive employee without branches', () => {
    const fixture = TestBed.createComponent(MitarbeiterCard);
    fixture.componentRef.setInput('mitarbeiter', {
      ...mitarbeiter,
      filialIds: [],
      aktiv: false,
    });
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('mat-card');

    expect(card?.textContent).toContain('Noch keiner Filiale zugeordnet');
    expect(card?.textContent).toContain('Inaktiv');
    expect(card?.classList).toContain('pur-card--inaktiv');
  });

  it('should emit the employee when edit is selected', () => {
    const fixture = TestBed.createComponent(MitarbeiterCard);
    const bearbeitenSpy = vi.fn();
    fixture.componentRef.setInput('mitarbeiter', mitarbeiter);
    fixture.componentInstance.bearbeiten.subscribe(bearbeitenSpy);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.click();

    expect(bearbeitenSpy).toHaveBeenCalledWith(mitarbeiter);
  });
});
