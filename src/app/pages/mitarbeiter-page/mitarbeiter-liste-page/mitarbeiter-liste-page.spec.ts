// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IBenutzerProfilDokument } from '../../../commons/models/domain/benutzer';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IFirmaEintrag } from '../../../commons/models/domain/firma';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { IUnternehmerEintrag } from '../../../commons/models/domain/unternehmer';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { StammdatenStore } from '../../../stores/app/stammdaten.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { MitarbeiterAnlegenDialog } from './mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog';
import { MitarbeiterBearbeitenDialog } from './mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog';
import { MitarbeiterListePage } from './mitarbeiter-liste-page';
import { MitarbeiterZusammenfuehrenDialog } from './mitarbeiter-zusammenfuehren-dialog/mitarbeiter-zusammenfuehren-dialog';

describe('MitarbeiterListePage', () => {
  const mitarbeiter: IMitarbeiterEintrag = {
    id: 'm-1',
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    person: {
      vorname: 'Mia',
      nachname: 'Muster',
      adresse: {
        strasse: 'Musterstraße',
        hausnummer: '1',
        postleitzahl: '12345',
        ort: 'Musterstadt',
      },
      kontakt: {},
    },
    rollen: ['servicekraft'],
    filialIds: [],
    aktiv: true,
  };
  const unternehmer: IUnternehmerEintrag = {
    id: 'u-1',
    nummer: 1,
    anzeigename: 'Unternehmer',
  };
  const firma: IFirmaEintrag = {
    id: 'f-1',
    nummer: 1,
    anzeigename: 'Firma',
    firmenname: 'Firma GmbH',
    adresse: { strasse: 'Weg', hausnummer: '1', postleitzahl: '12345', ort: 'Ort' },
    kontakt: {},
    aktiv: true,
  };
  const filiale: IFilialeEintrag = {
    id: 'b-1',
    nummer: 1,
    anzeigename: 'Filiale 1',
    filialname: 'Filiale 1',
    adresse: { strasse: 'Weg', hausnummer: '1', postleitzahl: '12345', ort: 'Ort' },
    kontakt: {},
    aktiv: true,
  };
  const selectedUnternehmer = signal<IUnternehmerEintrag | null>(unternehmer);
  const selectedFirma = signal<IFirmaEintrag | null>(firma);
  const selectedFiliale = signal<IFilialeEintrag | null>(null);
  const mitarbeiterSignal = signal<IMitarbeiterEintrag[]>([]);
  const download = signal(false);
  const isLoaded = signal(false);
  const error = signal<string | null>(null);
  const inProgress = signal(false);
  const benutzerProfil = signal<IBenutzerProfilDokument | null>({
    email: 'office@example.com',
    anzeigename: 'Office',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard', 'mitarbeiter'],
    zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
  });
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let stammdatenStoreMock: { getFilialen: ReturnType<typeof vi.fn> };
  let mitarbeiterStoreMock: {
    inProgress: typeof inProgress;
    loadMitarbeiter: ReturnType<typeof vi.fn>;
    getMitarbeiter: ReturnType<typeof vi.fn>;
    isMitarbeiterKontextLoading: ReturnType<typeof vi.fn>;
    isMitarbeiterKontextLoaded: ReturnType<typeof vi.fn>;
    getMitarbeiterKontextError: ReturnType<typeof vi.fn>;
    mergeMitarbeiter: ReturnType<typeof vi.fn>;
    error: typeof error;
  };

  beforeEach(() => {
    selectedUnternehmer.set(unternehmer);
    selectedFirma.set(firma);
    selectedFiliale.set(null);
    mitarbeiterSignal.set([]);
    download.set(false);
    isLoaded.set(false);
    error.set(null);
    inProgress.set(false);
    benutzerProfil.set({
      email: 'office@example.com',
      anzeigename: 'Office',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard', 'mitarbeiter'],
      zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
    });
    dialogMock = { open: vi.fn() };
    stammdatenStoreMock = {
      getFilialen: vi.fn().mockReturnValue([{ id: 'b-1', anzeigename: 'Filiale 1' }]),
    };
    mitarbeiterStoreMock = {
      inProgress,
      loadMitarbeiter: vi.fn().mockImplementation(async () => {
        mitarbeiterSignal.set([mitarbeiter]);
        isLoaded.set(true);
      }),
      getMitarbeiter: vi.fn().mockImplementation(() => {
        return mitarbeiterSignal();
      }),
      isMitarbeiterKontextLoading: vi.fn().mockImplementation(() => {
        return download();
      }),
      isMitarbeiterKontextLoaded: vi.fn().mockImplementation(() => {
        return isLoaded();
      }),
      getMitarbeiterKontextError: vi.fn().mockImplementation(() => {
        return error();
      }),
      mergeMitarbeiter: vi.fn().mockResolvedValue(undefined),
      error,
    };

    TestBed.configureTestingModule({
      imports: [MitarbeiterListePage],
      providers: [
        { provide: MatDialog, useValue: dialogMock },
        {
          provide: AppKontextStore,
          useValue: { selectedUnternehmer, selectedFirma, selectedFiliale },
        },
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        { provide: StammdatenStore, useValue: stammdatenStoreMock },
        { provide: MitarbeiterStore, useValue: mitarbeiterStoreMock },
      ],
    });
  });

  it('should open create and edit dialogs with the selected company context', async () => {
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const addButton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (button) => button.textContent?.includes('Mitarbeiter hinzufügen'),
    );
    expect(addButton).toBeDefined();
    addButton?.click();
    fixture.componentInstance.openMitarbeiterBearbeitenDialog(mitarbeiter);

    expect(dialogMock.open).toHaveBeenNthCalledWith(
      1,
      MitarbeiterAnlegenDialog,
      expect.objectContaining({
        data: expect.objectContaining({ unternehmerId: 'u-1', firmaId: 'f-1' }),
      }),
    );
    expect(dialogMock.open).toHaveBeenNthCalledWith(
      2,
      MitarbeiterBearbeitenDialog,
      expect.objectContaining({
        data: expect.objectContaining({ mitarbeiter }),
      }),
    );
  });

  it('should load and render employees for the selected app context', async () => {
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith('u-1', 'f-1', undefined);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mia Muster');
  });

  it('should load employees again after the selected company changes', async () => {
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();

    selectedFirma.set({ ...firma, id: 'f-2', anzeigename: 'Zweite Firma' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenLastCalledWith('u-1', 'f-2', undefined);
  });

  it('should filter already loaded employees by the selected branch without loading again', async () => {
    const mitarbeiterFiliale = {
      ...mitarbeiter,
      id: 'm-b-1',
      filialIds: ['b-1'],
      person: { ...mitarbeiter.person, vorname: 'Filiale', nachname: 'Eins' },
    };
    const mitarbeiterAndereFiliale = {
      ...mitarbeiter,
      id: 'm-b-2',
      filialIds: ['b-2'],
      person: { ...mitarbeiter.person, vorname: 'Filiale', nachname: 'Zwei' },
    };
    mitarbeiterStoreMock.loadMitarbeiter.mockImplementation(async () => {
      mitarbeiterSignal.set([mitarbeiterFiliale, mitarbeiterAndereFiliale]);
      isLoaded.set(true);
    });
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();

    selectedFiliale.set(filiale);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledOnce();
    expect(text).toContain('Filiale Eins');
    expect(text).not.toContain('Filiale Zwei');
  });

  it('should load only employees of the assigned branch for a branch account', async () => {
    benutzerProfil.set({
      ...benutzerProfil()!,
      userRole: 'filiale',
    });
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith('u-1', 'f-1', 'b-1');
  });

  it('should wait while the app context contains no company', async () => {
    selectedFirma.set(null);
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mitarbeiterStoreMock.loadMitarbeiter).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Wähle eine Firma, um deren Mitarbeiter anzuzeigen.',
    );
  });

  it('should show an empty state for a company without employees', async () => {
    mitarbeiterStoreMock.loadMitarbeiter.mockImplementation(async () => {
      isLoaded.set(true);
    });
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Die Firma hat noch keine Mitarbeiter.',
    );
  });

  it('should open the merge dialog for a master with another available employee', async () => {
    const ziel = { ...mitarbeiter, id: 'm-2', person: { ...mitarbeiter.person, vorname: 'Mara' } };
    mitarbeiterSignal.set([mitarbeiter, ziel]);
    isLoaded.set(true);
    mitarbeiterStoreMock.loadMitarbeiter.mockImplementation(async () => undefined);
    benutzerProfil.set({ ...benutzerProfil()!, userRole: 'master', zugriffe: {} });
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const mergeButton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (button) => button.textContent?.includes('Zusammenführen'),
    );
    mergeButton?.click();

    expect(dialogMock.open).toHaveBeenCalledWith(MitarbeiterZusammenfuehrenDialog, {
      data: { quelle: mitarbeiter, mitarbeiter: [mitarbeiter, ziel] },
    });
  });

  it('should switch between active and inactive employees', async () => {
    const inaktiverMitarbeiter = {
      ...mitarbeiter,
      id: 'm-2',
      person: { ...mitarbeiter.person, vorname: 'Inaktiv' },
      aktiv: false,
    };
    mitarbeiterSignal.set([mitarbeiter, inaktiverMitarbeiter]);
    isLoaded.set(true);
    mitarbeiterStoreMock.loadMitarbeiter.mockImplementation(async () => undefined);
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mia Muster');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Inaktiv Muster');

    fixture.componentInstance.mitarbeiterAnsicht.set('inaktiv');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Mia Muster');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Inaktiv Muster');
  });

  it('should retain the selected company and offer a retry after loading fails', async () => {
    mitarbeiterStoreMock.loadMitarbeiter.mockImplementation(async () => {
      error.set('Mitarbeiter konnten nicht geladen werden.');
      throw new Error('load failed');
    });
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Mitarbeiter konnten nicht geladen werden.');
    [...compiled.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Erneut laden'))
      ?.click();
    await fixture.whenStable();

    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledTimes(2);
  });
});
