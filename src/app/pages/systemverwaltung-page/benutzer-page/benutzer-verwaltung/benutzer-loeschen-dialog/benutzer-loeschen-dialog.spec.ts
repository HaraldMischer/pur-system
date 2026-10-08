// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-loeschen-dialog/benutzer-loeschen-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IBenutzerProfilEintrag } from '../../../../../commons/models/domain/benutzer';
import { BenutzerVerwaltungStore } from '../../../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerLoeschenDialog } from './benutzer-loeschen-dialog';

describe('BenutzerLoeschenDialog', () => {
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
  const closeMock = vi.fn();
  const deleteBenutzerMock = vi.fn().mockResolvedValue(undefined);
  const dialogRefMock = { close: closeMock, disableClose: false };
  const verwaltungStoreMock = {
    inProgress: signal(false),
    updateError: signal<string | null>(null),
    deleteBenutzer: deleteBenutzerMock,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    dialogRefMock.disableClose = false;
    verwaltungStoreMock.inProgress.set(false);
    verwaltungStoreMock.updateError.set(null);
    deleteBenutzerMock.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [BenutzerLoeschenDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { profil } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: BenutzerVerwaltungStore, useValue: verwaltungStoreMock },
      ],
    }).compileComponents();
  });

  it('should clearly identify the account and consequences before deletion', () => {
    const fixture = TestBed.createComponent(BenutzerLoeschenDialog);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim();
    const dialogTitel = fixture.nativeElement.querySelector('[mat-dialog-title]') as HTMLElement;
    const aktionen = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'mat-dialog-actions button',
      ),
    ).map((button) => button.textContent?.replace(/\s+/g, ' ').trim());

    expect(dialogTitel.textContent?.trim()).toBe('Benutzerkonto löschen');
    expect(text).toContain('Office Benutzer');
    expect(text).toContain('endgültig gelöscht');
    expect(text).toContain('nicht rückgängig gemacht');
    expect(aktionen).toEqual(['Abbrechen', 'Benutzerkonto endgültig löschen']);
  });

  it('should close only after the account was deleted successfully', async () => {
    const component = TestBed.createComponent(BenutzerLoeschenDialog).componentInstance;

    await component.deleteBenutzer();

    expect(deleteBenutzerMock).toHaveBeenCalledOnce();
    expect(closeMock).toHaveBeenCalledWith(true);
    expect(dialogRefMock.disableClose).toBe(false);
  });

  it('should keep the dialog open and expose the store error after a failed deletion', async () => {
    deleteBenutzerMock.mockImplementation(async () => {
      verwaltungStoreMock.updateError.set('Das Benutzerkonto konnte nicht gelöscht werden.');
      throw new Error('Löschen fehlgeschlagen');
    });
    const fixture = TestBed.createComponent(BenutzerLoeschenDialog);
    const component = fixture.componentInstance;

    await component.deleteBenutzer();
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;

    expect(closeMock).not.toHaveBeenCalled();
    expect(dialogRefMock.disableClose).toBe(false);
    expect(alert.textContent?.trim()).toBe('Das Benutzerkonto konnte nicht gelöscht werden.');
  });

  it('should reject repeated deletion while a write operation is running', async () => {
    verwaltungStoreMock.inProgress.set(true);
    const fixture = TestBed.createComponent(BenutzerLoeschenDialog);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const buttons = fixture.nativeElement.querySelectorAll(
      'mat-dialog-actions button',
    ) as NodeListOf<HTMLButtonElement>;

    await component.deleteBenutzer();

    expect(Array.from(buttons).every((button) => button.disabled)).toBe(true);
    expect(deleteBenutzerMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
  });

  it('should never delete a master account', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        profil: {
          ...profil,
          uid: 'master-1',
          userRole: 'master',
          zugriffe: {},
        },
      },
    });
    const component = TestBed.createComponent(BenutzerLoeschenDialog).componentInstance;

    await component.deleteBenutzer();

    expect(deleteBenutzerMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
  });
});
