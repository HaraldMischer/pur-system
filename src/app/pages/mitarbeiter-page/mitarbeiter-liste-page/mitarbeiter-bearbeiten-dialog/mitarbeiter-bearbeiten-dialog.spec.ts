// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IBenutzerProfilDokument } from '../../../../commons/models/domain/benutzer';
import { IMitarbeiterEintrag } from '../../../../commons/models/domain/mitarbeiter';
import { BenutzerStore } from '../../../../stores/app/benutzer.store';
import { MitarbeiterStore } from '../../../../stores/domain/mitarbeiter.store';
import { MitarbeiterBearbeitenDialog } from './mitarbeiter-bearbeiten-dialog';

describe('MitarbeiterBearbeitenDialog', () => {
  const profil: IBenutzerProfilDokument = {
    email: 'filiale@example.com',
    anzeigename: 'Filiale',
    aktiv: true,
    userRole: 'filiale',
    erlaubteBereiche: ['dashboard', 'mitarbeiter'],
    zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
  };
  const mitarbeiter: IMitarbeiterEintrag = {
    id: 'm-1',
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    person: {
      vorname: 'Mia',
      nachname: 'Muster',
      geburtstag: '2000-01-01',
      adresse: { strasse: 'Weg', hausnummer: '1', postleitzahl: '12345', ort: 'Ort' },
      kontakt: {
        email: 'mia@example.com',
        telefon: '0123456789',
        webseite: 'https://example.com',
      },
    },
    rolle: 'service',
    filialIds: ['b-1', 'b-3'],
    aktiv: true,
  };
  const dialogDaten = {
    unternehmerId: 'u-1',
    unternehmerName: 'Unternehmer',
    firmaId: 'f-1',
    firmaName: 'Firma',
    filialen: [
      { id: 'b-1', anzeigename: 'Filiale 1' },
      { id: 'b-2', anzeigename: 'Filiale 2' },
    ],
    mitarbeiter,
  };
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const benutzerProfil = signal<IBenutzerProfilDokument | null>(profil);
  let aktuelleDialogDaten: typeof dialogDaten;
  let updateMitarbeiterMock: ReturnType<typeof vi.fn>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn>; disableClose: boolean };

  beforeEach(async () => {
    inProgress.set(false);
    error.set(null);
    benutzerProfil.set(profil);
    aktuelleDialogDaten = dialogDaten;
    updateMitarbeiterMock = vi.fn().mockResolvedValue(undefined);
    dialogRefMock = { close: vi.fn(), disableClose: false };

    await TestBed.configureTestingModule({
      imports: [MitarbeiterBearbeitenDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useFactory: () => aktuelleDialogDaten },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        {
          provide: MitarbeiterStore,
          useValue: { inProgress, error, updateMitarbeiter: updateMitarbeiterMock },
        },
      ],
    }).compileComponents();
  });

  it('should initialize all editable data and show immutable identification', () => {
    const fixture = TestBed.createComponent(MitarbeiterBearbeitenDialog);
    fixture.detectChanges();

    expect(fixture.componentInstance.mitarbeiterForm.getRawValue()).toMatchObject({
      person: mitarbeiter.person,
      rolle: 'service',
      filialIds: ['b-1'],
      aktiv: true,
    });
    expect(fixture.componentInstance.weitereFilialzuordnungen).toBe(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('m-1');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'mat-select[formcontrolname="filialIds"]',
      ),
    ).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '[formcontrolname="geburtstag"], [formcontrolname="geschlecht"], [formcontrolname="telefon"], [formcontrolname="webseite"]',
      ),
    ).toHaveLength(0);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )?.disabled,
    ).toBe(true);
  });

  it('should enable saving only while the form differs from its initial value', () => {
    const fixture = TestBed.createComponent(MitarbeiterBearbeitenDialog);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const submit = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );

    component.mitarbeiterForm.controls.person.controls.vorname.setValue('Mia Neu');
    fixture.detectChanges();

    expect(component.hatAenderungen()).toBe(true);
    expect(submit?.disabled).toBe(false);

    component.mitarbeiterForm.controls.person.controls.vorname.setValue('Mia');
    fixture.detectChanges();

    expect(component.hatAenderungen()).toBe(false);
    expect(submit?.disabled).toBe(true);
  });

  it('should not update an unchanged employee', async () => {
    const component = TestBed.createComponent(MitarbeiterBearbeitenDialog).componentInstance;

    await component.onSubmit();

    expect(updateMitarbeiterMock).not.toHaveBeenCalled();
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });

  it('should show the multiple branch assignment for an office account', () => {
    benutzerProfil.set({ ...profil, userRole: 'office' });
    const fixture = TestBed.createComponent(MitarbeiterBearbeitenDialog);
    fixture.detectChanges();
    fixture.componentInstance.mitarbeiterForm.controls.filialIds.setValue(['b-1', 'b-2']);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'mat-select[formcontrolname="filialIds"]',
      ),
    ).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 Filialen zugeordnet');
  });

  it('should preserve inaccessible branch assignments while updating editable data', async () => {
    const component = TestBed.createComponent(MitarbeiterBearbeitenDialog).componentInstance;
    component.mitarbeiterForm.patchValue({
      person: { vorname: ' Mia Neu ' },
      rolle: 'admin',
      filialIds: [],
      aktiv: false,
    });

    await component.onSubmit();

    expect(updateMitarbeiterMock).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      'm-1',
      expect.objectContaining({
        person: expect.objectContaining({
          vorname: 'Mia Neu',
          geburtstag: '2000-01-01',
          kontakt: {
            email: 'mia@example.com',
            telefon: '0123456789',
            webseite: 'https://example.com',
          },
        }),
        rolle: 'admin',
        filialIds: ['b-3', 'b-1'],
        aktiv: false,
      }),
    );
    expect(dialogRefMock.close).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm-1', filialIds: ['b-3', 'b-1'], aktiv: false }),
    );
  });

  it('should update an employee without address data', async () => {
    const component = TestBed.createComponent(MitarbeiterBearbeitenDialog).componentInstance;
    component.mitarbeiterForm.controls.person.controls.adresse.setValue({
      strasse: '',
      hausnummer: '',
      postleitzahl: '',
      ort: '',
    });

    await component.onSubmit();

    expect(updateMitarbeiterMock).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      'm-1',
      expect.objectContaining({
        person: expect.objectContaining({
          adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
        }),
      }),
    );
  });

  it('should reject removing the last branch assignment', async () => {
    aktuelleDialogDaten = {
      ...dialogDaten,
      mitarbeiter: { ...mitarbeiter, filialIds: ['b-1'] },
    };
    const component = TestBed.createComponent(MitarbeiterBearbeitenDialog).componentInstance;
    component.mitarbeiterForm.controls.filialIds.setValue([]);

    await component.onSubmit();

    expect(component.mitarbeiterForm.controls.filialIds.hasError('required')).toBe(true);
    expect(updateMitarbeiterMock).not.toHaveBeenCalled();
  });

  it('should retain input and keep the dialog open after a failed update', async () => {
    updateMitarbeiterMock.mockRejectedValue({ code: 'permission-denied' });
    const component = TestBed.createComponent(MitarbeiterBearbeitenDialog).componentInstance;
    component.mitarbeiterForm.controls.person.controls.vorname.setValue('Neuer Name');

    await component.onSubmit();

    expect(component.mitarbeiterForm.controls.person.controls.vorname.value).toBe('Neuer Name');
    expect(dialogRefMock.close).not.toHaveBeenCalled();
    expect(dialogRefMock.disableClose).toBe(false);
  });

  it('should reject saving after the company permission is removed', async () => {
    const component = TestBed.createComponent(MitarbeiterBearbeitenDialog).componentInstance;
    component.mitarbeiterForm.controls.person.controls.vorname.setValue('Mia Neu');
    benutzerProfil.set({ ...profil, zugriffe: {} });

    await component.onSubmit();

    expect(updateMitarbeiterMock).not.toHaveBeenCalled();
    expect(component.submitError()).toContain('nicht mehr erlaubt');
  });
});
