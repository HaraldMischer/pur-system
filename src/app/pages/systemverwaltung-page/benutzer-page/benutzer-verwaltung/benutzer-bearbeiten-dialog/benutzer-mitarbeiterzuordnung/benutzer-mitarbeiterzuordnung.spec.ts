// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-mitarbeiterzuordnung/benutzer-mitarbeiterzuordnung.spec.ts

import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IBenutzerProfilEintrag } from '../../../../../../commons/models/domain/benutzer';
import { IUnternehmerAuswahl } from '../../../../../../commons/models/domain/datenzugriff';
import { BenutzerVerwaltungService } from '../../../../../../services/firebase/benutzer-verwaltung.service';
import { MitarbeiterStore } from '../../../../../../stores/domain/mitarbeiter.store';
import { BenutzerMitarbeiterzuordnung } from './benutzer-mitarbeiterzuordnung';

describe('BenutzerMitarbeiterzuordnung', () => {
  const profil: IBenutzerProfilEintrag = {
    uid: 'mitarbeiter-1',
    anmeldename: 'mitarbeiter-user',
    email: 'mitarbeiter@example.com',
    anzeigename: 'Mitarbeiter Benutzer',
    aktiv: true,
    userRole: 'mitarbeiter',
    erlaubteBereiche: ['dashboard'],
    zugriffe: { u: { f: [] } },
    firmaMitarbeiterId: 'm-1',
  };
  const unternehmer: readonly IUnternehmerAuswahl[] = [
    {
      id: 'u',
      anzeigename: 'Unternehmer',
      firmen: [{ id: 'f', anzeigename: 'Firma', filialen: [] }],
    },
  ];
  const loadMitarbeiterAuswahlMock = vi
    .fn()
    .mockResolvedValue([{ id: 'm-2', anzeigename: 'Neu, Nina' }]);
  const mitarbeiterStoreMock = {
    getMitarbeiter: vi.fn().mockReturnValue([
      {
        id: 'm-1',
        unternehmerId: 'u',
        firmaId: 'f',
        person: { vorname: 'Mia', nachname: 'Muster' },
        rollen: ['servicekraft'],
        filialIds: [],
        aktiv: true,
      },
    ]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    loadMitarbeiterAuswahlMock.mockResolvedValue([{ id: 'm-2', anzeigename: 'Neu, Nina' }]);
    mitarbeiterStoreMock.getMitarbeiter.mockReturnValue([
      {
        id: 'm-1',
        unternehmerId: 'u',
        firmaId: 'f',
        person: { vorname: 'Mia', nachname: 'Muster' },
        rollen: ['servicekraft'],
        filialIds: [],
        aktiv: true,
      },
    ]);

    await TestBed.configureTestingModule({
      imports: [BenutzerMitarbeiterzuordnung, NoopAnimationsModule],
      providers: [
        {
          provide: BenutzerVerwaltungService,
          useValue: { loadMitarbeiterAuswahl: loadMitarbeiterAuswahlMock },
        },
        { provide: MitarbeiterStore, useValue: mitarbeiterStoreMock },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(BenutzerMitarbeiterzuordnung);
    fixture.componentRef.setInput('profil', profil);
    fixture.componentRef.setInput('unternehmer', unternehmer);
    fixture.detectChanges();
    return fixture;
  }

  it('should show the current employee assignment', () => {
    const fixture = createComponent();
    const titel = fixture.nativeElement.querySelector('.pur-form__group-titel') as HTMLElement;
    const unternehmerInput = fixture.nativeElement.querySelector(
      'input[name="zuordnung-unternehmer"]',
    ) as HTMLInputElement;
    const firmaInput = fixture.nativeElement.querySelector(
      'input[name="zuordnung-firma"]',
    ) as HTMLInputElement;
    const mitarbeiterInput = fixture.nativeElement.querySelector(
      'input[name="zuordnung-mitarbeiter"]',
    ) as HTMLInputElement;

    expect(titel.textContent?.trim()).toBe('Datenzuordnung');
    expect(unternehmerInput.value).toBe('Unternehmer');
    expect(firmaInput.value).toBe('Firma');
    expect(mitarbeiterInput.value).toBe('Mia Muster');
  });

  it('should replace the current assignment fields while editing', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const aktionAktivChange = vi.fn();
    component.aktionAktivChange.subscribe(aktionAktivChange);

    component.startZuordnungBearbeiten();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('input[name^="zuordnung-"]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('mat-select')).toHaveLength(3);
    expect(aktionAktivChange).toHaveBeenLastCalledWith(true);

    component.cancelZuordnung();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('input[name^="zuordnung-"]')).toHaveLength(3);
    expect(aktionAktivChange).toHaveBeenLastCalledWith(false);
  });

  it('should load selectable employees and emit a complete assignment', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const zuordnungSpeichern = vi.fn();
    component.zuordnungSpeichern.subscribe(zuordnungSpeichern);

    component.startZuordnungBearbeiten();
    component.zuordnungForm.controls.unternehmerId.setValue('u');
    component.handleUnternehmerChange();
    component.zuordnungForm.controls.firmaId.setValue('f');
    await component.handleFirmaChange();
    component.zuordnungForm.controls.firmaMitarbeiterId.setValue('m-2');
    component.saveZuordnung();

    expect(loadMitarbeiterAuswahlMock).toHaveBeenCalledWith({ unternehmerId: 'u', firmaId: 'f' });
    expect(zuordnungSpeichern).toHaveBeenCalledWith({
      unternehmerId: 'u',
      firmaId: 'f',
      firmaMitarbeiterId: 'm-2',
    });
  });

  it('should show the stored employee id when the employee is unavailable', () => {
    mitarbeiterStoreMock.getMitarbeiter.mockReturnValue([]);
    const fixture = TestBed.createComponent(BenutzerMitarbeiterzuordnung);
    fixture.componentRef.setInput('profil', { ...profil, firmaMitarbeiterId: 'm-fehlt' });
    fixture.componentRef.setInput('unternehmer', unternehmer);
    fixture.detectChanges();
    const mitarbeiterInput = fixture.nativeElement.querySelector(
      'input[name="zuordnung-mitarbeiter"]',
    ) as HTMLInputElement;

    expect(mitarbeiterInput.value).toBe('Nicht verfügbar (ID: m-fehlt)');
  });
});
