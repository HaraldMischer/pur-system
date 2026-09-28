// pur-system/src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IBenutzerProfilDokument } from '../../../commons/models/domain/benutzer';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { StammdatenStore } from '../../../stores/app/stammdaten.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { MitarbeiterAnlegenDialog } from './mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog';
import { MitarbeiterBearbeitenDialog } from './mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog';
import { MitarbeiterListePage } from './mitarbeiter-liste-page';

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
    rolle: 'service',
    filialIds: [],
    aktiv: true,
  };
  const unternehmer = signal([{ id: 'u-1', nummer: 1, anzeigename: 'Unternehmer' }]);
  const firmen = [
    {
      id: 'f-1',
      nummer: 1,
      anzeigename: 'Firma',
      firmenname: 'Firma GmbH',
      adresse: { strasse: 'Weg', hausnummer: '1', postleitzahl: '12345', ort: 'Ort' },
      kontakt: {},
      aktiv: true,
    },
  ];
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
  let stammdatenStoreMock: {
    unternehmer: typeof unternehmer;
    download: ReturnType<typeof signal<boolean>>;
    isLoaded: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    getFirmen: ReturnType<typeof vi.fn>;
    getFilialen: ReturnType<typeof vi.fn>;
  };
  let mitarbeiterStoreMock: {
    inProgress: typeof inProgress;
    loadMitarbeiter: ReturnType<typeof vi.fn>;
    getMitarbeiter: ReturnType<typeof vi.fn>;
    isMitarbeiterKontextLoading: ReturnType<typeof vi.fn>;
    isMitarbeiterKontextLoaded: ReturnType<typeof vi.fn>;
    getMitarbeiterKontextError: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    unternehmer.set([{ id: 'u-1', nummer: 1, anzeigename: 'Unternehmer' }]);
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
      unternehmer,
      download: signal(false),
      isLoaded: signal(true),
      error: signal(null),
      getFirmen: vi.fn().mockReturnValue(firmen),
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
    };

    TestBed.configureTestingModule({
      imports: [MitarbeiterListePage],
      providers: [
        { provide: MatDialog, useValue: dialogMock },
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

    fixture.componentInstance.openMitarbeiterAnlegenDialog();
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

  it('should select a single company automatically and render its employees', async () => {
    const fixture = TestBed.createComponent(MitarbeiterListePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledWith('u-1', 'f-1', undefined);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mia Muster');
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

  it('should wait for a company selection when multiple companies are available', async () => {
    stammdatenStoreMock.getFirmen.mockReturnValue([
      ...firmen,
      { ...firmen[0], id: 'f-2', anzeigename: 'Zweite Firma' },
    ]);
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
    compiled.querySelector<HTMLButtonElement>('button')?.click();
    await fixture.whenStable();

    expect(mitarbeiterStoreMock.loadMitarbeiter).toHaveBeenCalledTimes(2);
  });
});
