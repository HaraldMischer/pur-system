// pur-system/src/app/pages/verwaltung-page/verwaltung-page.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IFirmaEintrag } from '../../commons/models/domain/firma';
import { IFilialeEintrag } from '../../commons/models/domain/filiale';
import { VerwaltungStore } from '../../stores/domain/verwaltung.store';
import { FilialeBearbeitenDialog } from './filiale-bearbeiten-dialog/filiale-bearbeiten-dialog';
import { FirmaBearbeitenDialog } from './firma-bearbeiten-dialog/firma-bearbeiten-dialog';
import { VerwaltungPage } from './verwaltung-page';

describe('VerwaltungPage', () => {
  const openDialogMock = vi.fn();
  const verwaltungStoreMock = {
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
    verwaltungStoreMock.selectedFirma.set(null);
    verwaltungStoreMock.selectedFiliale.set(null);
    verwaltungStoreMock.inProgress.set(false);
    verwaltungStoreMock.updateError.set(null);
    verwaltungStoreMock.updateSuccess.set(null);
    verwaltungStoreMock.istMaster.set(false);
  });

  it('should render the entrepreneur selector for a master', async () => {
    verwaltungStoreMock.istMaster.set(true);
    await TestBed.configureTestingModule({
      imports: [VerwaltungPage, NoopAnimationsModule],
    })
      .overrideComponent(VerwaltungPage, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openDialogMock } },
            { provide: VerwaltungStore, useValue: verwaltungStoreMock },
          ],
        },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(VerwaltungPage);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.pur-page-section__title')?.textContent).toContain(
      'Firmen und Filialen verwalten',
    );
    expect(compiled.querySelectorAll('mat-select')).toHaveLength(3);
    expect(compiled.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
    expect(compiled.textContent).toContain('Dem Benutzer sind keine Unternehmer zugeordnet.');
    expect(compiled.querySelector('.pur-form--grid')).not.toBeNull();
    expect(verwaltungStoreMock.loadUnternehmer).toHaveBeenCalledOnce();
  });

  it('should hide the entrepreneur selector for an office user', async () => {
    await TestBed.configureTestingModule({
      imports: [VerwaltungPage, NoopAnimationsModule],
    })
      .overrideComponent(VerwaltungPage, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openDialogMock } },
            { provide: VerwaltungStore, useValue: verwaltungStoreMock },
          ],
        },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(VerwaltungPage);

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
    verwaltungStoreMock.selectedFirma.set(firma);
    await TestBed.configureTestingModule({
      imports: [VerwaltungPage, NoopAnimationsModule],
    })
      .overrideComponent(VerwaltungPage, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openDialogMock } },
            { provide: VerwaltungStore, useValue: verwaltungStoreMock },
          ],
        },
      })
      .compileComponents();
    const component = TestBed.createComponent(VerwaltungPage).componentInstance;

    component.openFirmaBearbeitenDialog();

    expect(openDialogMock).toHaveBeenCalledWith(FirmaBearbeitenDialog, {
      data: { firma },
      panelClass: ['pur-dialog__panel'],
    });
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
    verwaltungStoreMock.selectedFiliale.set(filiale);
    await TestBed.configureTestingModule({
      imports: [VerwaltungPage, NoopAnimationsModule],
    })
      .overrideComponent(VerwaltungPage, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openDialogMock } },
            { provide: VerwaltungStore, useValue: verwaltungStoreMock },
          ],
        },
      })
      .compileComponents();
    const component = TestBed.createComponent(VerwaltungPage).componentInstance;

    component.openFilialeBearbeitenDialog();

    expect(openDialogMock).toHaveBeenCalledWith(FilialeBearbeitenDialog, {
      data: { filiale },
      panelClass: ['pur-dialog__panel'],
    });
  });
});
