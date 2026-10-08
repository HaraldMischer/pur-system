// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IBenutzerProfilDokument } from '../../../../commons/models/domain/benutzer';
import { BenutzerStore } from '../../../../stores/app/benutzer.store';
import { MitarbeiterStore } from '../../../../stores/domain/mitarbeiter.store';
import { MitarbeiterAnlegenDialog } from './mitarbeiter-anlegen-dialog';

describe('MitarbeiterAnlegenDialog', () => {
  const profil: IBenutzerProfilDokument = {
    email: 'office@example.com',
    anzeigename: 'Office',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard', 'mitarbeiter'],
    zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
  };
  const dialogDaten = {
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    filialen: [
      { id: 'b-1', anzeigename: 'Filiale 1' },
      { id: 'b-2', anzeigename: 'Filiale 2' },
    ],
  };
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const benutzerProfil = signal<IBenutzerProfilDokument | null>(profil);
  let createMitarbeiterMock: ReturnType<typeof vi.fn>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn>; disableClose: boolean };

  beforeEach(async () => {
    inProgress.set(false);
    error.set(null);
    benutzerProfil.set(profil);
    createMitarbeiterMock = vi.fn().mockResolvedValue({ id: 'm-neu' });
    dialogRefMock = { close: vi.fn(), disableClose: false };

    await TestBed.configureTestingModule({
      imports: [MitarbeiterAnlegenDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogDaten },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        {
          provide: MitarbeiterStore,
          useValue: { inProgress, error, createMitarbeiter: createMitarbeiterMock },
        },
      ],
    }).compileComponents();
  });

  it('should provide an invalid form and the global dialog structure initially', () => {
    const fixture = TestBed.createComponent(MitarbeiterAnlegenDialog);
    fixture.detectChanges();
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    const submit = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );

    expect(fixture.componentInstance.mitarbeiterForm.invalid).toBe(true);
    expect(fixture.componentInstance.mitarbeiterForm.controls.aktiv.value).toBe(true);
    expect(fixture.componentInstance.rollen).toContainEqual({
      value: 'dienstplaner',
      label: 'Dienstplaner',
    });
    expect(form?.classList).toContain('pur-form--grid');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.pur-page-section__summary'),
    ).toBeNull();
    expect(submit?.getAttribute('form')).toBe('mitarbeiter-anlegen-form');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'mat-select[formcontrolname="filialIds"]',
      ),
    ).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '[formcontrolname="geburtstag"], [formcontrolname="geschlecht"], [formcontrolname="telefon"], [formcontrolname="webseite"]',
      ),
    ).toHaveLength(0);
  });

  it('should hide the fixed branch assignment for a branch account', () => {
    benutzerProfil.set({ ...profil, userRole: 'filiale' });
    const fixture = TestBed.createComponent(MitarbeiterAnlegenDialog);
    fixture.detectChanges();

    expect(fixture.componentInstance.mitarbeiterForm.controls.filialIds.value).toEqual(['b-1']);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'mat-select[formcontrolname="filialIds"]',
      ),
    ).toBeNull();
  });

  it('should summarize multiple selected branches in the select trigger', () => {
    const fixture = TestBed.createComponent(MitarbeiterAnlegenDialog);
    fixture.detectChanges();
    fixture.componentInstance.mitarbeiterForm.controls.filialIds.setValue(['b-1', 'b-2']);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 Filialen zugeordnet');
  });

  it('should normalize and create an employee with a required branch assignment', async () => {
    const component = TestBed.createComponent(MitarbeiterAnlegenDialog).componentInstance;
    component.mitarbeiterForm.patchValue({
      person: {
        vorname: ' Mia ',
        nachname: ' Muster ',
        adresse: {
          strasse: ' Weg ',
          hausnummer: ' 1 ',
          postleitzahl: ' 12345 ',
          ort: ' Ort ',
        },
        kontakt: { email: ' MIA@EXAMPLE.COM ' },
      },
      rollen: ['filialkasse'],
      filialIds: ['b-1'],
      aktiv: false,
    });

    await component.onSubmit();

    expect(createMitarbeiterMock).toHaveBeenCalledWith('u-1', 'f-1', {
      person: {
        vorname: 'Mia',
        nachname: 'Muster',
        adresse: { strasse: 'Weg', hausnummer: '1', postleitzahl: '12345', ort: 'Ort' },
        kontakt: { email: 'mia@example.com' },
      },
      rollen: ['filialkasse'],
      filialIds: ['b-1'],
      aktiv: false,
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith({ id: 'm-neu' });
  });

  it('should create an employee without address data', async () => {
    const component = TestBed.createComponent(MitarbeiterAnlegenDialog).componentInstance;
    component.mitarbeiterForm.patchValue({
      person: { vorname: 'Mia', nachname: 'Muster' },
      filialIds: ['b-1'],
    });

    await component.onSubmit();

    expect(createMitarbeiterMock).toHaveBeenCalledWith(
      'u-1',
      'f-1',
      expect.objectContaining({
        person: expect.objectContaining({
          adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
        }),
      }),
    );
  });

  it('should reject creating an employee without a branch assignment', async () => {
    const component = TestBed.createComponent(MitarbeiterAnlegenDialog).componentInstance;
    component.mitarbeiterForm.patchValue({
      person: {
        vorname: 'Mia',
        nachname: 'Muster',
        adresse: { strasse: 'Weg', hausnummer: '1', postleitzahl: '12345', ort: 'Ort' },
      },
      filialIds: [],
    });

    await component.onSubmit();

    expect(component.mitarbeiterForm.controls.filialIds.hasError('required')).toBe(true);
    expect(createMitarbeiterMock).not.toHaveBeenCalled();
  });

  it('should reject saving after the company permission is removed', async () => {
    const component = TestBed.createComponent(MitarbeiterAnlegenDialog).componentInstance;
    component.mitarbeiterForm.patchValue({
      person: {
        vorname: 'Mia',
        nachname: 'Muster',
        adresse: { strasse: 'Weg', hausnummer: '1', postleitzahl: '12345', ort: 'Ort' },
      },
      filialIds: ['b-1'],
    });
    benutzerProfil.set({ ...profil, zugriffe: {} });

    await component.onSubmit();

    expect(createMitarbeiterMock).not.toHaveBeenCalled();
    expect(component.submitError()).toContain('nicht mehr erlaubt');
  });

  it('should disable and re-enable the complete form during writing', () => {
    const fixture = TestBed.createComponent(MitarbeiterAnlegenDialog);
    fixture.detectChanges();

    inProgress.set(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.mitarbeiterForm.disabled).toBe(true);

    inProgress.set(false);
    fixture.detectChanges();
    expect(fixture.componentInstance.mitarbeiterForm.enabled).toBe(true);
  });
});
