// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-datenzuordnung-dialog/benutzer-datenzuordnung/benutzer-datenzuordnung.spec.ts

import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IBenutzerProfilEintrag } from '../../../../../../commons/models/domain/benutzer';
import { IUnternehmerAuswahl } from '../../../../../../commons/models/domain/datenzugriff';
import { BenutzerVerwaltungService } from '../../../../../../services/firebase/benutzer-verwaltung.service';
import { MitarbeiterStore } from '../../../../../../stores/domain/mitarbeiter.store';
import { BenutzerMitarbeiterzuordnung } from '../benutzer-mitarbeiterzuordnung/benutzer-mitarbeiterzuordnung';
import { BenutzerDatenzuordnung } from './benutzer-datenzuordnung';

describe('BenutzerDatenzuordnung', () => {
  const profil: IBenutzerProfilEintrag = {
    uid: 'office-1',
    email: 'office@example.com',
    anzeigename: 'Office',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard'],
    zugriffe: { u: { f: ['b'] } },
  };
  const unternehmer: readonly IUnternehmerAuswahl[] = [
    {
      id: 'u',
      anzeigename: 'Unternehmer',
      firmen: [
        {
          id: 'f',
          anzeigename: 'Firma',
          filialen: [
            { id: 'b', anzeigename: 'Filiale' },
            { id: 'b-neu', anzeigename: 'Filiale Neu' },
          ],
        },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BenutzerDatenzuordnung, NoopAnimationsModule],
      providers: [
        {
          provide: BenutzerVerwaltungService,
          useValue: { loadMitarbeiterAuswahl: vi.fn().mockResolvedValue([]) },
        },
        { provide: MitarbeiterStore, useValue: { getMitarbeiter: vi.fn().mockReturnValue([]) } },
      ],
    }).compileComponents();
  });

  function createComponent(benutzerProfil: IBenutzerProfilEintrag = profil) {
    const fixture = TestBed.createComponent(BenutzerDatenzuordnung);
    fixture.componentRef.setInput('profil', benutzerProfil);
    fixture.componentRef.setInput('unternehmer', unternehmer);
    fixture.detectChanges();
    return fixture;
  }

  it('should immediately show the selector with the stored assignment', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(fixture.nativeElement.querySelector('app-datenzugriff-selector')).not.toBeNull();
    expect(component.unternehmerIds()).toEqual(['u']);
    expect(component.firmaIds()).toEqual([JSON.stringify(['u', 'f'])]);
    expect(component.filialen()).toEqual({ [JSON.stringify(['u', 'f'])]: ['b'] });
    expect(component.datenAuswahlGueltig()).toBe(true);
    expect(component.hatAenderungen()).toBe(false);
    expect(component.speichernDeaktiviert()).toBe(true);
  });

  it('should emit a valid changed office assignment', () => {
    const component = createComponent().componentInstance;
    const zuordnungSpeichern = vi.fn();
    component.zuordnungSpeichern.subscribe(zuordnungSpeichern);
    component.filialen.set({ [JSON.stringify(['u', 'f'])]: ['b-neu'] });

    component.saveZuordnung();

    expect(zuordnungSpeichern).toHaveBeenCalledWith({ zugriffe: { u: { f: ['b-neu'] } } });
  });

  it('should disable assignment actions and reject saves while saving', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const zuordnungSpeichern = vi.fn();
    component.zuordnungSpeichern.subscribe(zuordnungSpeichern);
    component.filialen.set({ [JSON.stringify(['u', 'f'])]: ['b-neu'] });
    fixture.componentRef.setInput('inProgress', true);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;

    component.saveZuordnung();

    expect(Array.from(buttons).every((button) => button.disabled)).toBe(true);
    expect(zuordnungSpeichern).not.toHaveBeenCalled();
  });

  it('should require exactly one branch for a branch account', () => {
    const component = createComponent({ ...profil, userRole: 'filiale' }).componentInstance;
    component.filialen.set({ [JSON.stringify(['u', 'f'])]: ['b', 'b-neu'] });

    expect(component.datenAuswahlGueltig()).toBe(false);
  });

  it('should identify stored references that are no longer available', () => {
    const fixture = createComponent({
      ...profil,
      zugriffe: { 'u-fehlt': { 'f-fehlt': ['b-fehlt'] } },
    });
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;

    expect(alert.textContent?.replace(/\s+/g, ' ').trim()).toContain(
      'Unternehmer-ID: u-fehlt, Firmen-ID: f-fehlt, Filial-ID: b-fehlt',
    );
  });

  it('should encapsulate and forward the employee assignment', () => {
    const fixture = createComponent({
      ...profil,
      uid: 'mitarbeiter-1',
      userRole: 'mitarbeiter',
      zugriffe: { u: { f: [] } },
      firmaMitarbeiterId: 'm-1',
    });
    const mitarbeiterZuordnungSpeichern = vi.fn();
    fixture.componentInstance.mitarbeiterZuordnungSpeichern.subscribe(
      mitarbeiterZuordnungSpeichern,
    );
    const mitarbeiterZuordnung = fixture.debugElement.query(
      By.directive(BenutzerMitarbeiterzuordnung),
    ).componentInstance as BenutzerMitarbeiterzuordnung;

    mitarbeiterZuordnung.zuordnungSpeichern.emit({
      unternehmerId: 'u',
      firmaId: 'f',
      firmaMitarbeiterId: 'm-2',
    });

    expect(mitarbeiterZuordnungSpeichern).toHaveBeenCalledWith({
      unternehmerId: 'u',
      firmaId: 'f',
      firmaMitarbeiterId: 'm-2',
    });
    expect(fixture.nativeElement.querySelector('app-datenzugriff-selector')).toBeNull();
  });
});
