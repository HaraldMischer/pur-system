// pur-system/src/app/pages/system/struktur-verwalten-page/struktur-verwalten-page.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FilialeBearbeitenDialog } from '../../../components/system/struktur-bearbeiten/filiale-bearbeiten-dialog/filiale-bearbeiten-dialog';
import { FirmaBearbeitenDialog } from '../../../components/system/struktur-bearbeiten/firma-bearbeiten-dialog/firma-bearbeiten-dialog';
import { IFirmaEintrag } from '../../../commons/models/domain/firma';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { StrukturBearbeitenStore } from '../../../stores/domain/struktur-bearbeiten.store';
import { StrukturVerwaltenPage } from './struktur-verwalten-page';

describe('StrukturVerwaltenPage', () => {
  const openDialogMock = vi.fn();
  const strukturBearbeitenStoreMock = {
    unternehmerListe: signal({ daten: [], download: false, isLoaded: true, error: null }),
    firmenListe: signal({ daten: [], download: false, isLoaded: false, error: null }),
    filialenListe: signal({ daten: [], download: false, isLoaded: false, error: null }),
    unternehmer: signal([]),
    firmen: signal([]),
    filialen: signal([]),
    selectedUnternehmerId: signal(null),
    selectedFirmaId: signal(null),
    selectedFilialeId: signal(null),
    selectedFirma: signal<IFirmaEintrag | null>(null),
    selectedFiliale: signal<IFilialeEintrag | null>(null),
    inProgress: signal(false),
    updateError: signal(null),
    updateSuccess: signal(null),
    istMaster: signal(false),
    loadUnternehmer: vi.fn().mockResolvedValue(undefined),
    loadFirmen: vi.fn().mockResolvedValue(undefined),
    loadFilialen: vi.fn().mockResolvedValue(undefined),
    selectUnternehmer: vi.fn().mockResolvedValue(undefined),
    selectFirma: vi.fn().mockResolvedValue(undefined),
    selectFiliale: vi.fn(),
    updateFirma: vi.fn(),
    updateFiliale: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    strukturBearbeitenStoreMock.selectedFirma.set(null);
    strukturBearbeitenStoreMock.selectedFiliale.set(null);
    strukturBearbeitenStoreMock.inProgress.set(false);
    strukturBearbeitenStoreMock.updateError.set(null);
    strukturBearbeitenStoreMock.updateSuccess.set(null);
    strukturBearbeitenStoreMock.istMaster.set(false);
  });

  it('should render the entrepreneur selector for a master', async () => {
    strukturBearbeitenStoreMock.istMaster.set(true);
    await TestBed.configureTestingModule({
      imports: [StrukturVerwaltenPage, NoopAnimationsModule],
    })
      .overrideComponent(StrukturVerwaltenPage, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openDialogMock } },
            { provide: StrukturBearbeitenStore, useValue: strukturBearbeitenStoreMock },
          ],
        },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(StrukturVerwaltenPage);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('mat-select')).toHaveLength(3);
    expect(compiled.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
    expect(compiled.textContent).toContain('Dem Benutzer sind keine Unternehmer zugeordnet.');
    expect(strukturBearbeitenStoreMock.loadUnternehmer).toHaveBeenCalledOnce();
  });

  it('should hide the entrepreneur selector for an office user', async () => {
    await TestBed.configureTestingModule({
      imports: [StrukturVerwaltenPage, NoopAnimationsModule],
    })
      .overrideComponent(StrukturVerwaltenPage, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openDialogMock } },
            { provide: StrukturBearbeitenStore, useValue: strukturBearbeitenStoreMock },
          ],
        },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(StrukturVerwaltenPage);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('mat-select')).toHaveLength(2);
    expect(compiled.querySelector('mat-label')?.textContent).toBe('Firma');
  });

  it('should open the company dialog for the selected company', async () => {
    const firma = {
      id: 'firma-1',
      nummer: 1,
      aktiv: true,
      anzeigename: 'Firma',
      firmenname: 'Firma GmbH',
      adresse: {
        strasse: 'Hauptstraße',
        hausnummer: '1',
        postleitzahl: '20095',
        ort: 'Hamburg',
      },
      kontakt: {},
    };
    strukturBearbeitenStoreMock.selectedFirma.set(firma);
    await TestBed.configureTestingModule({
      imports: [StrukturVerwaltenPage, NoopAnimationsModule],
    })
      .overrideComponent(StrukturVerwaltenPage, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openDialogMock } },
            { provide: StrukturBearbeitenStore, useValue: strukturBearbeitenStoreMock },
          ],
        },
      })
      .compileComponents();
    const component = TestBed.createComponent(StrukturVerwaltenPage).componentInstance;

    component.openFirmaBearbeitenDialog();

    expect(openDialogMock).toHaveBeenCalledWith(
      FirmaBearbeitenDialog,
      expect.objectContaining({ data: { firma } }),
    );
  });

  it('should open the branch dialog for the selected branch', async () => {
    const filiale: IFilialeEintrag = {
      id: 'filiale-1',
      nummer: 1,
      aktiv: true,
      anzeigename: 'Filiale',
      filialname: 'Spielhalle',
      adresse: {
        strasse: 'Nebenstraße',
        hausnummer: '2',
        postleitzahl: '20095',
        ort: 'Hamburg',
      },
      kontakt: {},
    };
    strukturBearbeitenStoreMock.selectedFiliale.set(filiale);
    await TestBed.configureTestingModule({
      imports: [StrukturVerwaltenPage, NoopAnimationsModule],
    })
      .overrideComponent(StrukturVerwaltenPage, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openDialogMock } },
            { provide: StrukturBearbeitenStore, useValue: strukturBearbeitenStoreMock },
          ],
        },
      })
      .compileComponents();
    const component = TestBed.createComponent(StrukturVerwaltenPage).componentInstance;

    component.openFilialeBearbeitenDialog();

    expect(openDialogMock).toHaveBeenCalledWith(
      FilialeBearbeitenDialog,
      expect.objectContaining({ data: { filiale } }),
    );
  });
});
