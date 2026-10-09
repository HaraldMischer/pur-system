// pur-system/src/app/components/mitarbeiter/mitarbeiter-card/mitarbeiter-card.spec.ts

import { TestBed } from '@angular/core/testing';

import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
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
    rollen: ['servicekraft'],
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
    expect(card?.classList).toContain('pur-card--inaktiv');
  });

  it('should render the employee planner role', () => {
    const fixture = TestBed.createComponent(MitarbeiterCard);
    fixture.componentRef.setInput('mitarbeiter', {
      ...mitarbeiter,
      rollen: ['servicekraft', 'dienstplaner'],
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Servicekraft · Dienstplaner',
    );
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

  it('should emit merging when it is allowed', () => {
    const fixture = TestBed.createComponent(MitarbeiterCard);
    const zusammenfuehrenSpy = vi.fn();
    fixture.componentRef.setInput('mitarbeiter', mitarbeiter);
    fixture.componentRef.setInput('darfZusammenfuehren', true);
    fixture.componentInstance.zusammenfuehren.subscribe(zusammenfuehrenSpy);
    fixture.detectChanges();

    const mergeButton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (button) => button.textContent?.includes('Zusammenführen'),
    );
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Löschen');
    mergeButton?.click();

    expect(zusammenfuehrenSpy).toHaveBeenCalledWith(mitarbeiter);
  });
});
