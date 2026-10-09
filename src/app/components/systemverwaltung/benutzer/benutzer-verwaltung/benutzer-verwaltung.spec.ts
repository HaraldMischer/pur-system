// pur-system/src/app/components/systemverwaltung/benutzer/benutzer-verwaltung/benutzer-verwaltung.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { IBenutzerProfilEintrag } from '../../../../commons/models/domain/benutzer';
import { BenutzerVerwaltungStore } from '../../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerBearbeitenDialog } from './benutzer-bearbeiten-dialog/benutzer-bearbeiten-dialog';
import { BenutzerDatenzuordnungDialog } from './benutzer-datenzuordnung-dialog/benutzer-datenzuordnung-dialog';
import { BenutzerLoeschenDialog } from './benutzer-loeschen-dialog/benutzer-loeschen-dialog';
import { BenutzerVerwaltung } from './benutzer-verwaltung';

describe('BenutzerVerwaltung', () => {
  const profil: IBenutzerProfilEintrag = {
    uid: 'office-1',
    anmeldename: 'officebenutzer-office',
    email: 'office@example.com',
    anzeigename: 'Office Benutzer',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard', 'verwaltung'],
    zugriffe: { u: { f: ['b'] } },
  };
  const openMock = vi.fn();
  const storeMock = {
    benutzerprofile: signal<readonly IBenutzerProfilEintrag[]>([]),
    benutzerprofileDownload: signal(false),
    benutzerprofileIsLoaded: signal(true),
    benutzerprofileError: signal<string | null>(null),
    selectedBenutzer: signal<IBenutzerProfilEintrag | null>(null),
    inProgress: signal(false),
    updateError: signal<string | null>(null),
    updateSuccess: signal<string | null>(null),
    selectBenutzer: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    storeMock.benutzerprofile.set([]);
    storeMock.benutzerprofileDownload.set(false);
    storeMock.benutzerprofileIsLoaded.set(true);
    storeMock.benutzerprofileError.set(null);
    storeMock.selectedBenutzer.set(null);
    storeMock.inProgress.set(false);
    storeMock.updateError.set(null);
    storeMock.updateSuccess.set(null);

    await TestBed.configureTestingModule({
      imports: [BenutzerVerwaltung, NoopAnimationsModule],
    })
      .overrideComponent(BenutzerVerwaltung, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openMock } },
            { provide: BenutzerVerwaltungStore, useValue: storeMock },
          ],
        },
      })
      .compileComponents();
  });

  it('should render an empty and disabled profile selection', () => {
    const fixture = TestBed.createComponent(BenutzerVerwaltung);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const bearbeitenButton = compiled.querySelector<HTMLButtonElement>('button');

    expect(compiled.textContent).toContain('Keine Benutzerprofile verfügbar');
    expect(bearbeitenButton?.disabled).toBe(true);
  });

  it('should select a profile and open its profile dialog', () => {
    storeMock.benutzerprofile.set([profil]);
    storeMock.selectedBenutzer.set(profil);
    const fixture = TestBed.createComponent(BenutzerVerwaltung);
    const component = fixture.componentInstance;

    component.selectBenutzer(profil.uid);
    component.openBenutzerBearbeitenDialog();

    expect(storeMock.selectBenutzer).toHaveBeenCalledWith(profil.uid);
    expect(openMock).toHaveBeenCalledWith(BenutzerBearbeitenDialog, {
      data: { profil },
      panelClass: ['pur-dialog__panel'],
    });
  });

  it('should open the assignment dialog for a non-master profile', () => {
    storeMock.benutzerprofile.set([profil]);
    storeMock.selectedBenutzer.set(profil);
    const component = TestBed.createComponent(BenutzerVerwaltung).componentInstance;

    component.openBenutzerDatenzuordnungDialog();

    expect(openMock).toHaveBeenCalledWith(BenutzerDatenzuordnungDialog, {
      data: { profil },
      panelClass: ['pur-dialog__panel'],
    });
  });

  it('should open the deletion dialog for a non-master profile', () => {
    storeMock.benutzerprofile.set([profil]);
    storeMock.selectedBenutzer.set(profil);
    const component = TestBed.createComponent(BenutzerVerwaltung).componentInstance;

    component.openBenutzerLoeschenDialog();

    expect(openMock).toHaveBeenCalledWith(BenutzerLoeschenDialog, {
      data: { profil },
      panelClass: ['pur-dialog__panel'],
    });
  });

  it('should disable editing and reject actions while a write operation is running', () => {
    storeMock.benutzerprofile.set([profil]);
    storeMock.selectedBenutzer.set(profil);
    storeMock.inProgress.set(true);
    const fixture = TestBed.createComponent(BenutzerVerwaltung);
    fixture.detectChanges();
    const bearbeitenButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    fixture.componentInstance.openBenutzerBearbeitenDialog();
    fixture.componentInstance.openBenutzerDatenzuordnungDialog();
    fixture.componentInstance.openBenutzerLoeschenDialog();

    expect(bearbeitenButton.disabled).toBe(true);
    expect(openMock).not.toHaveBeenCalled();
  });

  it('should provide all actions for a non-master profile', async () => {
    storeMock.benutzerprofile.set([profil]);
    storeMock.selectedBenutzer.set(profil);
    const fixture = TestBed.createComponent(BenutzerVerwaltung);
    fixture.detectChanges();
    const bearbeitenButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    bearbeitenButton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const menuTexte = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).map(
      (eintrag) => eintrag.querySelector('span')?.textContent?.trim(),
    );
    const menuEintraege = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );

    expect(menuTexte).toEqual([
      'Benutzerdaten bearbeiten',
      'Datenzuordnung ändern',
      'Benutzerkonto löschen',
    ]);
    expect(menuEintraege.map((eintrag) => eintrag.disabled)).toEqual([false, false, false]);
  });

  it('should directly open profile editing for a master profile', () => {
    const masterProfil: IBenutzerProfilEintrag = {
      ...profil,
      uid: 'master-1',
      userRole: 'master',
      erlaubteBereiche: ['dashboard', 'systemverwaltung'],
      zugriffe: {},
    };
    storeMock.benutzerprofile.set([masterProfil]);
    storeMock.selectedBenutzer.set(masterProfil);
    const fixture = TestBed.createComponent(BenutzerVerwaltung);
    fixture.detectChanges();
    const bearbeitenButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    bearbeitenButton.click();
    fixture.componentInstance.openBenutzerDatenzuordnungDialog();
    fixture.componentInstance.openBenutzerLoeschenDialog();

    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith(BenutzerBearbeitenDialog, {
      data: { profil: masterProfil },
      panelClass: ['pur-dialog__panel'],
    });
  });

  it('should group profiles by role frequency and sort their display names', () => {
    storeMock.benutzerprofile.set([
      { ...profil, uid: 'master-1', anzeigename: 'Master Benutzer', userRole: 'master' },
      {
        ...profil,
        uid: 'mitarbeiter-1',
        anzeigename: 'Mitarbeiter Benutzer',
        userRole: 'mitarbeiter',
      },
      profil,
      { ...profil, uid: 'filiale-2', anzeigename: 'Zweite Filiale', userRole: 'filiale' },
      { ...profil, uid: 'filiale-1', anzeigename: 'Erste Filiale', userRole: 'filiale' },
    ]);
    const fixture = TestBed.createComponent(BenutzerVerwaltung);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;
    const gruppenLabels = select.optionGroups.map((gruppe) => gruppe.label);
    const optionTexts = select.options.map((option) =>
      option.viewValue.replace(/\s+/g, ' ').trim(),
    );

    expect(gruppenLabels).toEqual(['Filiale', 'Office', 'Mitarbeiter', 'Master']);
    expect(optionTexts).toEqual([
      'Erste Filiale',
      'Zweite Filiale',
      'Office Benutzer',
      'Mitarbeiter Benutzer',
      'Master Benutzer',
    ]);
    expect(optionTexts.join(' ')).not.toContain('officebenutzer-office');
    expect(optionTexts.join(' ')).not.toContain('office@example.com');
  });
});
