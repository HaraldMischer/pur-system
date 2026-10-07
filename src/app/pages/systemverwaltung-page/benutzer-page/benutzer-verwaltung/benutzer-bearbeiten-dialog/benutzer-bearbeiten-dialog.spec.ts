// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IBenutzerProfilEintrag } from '../../../../../commons/models/domain/benutzer';
import { AuthService } from '../../../../../services/firebase/auth.service';
import { BenutzerVerwaltungService } from '../../../../../services/firebase/benutzer-verwaltung.service';
import { StammdatenStore } from '../../../../../stores/app/stammdaten.store';
import { BenutzerVerwaltungStore } from '../../../../../stores/domain/benutzer-verwaltung.store';
import { MitarbeiterStore } from '../../../../../stores/domain/mitarbeiter.store';
import { BenutzerBearbeitenDialog } from './benutzer-bearbeiten-dialog';

describe('BenutzerBearbeitenDialog', () => {
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
  const aktualisiertesProfil = { ...profil, anzeigename: 'Office Neu' };
  const closeMock = vi.fn();
  const updateBenutzerProfilMock = vi.fn().mockResolvedValue(aktualisiertesProfil);
  const updateDatenzuordnungMock = vi.fn().mockResolvedValue({
    ...profil,
    zugriffe: { u: { f: ['b'] } },
  });
  const updateMitarbeiterZuordnungMock = vi.fn().mockResolvedValue({
    ...profil,
    uid: 'mitarbeiter-1',
    userRole: 'mitarbeiter',
    zugriffe: { u: { f: [] } },
    firmaMitarbeiterId: 'm-2',
  });
  const deleteBenutzerMock = vi.fn().mockResolvedValue(undefined);
  const dialogRefMock = { close: closeMock, disableClose: false };
  const verwaltungStoreMock = {
    inProgress: signal(false),
    updateError: signal<string | null>(null),
    updateBenutzerProfil: updateBenutzerProfilMock,
    updateDatenzuordnung: updateDatenzuordnungMock,
    updateMitarbeiterZuordnung: updateMitarbeiterZuordnungMock,
    deleteBenutzer: deleteBenutzerMock,
  };
  const stammdatenStoreMock = {
    unternehmer: signal([
      { id: 'u', anzeigename: 'Unternehmer', nummer: 1, aktiv: true, person: {} },
    ]),
    getFirmen: vi.fn().mockReturnValue([
      {
        id: 'f',
        anzeigename: 'Firma',
        firmenname: 'Firma GmbH',
        nummer: 1,
        aktiv: true,
        adresse: {},
        kontakt: {},
      },
    ]),
    getFilialen: vi.fn().mockReturnValue([
      {
        id: 'b',
        anzeigename: 'Filiale',
        filialname: 'Filiale',
        nummer: 1,
        aktiv: true,
        adresse: {},
        kontakt: {},
      },
    ]),
  };
  const authServiceMock = {
    getAktuelleBenutzerId: vi.fn().mockReturnValue('master-1'),
  };
  const mitarbeiterStoreMock = {
    getMitarbeiter: vi.fn().mockReturnValue([
      {
        id: 'm-1',
        unternehmerId: 'u',
        firmaId: 'f',
        person: { vorname: 'Mia', nachname: 'Muster' },
        rollen: ['servicekraft'],
        filialIds: ['b'],
        aktiv: true,
      },
    ]),
  };
  const benutzerVerwaltungServiceMock = {
    loadMitarbeiterAuswahl: vi.fn().mockResolvedValue([{ id: 'm-2', anzeigename: 'Neu, Nina' }]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    updateBenutzerProfilMock.mockResolvedValue(aktualisiertesProfil);
    updateDatenzuordnungMock.mockResolvedValue({
      ...profil,
      zugriffe: { u: { f: ['b'] } },
    });
    updateMitarbeiterZuordnungMock.mockResolvedValue({
      ...profil,
      uid: 'mitarbeiter-1',
      userRole: 'mitarbeiter',
      zugriffe: { u: { f: [] } },
      firmaMitarbeiterId: 'm-2',
    });
    deleteBenutzerMock.mockResolvedValue(undefined);
    dialogRefMock.disableClose = false;
    verwaltungStoreMock.inProgress.set(false);
    verwaltungStoreMock.updateError.set(null);
    authServiceMock.getAktuelleBenutzerId.mockReturnValue('master-1');
    mitarbeiterStoreMock.getMitarbeiter.mockReturnValue([
      {
        id: 'm-1',
        unternehmerId: 'u',
        firmaId: 'f',
        person: { vorname: 'Mia', nachname: 'Muster' },
        rollen: ['servicekraft'],
        filialIds: ['b'],
        aktiv: true,
      },
    ]);
    benutzerVerwaltungServiceMock.loadMitarbeiterAuswahl.mockResolvedValue([
      { id: 'm-2', anzeigename: 'Neu, Nina' },
    ]);

    await TestBed.configureTestingModule({
      imports: [BenutzerBearbeitenDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { profil } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: BenutzerVerwaltungService, useValue: benutzerVerwaltungServiceMock },
        { provide: StammdatenStore, useValue: stammdatenStoreMock },
        { provide: BenutzerVerwaltungStore, useValue: verwaltungStoreMock },
        { provide: MitarbeiterStore, useValue: mitarbeiterStoreMock },
      ],
    }).compileComponents();
  });

  it('should initialize the editable profile data without immutable account fields', () => {
    const fixture = TestBed.createComponent(BenutzerBearbeitenDialog);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const dialogTitel = fixture.nativeElement.querySelector('[mat-dialog-title]') as HTMLElement;

    expect(component.benutzerForm.getRawValue()).toEqual({
      anzeigename: 'Office Benutzer',
      aktiv: true,
      erlaubteBereiche: {
        schichtplan: false,
        mitarbeiter: false,
        verwaltung: true,
      },
    });
    expect(fixture.nativeElement.querySelector('input[name="anmeldename"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="email"]')).toBeNull();
    expect(dialogTitel.textContent?.trim()).toBe('Office-Benutzer bearbeiten');
    expect(fixture.nativeElement.querySelector('input[name="benutzerrolle"]')).toBeNull();
    expect(
      Array.from(
        fixture.nativeElement.querySelectorAll('.pur-form__group-titel') as NodeListOf<HTMLElement>,
      ).map((titel) => titel.textContent?.trim()),
    ).toEqual(['Profildaten', 'Erlaubte Bereiche', 'Datenzuordnung', 'Benutzerkonto']);
    expect(fixture.nativeElement.querySelectorAll('mat-checkbox')).toHaveLength(4);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )?.disabled,
    ).toBe(true);
  });

  it('should enable saving only while the profile differs from its initial value', () => {
    const component = TestBed.createComponent(BenutzerBearbeitenDialog).componentInstance;

    component.benutzerForm.controls.anzeigename.setValue('Office Neu');
    expect(component.hatAenderungen()).toBe(true);

    component.benutzerForm.controls.anzeigename.setValue('Office Benutzer');
    expect(component.hatAenderungen()).toBe(false);
  });

  it('should identify a branch account in the dialog title', () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        profil: {
          ...profil,
          uid: 'filiale-1',
          userRole: 'filiale',
        },
      },
    });
    const fixture = TestBed.createComponent(BenutzerBearbeitenDialog);
    fixture.detectChanges();
    const dialogTitel = fixture.nativeElement.querySelector('[mat-dialog-title]') as HTMLElement;

    expect(dialogTitel.textContent?.trim()).toBe('Filial-Benutzer bearbeiten');
  });

  it('should not update an unchanged user profile', async () => {
    const component = TestBed.createComponent(BenutzerBearbeitenDialog).componentInstance;

    await component.onSubmit();

    expect(updateBenutzerProfilMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
  });

  it('should save normalized profile data and close the dialog', async () => {
    const component = TestBed.createComponent(BenutzerBearbeitenDialog).componentInstance;
    component.benutzerForm.controls.anzeigename.setValue(' Office Neu ');

    await component.onSubmit();

    expect(updateBenutzerProfilMock).toHaveBeenCalledWith({
      anzeigename: 'Office Neu',
      aktiv: true,
      erlaubteBereiche: ['dashboard', 'verwaltung'],
    });
    expect(closeMock).toHaveBeenCalledWith(aktualisiertesProfil);
  });

  it('should disable the active state for the own master profile', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        profil: {
          ...profil,
          uid: 'master-1',
          userRole: 'master',
          erlaubteBereiche: ['dashboard', 'systemverwaltung'],
          zugriffe: {},
        },
      },
    });
    const component = TestBed.createComponent(BenutzerBearbeitenDialog).componentInstance;

    expect(component.istEigenesProfil).toBe(true);
    expect(component.benutzerForm.controls.aktiv.disabled).toBe(true);
  });

  it('should update selected employee account areas while preserving its company assignment', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        profil: {
          ...profil,
          uid: 'mitarbeiter-1',
          userRole: 'mitarbeiter',
          erlaubteBereiche: ['dashboard'],
          zugriffe: { u: { f: [] } },
          firmaMitarbeiterId: 'm-1',
        },
      },
    });
    const fixture = TestBed.createComponent(BenutzerBearbeitenDialog);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const dialogTitel = fixture.nativeElement.querySelector('[mat-dialog-title]') as HTMLElement;
    const unternehmerInput = fixture.nativeElement.querySelector(
      'input[name="zuordnung-unternehmer"]',
    ) as HTMLInputElement;
    const firmaInput = fixture.nativeElement.querySelector(
      'input[name="zuordnung-firma"]',
    ) as HTMLInputElement;
    const mitarbeiterInput = fixture.nativeElement.querySelector(
      'input[name="zuordnung-mitarbeiter"]',
    ) as HTMLInputElement;

    expect(dialogTitel.textContent?.trim()).toBe('Mitarbeiter-Benutzer bearbeiten');
    expect(unternehmerInput.value).toBe('Unternehmer');
    expect(firmaInput.value).toBe('Firma');
    expect(mitarbeiterInput.value).toBe('Mia Muster');
    expect(unternehmerInput.readOnly).toBe(true);
    expect(firmaInput.readOnly).toBe(true);
    expect(mitarbeiterInput.readOnly).toBe(true);
    expect(component.benutzerForm.controls.erlaubteBereiche.getRawValue()).toEqual({
      schichtplan: false,
      mitarbeiter: false,
      verwaltung: false,
    });
    expect(component.benutzerForm.controls.erlaubteBereiche.controls.schichtplan.enabled).toBe(
      true,
    );
    expect(fixture.nativeElement.querySelector('app-datenzugriff-selector')).toBeNull();

    component.benutzerForm.controls.anzeigename.setValue('Mitarbeiter Neu');
    component.benutzerForm.controls.erlaubteBereiche.patchValue({
      schichtplan: true,
      mitarbeiter: true,
    });
    await component.onSubmit();

    expect(updateBenutzerProfilMock).toHaveBeenCalledWith({
      anzeigename: 'Mitarbeiter Neu',
      aktiv: true,
      erlaubteBereiche: ['dashboard', 'schichtplan'],
    });
  });

  it('should save an office assignment emitted by the assignment component', async () => {
    const component = TestBed.createComponent(BenutzerBearbeitenDialog).componentInstance;

    await component.saveDatenzuordnung({ zugriffe: { u: { f: ['b'] } } });

    expect(updateDatenzuordnungMock).toHaveBeenCalledWith({ zugriffe: { u: { f: ['b'] } } });
    expect(closeMock).toHaveBeenCalled();
  });

  it('should show the stored employee id when the linked employee is unavailable', () => {
    mitarbeiterStoreMock.getMitarbeiter.mockReturnValue([]);
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        profil: {
          ...profil,
          uid: 'mitarbeiter-1',
          userRole: 'mitarbeiter',
          erlaubteBereiche: ['dashboard'],
          zugriffe: { u: { f: [] } },
          firmaMitarbeiterId: 'm-fehlt',
        },
      },
    });
    const fixture = TestBed.createComponent(BenutzerBearbeitenDialog);
    fixture.detectChanges();
    const mitarbeiterInput = fixture.nativeElement.querySelector(
      'input[name="zuordnung-mitarbeiter"]',
    ) as HTMLInputElement;

    expect(mitarbeiterInput.value).toBe('Nicht verfügbar (ID: m-fehlt)');
  });

  it('should save an employee assignment emitted by the assignment component', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        profil: {
          ...profil,
          uid: 'mitarbeiter-1',
          userRole: 'mitarbeiter',
          erlaubteBereiche: ['dashboard'],
          zugriffe: { u: { f: [] } },
          firmaMitarbeiterId: 'm-1',
        },
      },
    });
    const component = TestBed.createComponent(BenutzerBearbeitenDialog).componentInstance;

    await component.saveMitarbeiterZuordnung({
      unternehmerId: 'u',
      firmaId: 'f',
      firmaMitarbeiterId: 'm-2',
    });

    expect(updateMitarbeiterZuordnungMock).toHaveBeenCalledWith({
      unternehmerId: 'u',
      firmaId: 'f',
      firmaMitarbeiterId: 'm-2',
    });
    expect(closeMock).toHaveBeenCalled();
  });

  it('should require confirmation before deleting a non-master account', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        profil: {
          ...profil,
          uid: 'mitarbeiter-1',
          userRole: 'mitarbeiter',
          erlaubteBereiche: ['dashboard'],
          zugriffe: { u: { f: [] } },
          firmaMitarbeiterId: 'm-1',
        },
      },
    });
    const component = TestBed.createComponent(BenutzerBearbeitenDialog).componentInstance;

    await component.deleteBenutzer();
    expect(deleteBenutzerMock).not.toHaveBeenCalled();

    component.startBenutzerLoeschen();
    await component.deleteBenutzer();

    expect(deleteBenutzerMock).toHaveBeenCalledOnce();
    expect(closeMock).toHaveBeenCalledWith(undefined);
  });

  it('should add system administration automatically when saving a master profile', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        profil: {
          ...profil,
          uid: 'master-2',
          userRole: 'master',
          erlaubteBereiche: ['dashboard', 'systemverwaltung'],
          zugriffe: {},
        },
      },
    });
    const fixture = TestBed.createComponent(BenutzerBearbeitenDialog);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const dialogTitel = fixture.nativeElement.querySelector('[mat-dialog-title]') as HTMLElement;
    component.benutzerForm.controls.erlaubteBereiche.controls.verwaltung.setValue(true);

    expect(dialogTitel.textContent?.trim()).toBe('Master-Benutzer bearbeiten');
    expect(
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('mat-checkbox'),
      ).map((checkbox) => checkbox.textContent?.trim()),
    ).toEqual(['Profil aktiv', 'Schichtplan', 'Mitarbeiter', 'Verwaltung']);

    await component.onSubmit();

    expect(updateBenutzerProfilMock).toHaveBeenCalledWith({
      anzeigename: 'Office Benutzer',
      aktiv: true,
      erlaubteBereiche: ['dashboard', 'verwaltung', 'systemverwaltung'],
    });
  });
});
