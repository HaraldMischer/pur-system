// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-datenzuordnung/benutzer-datenzuordnung.spec.ts

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

  it('should initially show the stored assignment as disabled', () => {
    const fixture = createComponent();
    const selects = fixture.nativeElement.querySelectorAll('mat-select') as NodeListOf<HTMLElement>;

    expect(fixture.componentInstance.zuordnungBearbeiten()).toBe(false);
    expect(fixture.componentInstance.datenAuswahlGueltig()).toBe(true);
    expect(selects).toHaveLength(3);
    expect(
      Array.from(selects).every((select) => select.getAttribute('aria-disabled') === 'true'),
    ).toBe(true);
  });

  it('should enable editing and restore the stored assignment on cancel', () => {
    const component = createComponent().componentInstance;
    const aktionAktivChange = vi.fn();
    component.aktionAktivChange.subscribe(aktionAktivChange);

    component.startZuordnungBearbeiten();
    component.filialen.set({ [JSON.stringify(['u', 'f'])]: ['b-neu'] });
    expect(component.hatAenderungen()).toBe(true);

    component.cancelZuordnung();

    expect(component.filialen()).toEqual({ [JSON.stringify(['u', 'f'])]: ['b'] });
    expect(aktionAktivChange).toHaveBeenNthCalledWith(1, true);
    expect(aktionAktivChange).toHaveBeenNthCalledWith(2, false);
  });

  it('should emit a valid changed office assignment', () => {
    const component = createComponent().componentInstance;
    const zuordnungSpeichern = vi.fn();
    component.zuordnungSpeichern.subscribe(zuordnungSpeichern);
    component.startZuordnungBearbeiten();
    component.filialen.set({ [JSON.stringify(['u', 'f'])]: ['b-neu'] });

    component.saveZuordnung();

    expect(zuordnungSpeichern).toHaveBeenCalledWith({ zugriffe: { u: { f: ['b-neu'] } } });
  });

  it('should require exactly one branch for a branch account', () => {
    const component = createComponent({ ...profil, userRole: 'filiale' }).componentInstance;
    component.startZuordnungBearbeiten();
    component.filialen.set({ [JSON.stringify(['u', 'f'])]: ['b', 'b-neu'] });

    expect(component.datenAuswahlGueltig()).toBe(false);
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
