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
      adresse: { strasse: 'Weg', hausnummer: '1', postleitzahl: '12345', ort: 'Ort' },
      kontakt: { email: 'mia@example.com' },
    },
    rolle: 'service',
    filialIds: ['b-1', 'b-2'],
    aktiv: true,
  };
  const dialogDaten = {
    unternehmerId: 'u-1',
    unternehmerName: 'Unternehmer',
    firmaId: 'f-1',
    firmaName: 'Firma',
    filialen: [{ id: 'b-1', anzeigename: 'Filiale 1' }],
    mitarbeiter,
  };
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const benutzerProfil = signal<IBenutzerProfilDokument | null>(profil);
  let updateMitarbeiterMock: ReturnType<typeof vi.fn>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn>; disableClose: boolean };

  beforeEach(async () => {
    inProgress.set(false);
    error.set(null);
    benutzerProfil.set(profil);
    updateMitarbeiterMock = vi.fn().mockResolvedValue(undefined);
    dialogRefMock = { close: vi.fn(), disableClose: false };

    await TestBed.configureTestingModule({
      imports: [MitarbeiterBearbeitenDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogDaten },
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
        person: expect.objectContaining({ vorname: 'Mia Neu' }),
        rolle: 'admin',
        filialIds: ['b-2', 'b-1'],
        aktiv: false,
      }),
    );
    expect(dialogRefMock.close).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm-1', filialIds: ['b-2', 'b-1'], aktiv: false }),
    );
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
    benutzerProfil.set({ ...profil, zugriffe: {} });

    await component.onSubmit();

    expect(updateMitarbeiterMock).not.toHaveBeenCalled();
    expect(component.submitError()).toContain('nicht mehr erlaubt');
  });
});
