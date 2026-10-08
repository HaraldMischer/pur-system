// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-datenzuordnung-dialog/benutzer-datenzuordnung-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { IBenutzerProfilEintrag } from '../../../../../commons/models/domain/benutzer';
import { BenutzerVerwaltungService } from '../../../../../services/firebase/benutzer-verwaltung.service';
import { StammdatenStore } from '../../../../../stores/app/stammdaten.store';
import { BenutzerVerwaltungStore } from '../../../../../stores/domain/benutzer-verwaltung.store';
import { MitarbeiterStore } from '../../../../../stores/domain/mitarbeiter.store';
import { BenutzerDatenzuordnung } from './benutzer-datenzuordnung/benutzer-datenzuordnung';
import { BenutzerDatenzuordnungDialog } from './benutzer-datenzuordnung-dialog';

describe('BenutzerDatenzuordnungDialog', () => {
  const profil: IBenutzerProfilEintrag = {
    uid: 'office-1',
    anmeldename: 'officebenutzer-office',
    email: 'office@example.com',
    anzeigename: 'Office Benutzer',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard'],
    zugriffe: { u: { f: ['b'] } },
  };
  const aktualisiertesProfil: IBenutzerProfilEintrag = {
    ...profil,
    zugriffe: { u: { f: ['b-2'] } },
  };
  const closeMock = vi.fn();
  const updateDatenzuordnungMock = vi.fn().mockResolvedValue(aktualisiertesProfil);
  const updateMitarbeiterZuordnungMock = vi.fn().mockResolvedValue(aktualisiertesProfil);
  const dialogRefMock = { close: closeMock, disableClose: false };
  const verwaltungStoreMock = {
    inProgress: signal(false),
    updateError: signal<string | null>(null),
    updateDatenzuordnung: updateDatenzuordnungMock,
    updateMitarbeiterZuordnung: updateMitarbeiterZuordnungMock,
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
      {
        id: 'b-2',
        anzeigename: 'Filiale 2',
        filialname: 'Filiale 2',
        nummer: 2,
        aktiv: true,
        adresse: {},
        kontakt: {},
      },
    ]),
  };
  const benutzerVerwaltungServiceMock = {
    loadMitarbeiterAuswahl: vi.fn().mockResolvedValue([]),
  };
  const mitarbeiterStoreMock = {
    getMitarbeiter: vi.fn().mockReturnValue([]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    dialogRefMock.disableClose = false;
    verwaltungStoreMock.inProgress.set(false);
    verwaltungStoreMock.updateError.set(null);
    updateDatenzuordnungMock.mockResolvedValue(aktualisiertesProfil);
    updateMitarbeiterZuordnungMock.mockResolvedValue(aktualisiertesProfil);

    await TestBed.configureTestingModule({
      imports: [BenutzerDatenzuordnungDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { profil } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: StammdatenStore, useValue: stammdatenStoreMock },
        { provide: BenutzerVerwaltungStore, useValue: verwaltungStoreMock },
        { provide: BenutzerVerwaltungService, useValue: benutzerVerwaltungServiceMock },
        { provide: MitarbeiterStore, useValue: mitarbeiterStoreMock },
      ],
    }).compileComponents();
  });

  it('should directly show the selector with the current office assignment', () => {
    const fixture = TestBed.createComponent(BenutzerDatenzuordnungDialog);
    fixture.detectChanges();
    const dialogTitel = fixture.nativeElement.querySelector('[mat-dialog-title]') as HTMLElement;
    const datenzuordnung = fixture.debugElement.query(By.directive(BenutzerDatenzuordnung))
      .componentInstance as BenutzerDatenzuordnung;
    const aktionen = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'mat-dialog-actions button',
      ),
    );

    expect(dialogTitel.textContent?.trim()).toBe('Office-Datenzuordnung ändern');
    expect(fixture.nativeElement.querySelector('app-datenzugriff-selector')).not.toBeNull();
    expect(datenzuordnung.unternehmerIds()).toEqual(['u']);
    expect(datenzuordnung.firmaIds()).toEqual([JSON.stringify(['u', 'f'])]);
    expect(datenzuordnung.filialen()).toEqual({ [JSON.stringify(['u', 'f'])]: ['b'] });
    expect(aktionen.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Abbrechen',
      'Zuordnung speichern',
    ]);
    expect(aktionen[1].disabled).toBe(true);
  });

  it('should save an office assignment and close with the confirmed profile', async () => {
    const fixture = TestBed.createComponent(BenutzerDatenzuordnungDialog);
    fixture.detectChanges();
    const datenzuordnung = fixture.debugElement.query(By.directive(BenutzerDatenzuordnung))
      .componentInstance as BenutzerDatenzuordnung;
    const zuordnung = { zugriffe: { u: { f: ['b-2'] } } };
    datenzuordnung.filialen.set({ [JSON.stringify(['u', 'f'])]: ['b-2'] });
    fixture.detectChanges();
    const speichernButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'mat-dialog-actions button:last-child',
    );

    speichernButton?.click();
    await fixture.whenStable();

    expect(speichernButton?.disabled).toBe(false);
    expect(updateDatenzuordnungMock).toHaveBeenCalledWith(zuordnung);
    expect(closeMock).toHaveBeenCalledWith(aktualisiertesProfil);
    expect(dialogRefMock.disableClose).toBe(false);
  });

  it('should keep the dialog open when saving fails', async () => {
    updateDatenzuordnungMock.mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    const component = TestBed.createComponent(BenutzerDatenzuordnungDialog).componentInstance;

    await component.saveDatenzuordnung({ zugriffe: { u: { f: ['b-2'] } } });

    expect(closeMock).not.toHaveBeenCalled();
    expect(dialogRefMock.disableClose).toBe(false);
  });

  it('should reject repeated saves while a write operation is running', async () => {
    verwaltungStoreMock.inProgress.set(true);
    const component = TestBed.createComponent(BenutzerDatenzuordnungDialog).componentInstance;

    await component.saveDatenzuordnung({ zugriffe: { u: { f: ['b-2'] } } });

    expect(updateDatenzuordnungMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
  });

  it('should save an employee assignment from the role-specific dialog', async () => {
    const mitarbeiterProfil: IBenutzerProfilEintrag = {
      ...profil,
      uid: 'mitarbeiter-1',
      userRole: 'mitarbeiter',
      zugriffe: { u: { f: [] } },
      firmaMitarbeiterId: 'm-1',
    };
    const mitarbeiterErgebnis: IBenutzerProfilEintrag = {
      ...mitarbeiterProfil,
      firmaMitarbeiterId: 'm-2',
    };
    updateMitarbeiterZuordnungMock.mockResolvedValue(mitarbeiterErgebnis);
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: { profil: mitarbeiterProfil } });
    const fixture = TestBed.createComponent(BenutzerDatenzuordnungDialog);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const dialogTitel = fixture.nativeElement.querySelector('[mat-dialog-title]') as HTMLElement;
    const zuordnung = {
      unternehmerId: 'u',
      firmaId: 'f',
      firmaMitarbeiterId: 'm-2',
    };

    await component.saveMitarbeiterZuordnung(zuordnung);

    expect(dialogTitel.textContent?.trim()).toBe('Mitarbeiter-Datenzuordnung ändern');
    expect(updateMitarbeiterZuordnungMock).toHaveBeenCalledWith(zuordnung);
    expect(closeMock).toHaveBeenCalledWith(mitarbeiterErgebnis);
  });

  it('should display the store error in the open dialog', () => {
    verwaltungStoreMock.updateError.set('Die Zuordnung konnte nicht gespeichert werden.');
    const fixture = TestBed.createComponent(BenutzerDatenzuordnungDialog);
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;

    expect(alert.textContent?.trim()).toBe('Die Zuordnung konnte nicht gespeichert werden.');
  });
});
