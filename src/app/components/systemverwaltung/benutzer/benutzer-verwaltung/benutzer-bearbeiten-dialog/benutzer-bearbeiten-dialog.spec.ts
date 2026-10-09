// pur-system/src/app/components/systemverwaltung/benutzer/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IBenutzerProfilEintrag } from '../../../../../commons/models/domain/benutzer';
import { AuthService } from '../../../../../services/firebase/auth.service';
import { BenutzerVerwaltungStore } from '../../../../../stores/domain/benutzer-verwaltung.store';
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
  const dialogRefMock = { close: closeMock, disableClose: false };
  const verwaltungStoreMock = {
    inProgress: signal(false),
    updateError: signal<string | null>(null),
    updateBenutzerProfil: updateBenutzerProfilMock,
  };
  const authServiceMock = {
    getAktuelleBenutzerId: vi.fn().mockReturnValue('master-1'),
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    updateBenutzerProfilMock.mockResolvedValue(aktualisiertesProfil);
    dialogRefMock.disableClose = false;
    verwaltungStoreMock.inProgress.set(false);
    verwaltungStoreMock.updateError.set(null);
    authServiceMock.getAktuelleBenutzerId.mockReturnValue('master-1');

    await TestBed.configureTestingModule({
      imports: [BenutzerBearbeitenDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { profil } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: BenutzerVerwaltungStore, useValue: verwaltungStoreMock },
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
        fixture.nativeElement.querySelectorAll('mat-dialog-content h2') as NodeListOf<HTMLElement>,
      ).map((titel) => titel.textContent?.trim()),
    ).toEqual(['Erlaubte Bereiche']);
    expect(fixture.nativeElement.querySelector('app-benutzer-datenzuordnung')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Benutzerkonto löschen');
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

  it('should disable the complete profile form and reject submits while saving', async () => {
    const fixture = TestBed.createComponent(BenutzerBearbeitenDialog);
    const component = fixture.componentInstance;
    component.benutzerForm.controls.anzeigename.setValue('Office Neu');
    verwaltungStoreMock.inProgress.set(true);
    fixture.detectChanges();

    await component.onSubmit();

    expect(component.benutzerForm.disabled).toBe(true);
    expect(updateBenutzerProfilMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
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

  it('should update only the allowed areas of an employee profile', async () => {
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

    expect(dialogTitel.textContent?.trim()).toBe('Mitarbeiter-Benutzer bearbeiten');
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
    ).toEqual(['Aktiv', 'Schichtplan', 'Mitarbeiter', 'Verwaltung']);

    await component.onSubmit();

    expect(updateBenutzerProfilMock).toHaveBeenCalledWith({
      anzeigename: 'Office Benutzer',
      aktiv: true,
      erlaubteBereiche: ['dashboard', 'verwaltung', 'systemverwaltung'],
    });
  });
});
