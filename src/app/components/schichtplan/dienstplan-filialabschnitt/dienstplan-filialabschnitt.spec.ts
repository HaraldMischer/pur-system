// pur-system/src/app/components/schichtplan/dienstplan-filialabschnitt/dienstplan-filialabschnitt.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IBenutzerProfilDokument } from '../../../commons/models/domain/benutzer';
import {
  IDienstplanEintrag,
  IDienstplanVersionEintrag,
} from '../../../commons/models/domain/dienstplan';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtvorlageEintrag } from '../../../commons/models/domain/schichtvorlage';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import {
  DienstplanStore,
  TDienstplanKontextBestand,
} from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import { SchichtBearbeitenDialog } from '../schicht-bearbeiten-dialog/schicht-bearbeiten-dialog';
import { DienstplanFilialabschnitt } from './dienstplan-filialabschnitt';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;
const FILIALE: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};
const DIENSTPLAN: IDienstplanEintrag = {
  ...PFAD,
  id: '2026-10',
  zeitraumStart: '2026-10-01',
  zeitraumEnde: '2026-10-31',
  zeitzone: 'Europe/Berlin',
  entwurfVersionId: 'v-1',
  naechsteVersionsnummer: 2,
  erstelltVonUid: 'uid-1',
  aktualisiertVonUid: 'uid-1',
};
const VERSION: IDienstplanVersionEintrag = {
  ...PFAD,
  id: 'v-1',
  dienstplanId: '2026-10',
  nummer: 1,
  revision: 0,
  status: 'entwurf',
  erstelltVonUid: 'uid-1',
  aktualisiertVonUid: 'uid-1',
};
const MITARBEITER: IMitarbeiterEintrag = {
  id: 'm-1',
  unternehmerId: 'u-1',
  firmaId: 'f-1',
  aktiv: true,
  filialIds: ['b-1'],
  rollen: [],
  person: {
    vorname: 'Mia',
    nachname: 'Muster',
    adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
    kontakt: {},
  },
};
const SCHICHTVORLAGE: ISchichtvorlageEintrag = {
  ...PFAD,
  id: 'sv-1',
  bezeichnung: 'Frühschicht',
  beginnLokalzeit: '08:00',
  endeLokalzeit: '16:30',
  endetAmFolgetag: false,
  standardpauseMinuten: 30,
  aktiv: true,
  erstelltVonUid: 'uid-1',
  aktualisiertVonUid: 'uid-1',
};

function createKontext(
  aktualisierung: Partial<TDienstplanKontextBestand> = {},
): TDienstplanKontextBestand {
  return {
    ...PFAD,
    dienstplaene: [],
    versionen: [],
    schichten: [],
    monatsmodi: { '2026-10': 'vollstaendig' },
    vollstaendigGeladen: false,
    download: false,
    isLoaded: true,
    error: null,
    ...aktualisierung,
  };
}

describe('DienstplanFilialabschnitt', () => {
  const benutzerProfil = signal<IBenutzerProfilDokument>({
    email: 'office@example.com',
    anzeigename: 'Office',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard', 'schichtplan'],
    zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
  });
  const kontext = signal<TDienstplanKontextBestand | null>(createKontext());
  const inProgress = signal(false);
  const dienstplanError = signal<string | null>(null);
  const schichtvorlageError = signal<string | null>(null);
  const loadDienstplanMonat = vi.fn().mockResolvedValue(undefined);
  const createDienstplan = vi.fn().mockResolvedValue(undefined);
  const loadSchichtvorlagen = vi.fn().mockResolvedValue(undefined);
  const dialogOpen = vi.fn();
  const getMitarbeiter = vi.fn().mockReturnValue([]);
  const schichtvorlagen = signal<readonly ISchichtvorlageEintrag[]>([]);

  beforeEach(async () => {
    benutzerProfil.set({
      email: 'office@example.com',
      anzeigename: 'Office',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard', 'schichtplan'],
      zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
    });
    kontext.set(createKontext());
    inProgress.set(false);
    dienstplanError.set(null);
    schichtvorlageError.set(null);
    loadDienstplanMonat.mockResolvedValue(undefined);
    createDienstplan.mockResolvedValue(undefined);
    loadSchichtvorlagen.mockResolvedValue(undefined);
    getMitarbeiter.mockReturnValue([]);
    schichtvorlagen.set([]);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DienstplanFilialabschnitt],
      providers: [
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        {
          provide: DienstplanStore,
          useValue: {
            getDienstplanKontext: vi.fn(() => kontext()),
            loadDienstplanMonat,
            createDienstplan,
            inProgress,
            error: dienstplanError,
          },
        },
        {
          provide: MitarbeiterStore,
          useValue: {
            getMitarbeiter,
            getMitarbeiterById: vi.fn().mockReturnValue(null),
          },
        },
        {
          provide: SchichtvorlageStore,
          useValue: {
            error: schichtvorlageError,
            loadSchichtvorlagen,
            getSchichtvorlageKontext: vi.fn(() => {
              return {
                ...PFAD,
                schichtvorlagen: schichtvorlagen(),
                download: false,
                isLoaded: true,
                error: schichtvorlageError(),
              };
            }),
          },
        },
        { provide: MatDialog, useValue: { open: dialogOpen } },
      ],
    }).compileComponents();
  });
  function createComponent(planungsmodus = false) {
    const fixture = TestBed.createComponent(DienstplanFilialabschnitt);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.componentRef.setInput('monat', '2026-10');
    fixture.componentRef.setInput('planungsmodus', planungsmodus);
    return fixture;
  }

  it('should load and render the monthly state of its branch', async () => {
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loadDienstplanMonat).toHaveBeenCalledWith(PFAD, '2026-10', false);
    expect(fixture.nativeElement.querySelector('h3')?.textContent).toContain(FILIALE.anzeigename);
    expect(fixture.nativeElement.querySelector('.pur-page-section__empty-state')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.pur-page-section__empty-state button'),
    ).not.toBeNull();
  });

  it('should keep a missing plan read-only outside planning mode', async () => {
    const fixture = createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.pur-page-section__empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pur-page-section__empty-state button')).toBeNull();
  });

  it('should create only the missing plan of its branch', async () => {
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.createDienstplan();

    expect(createDienstplan).toHaveBeenCalledWith(PFAD, '2026-10');
  });

  it('should load only published data for an employee account', async () => {
    benutzerProfil.set({
      email: 'mitarbeiter@example.com',
      anzeigename: 'Mitarbeiter',
      aktiv: true,
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['dashboard', 'schichtplan'],
      zugriffe: { 'u-1': { 'f-1': [] } },
    });
    const fixture = createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loadDienstplanMonat).toHaveBeenCalledWith(PFAD, '2026-10', true);
  });

  it('should load branch templates before opening its shift dialog', async () => {
    getMitarbeiter.mockReturnValue([
      MITARBEITER,
      { ...MITARBEITER, id: 'm-inaktiv', aktiv: false },
      { ...MITARBEITER, id: 'm-andere-filiale', filialIds: ['b-2'] },
    ]);
    schichtvorlagen.set([SCHICHTVORLAGE]);
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.openSchichtDialog('2026-10-05');

    expect(loadSchichtvorlagen).toHaveBeenCalledWith(PFAD);
    expect(dialogOpen).toHaveBeenCalledWith(
      SchichtBearbeitenDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          pfad: { ...PFAD, dienstplanId: '2026-10', versionId: 'v-1' },
          datum: '2026-10-05',
          mitarbeiter: [MITARBEITER],
          schichtvorlagen: [SCHICHTVORLAGE],
        }),
      }),
    );
  });
});
