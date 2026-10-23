// pur-system/src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Timestamp } from 'firebase/firestore';
import { of } from 'rxjs';

import { IBenutzerProfilDokument } from '../../../commons/models/domain/benutzer';
import {
  IDienstplanEintrag,
  IDienstplanVersionEintrag,
} from '../../../commons/models/domain/dienstplan';
import { IDienstplanKalendertag } from '../../../commons/models/domain/dienstplan-kalendertag';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import {
  IModellschichtMomentaufnahmeEintrag,
  ISchichtrastermodellBestand,
} from '../../../commons/models/domain/schichtmodell';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import {
  DienstplanStore,
  TDienstplanKontextBestand,
} from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { MitarbeiterbelegungStore } from '../../../stores/domain/mitarbeiterbelegung.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { BestaetigungDialog } from '../../shared/bestaetigung-dialog/bestaetigung-dialog';
import { SchichtBearbeitenDialog } from '../schicht-bearbeiten-dialog/schicht-bearbeiten-dialog';
import { DienstplanAnlegenDialog } from '../dienstplan-anlegen-dialog/dienstplan-anlegen-dialog';
import { DienstplanPlanungsbereich } from './dienstplan-planungsbereich';

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
  kalendertage: createKalendertage(),
  id: '2026-10',
  zeitraumStart: '2026-10-01',
  zeitraumEnde: '2026-10-31',
  zeitzone: 'Europe/Berlin',
  schichtmodellId: 'modell-1',
  schichtmodellBezeichnung: 'Sommer',
  planungsart: 'schichtraster',
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

function createKalendertage(): IDienstplanKalendertag[] {
  const wochentage = [
    'sonntag',
    'montag',
    'dienstag',
    'mittwoch',
    'donnerstag',
    'freitag',
    'samstag',
  ] as const;
  return Array.from({ length: 31 }, (_, index) => {
    const datum = `2026-10-${String(index + 1).padStart(2, '0')}`;
    const wochentag = wochentage[new Date(`${datum}T12:00:00Z`).getUTCDay()];
    return {
      datum,
      wochentag,
      istSonntag: wochentag === 'sonntag',
      aktiveSondertage: [],
      oeffnungsregelQuelle: 'wochentag',
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '08:00',
        endeLokalzeit: '18:00',
        endetAmFolgetag: false,
      },
      rasterzeiten: [
        {
          modellschichtId: 'frueh',
          beginnLokalzeit: '07:00',
          endeLokalzeit: '12:00',
          beginntAmFolgetag: false,
          endetAmFolgetag: false,
        },
      ],
    };
  });
}
const MODELLSCHICHT: IModellschichtMomentaufnahmeEintrag = {
  ...PFAD,
  id: 'frueh',
  dienstplanId: '2026-10',
  bezeichnung: 'Früh',
  reihenfolge: 0,
  mehrfachbelegungErlaubt: false,
};

function createKontext(
  aktualisierung: Partial<TDienstplanKontextBestand> = {},
): TDienstplanKontextBestand {
  return {
    ...PFAD,
    dienstplaene: [],
    versionen: [],
    schichten: [],
    modellschichten: [],
    monatsmodi: { '2026-10': 'vollstaendig' },
    vollstaendigGeladen: false,
    download: false,
    isLoaded: true,
    error: null,
    ...aktualisierung,
  };
}

describe('DienstplanPlanungsbereich', () => {
  const benutzerProfil = signal<IBenutzerProfilDokument>({
    email: 'office@example.com',
    anzeigename: 'Office',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard', 'schichtplan'],
    zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
  });
  const kontext = signal<TDienstplanKontextBestand | null>(createKontext());
  const weitereKontexte = signal<readonly TDienstplanKontextBestand[]>([]);
  const inProgress = signal(false);
  const dienstplanError = signal<string | null>(null);
  const loadDienstplanMonat = vi.fn().mockResolvedValue(undefined);
  const createSchicht = vi.fn().mockResolvedValue(undefined);
  const updateSchicht = vi.fn().mockResolvedValue(undefined);
  const deleteDienstplan = vi.fn().mockResolvedValue(undefined);
  const publishDienstplan = vi.fn().mockResolvedValue(undefined);
  const createEntwurfAusVeroeffentlichung = vi.fn().mockResolvedValue(undefined);
  const loadSchichtmodelle = vi.fn().mockResolvedValue(undefined);
  const dialogOpen = vi.fn();
  const getMitarbeiter = vi.fn().mockReturnValue([]);
  const belegungskonflikte = signal<readonly never[]>([]);
  const hatMitarbeiterZeitkonflikt = vi.fn().mockReturnValue(false);
  const schichtmodelle = signal<readonly ISchichtrastermodellBestand[]>([createSchichtmodell()]);

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
    weitereKontexte.set([]);
    inProgress.set(false);
    dienstplanError.set(null);
    loadDienstplanMonat.mockResolvedValue(undefined);
    createSchicht.mockResolvedValue(undefined);
    updateSchicht.mockResolvedValue(undefined);
    deleteDienstplan.mockResolvedValue(undefined);
    publishDienstplan.mockResolvedValue(undefined);
    createEntwurfAusVeroeffentlichung.mockResolvedValue(undefined);
    loadSchichtmodelle.mockResolvedValue(undefined);
    getMitarbeiter.mockReturnValue([]);
    belegungskonflikte.set([]);
    hatMitarbeiterZeitkonflikt.mockReturnValue(false);
    schichtmodelle.set([createSchichtmodell()]);
    vi.clearAllMocks();
    dialogOpen.mockReturnValue({ afterClosed: () => of(false) });
    await TestBed.configureTestingModule({
      imports: [DienstplanPlanungsbereich],
      providers: [
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        {
          provide: DienstplanStore,
          useValue: {
            getDienstplanKontext: vi.fn(() => kontext()),
            kontexte: vi.fn(() => {
              const eintraege = [kontext(), ...weitereKontexte()].filter(
                (eintrag): eintrag is TDienstplanKontextBestand => eintrag !== null,
              );
              return Object.fromEntries(eintraege.map((eintrag) => [eintrag.filialeId, eintrag]));
            }),
            loadDienstplanMonat,
            createSchicht,
            updateSchicht,
            deleteDienstplan,
            publishDienstplan,
            createEntwurfAusVeroeffentlichung,
            inProgress,
            error: dienstplanError,
          },
        },
        {
          provide: SchichtmodellStore,
          useValue: {
            loadSchichtmodelle,
            error: signal<string | null>(null),
            getSchichtmodellKontext: vi.fn(() => {
              return {
                ...PFAD,
                schichtmodelle: schichtmodelle(),
                download: false,
                isLoaded: true,
                error: null,
              };
            }),
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
          provide: MitarbeiterbelegungStore,
          useValue: {
            konflikte: belegungskonflikte,
            hatMitarbeiterZeitkonflikt,
          },
        },
        { provide: MatDialog, useValue: { open: dialogOpen } },
      ],
    }).compileComponents();
  });
  function createComponent(planungsmodus = false) {
    const fixture = TestBed.createComponent(DienstplanPlanungsbereich);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.componentRef.setInput('monat', '2026-10');
    fixture.componentRef.setInput('planungsmodus', planungsmodus);
    fixture.componentRef.setInput('belegungsstandVerfuegbar', true);
    return fixture;
  }

  it('should load the monthly state of its branch', async () => {
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loadDienstplanMonat).toHaveBeenCalledWith(PFAD, '2026-10', false);
    expect(fixture.componentInstance.dienstplan()).toBeNull();
    expect(fixture.componentInstance.darfSchreiben()).toBe(true);
  });

  it('should keep a missing plan read-only outside planning mode', async () => {
    const fixture = createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.dienstplan()).toBeNull();
    expect(fixture.componentInstance.darfSchreiben()).toBe(false);
    await fixture.componentInstance.openDienstplanDialog();
    expect(loadSchichtmodelle).not.toHaveBeenCalled();
    expect(dialogOpen).not.toHaveBeenCalled();
  });

  it('should lock write actions while the live allocation state is unavailable', async () => {
    const fixture = createComponent(true);
    fixture.componentRef.setInput('belegungsstandVerfuegbar', false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.darfSchreiben()).toBe(false);
    await fixture.componentInstance.openDienstplanDialog();
    expect(loadSchichtmodelle).not.toHaveBeenCalled();
    expect(dialogOpen).not.toHaveBeenCalled();
  });

  it('should load branch models before opening the plan dialog', async () => {
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.openDienstplanDialog();

    expect(loadSchichtmodelle).toHaveBeenCalledWith(PFAD);
    expect(dialogOpen).toHaveBeenCalledWith(
      DienstplanAnlegenDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          pfad: PFAD,
          monat: '2026-10',
          schichtmodelle: [createSchichtmodell()],
        }),
      }),
    );
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

  it('should delete an empty never-published draft after confirmation', async () => {
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
      }),
    );
    const fixture = createComponent(true);
    dialogOpen.mockReturnValue({ afterClosed: () => of(true) });
    fixture.detectChanges();
    await fixture.whenStable();

    const button = [...fixture.nativeElement.querySelectorAll('button')].find((element) => {
      return element.textContent.includes('Dienstplan löschen');
    });
    expect(button?.disabled).toBe(false);
    button?.click();
    await fixture.whenStable();

    expect(dialogOpen).toHaveBeenCalledWith(
      BestaetigungDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          titel: 'Dienstplan löschen',
          bestaetigenText: 'Löschen',
        }),
      }),
    );
    expect(deleteDienstplan).toHaveBeenCalledWith({
      ...PFAD,
      dienstplanId: '2026-10',
      versionId: 'v-1',
    });
  });

  it('should disable deleting while the draft contains a shift', async () => {
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
        schichten: [
          {
            ...PFAD,
            id: 's-1',
            dienstplanId: '2026-10',
            versionId: 'v-1',
            datum: '2026-10-05',
            mitarbeiterId: 'm-1',
            modellschichtId: 'frueh',
            beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
            ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
        ],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = [...fixture.nativeElement.querySelectorAll('button')].find((element) => {
      return element.textContent.includes('Dienstplan löschen');
    });
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('title')).toContain('Lösche zuerst alle Schichten');
  });

  it('should hide deleting after the first publication', async () => {
    kontext.set(
      createKontext({
        dienstplaene: [{ ...DIENSTPLAN, veroeffentlichteVersionId: 'v-0' }],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = [...fixture.nativeElement.querySelectorAll('button')].find((element) => {
      return element.textContent.includes('Dienstplan löschen');
    });
    expect(button).toBeUndefined();
  });

  it('should publish a conflict-free draft after confirmation', async () => {
    getMitarbeiter.mockReturnValue([MITARBEITER]);
    kontext.set(
      createKontext({
        dienstplaene: [
          {
            ...DIENSTPLAN,
            zeitraumStart: '2026-10-05',
            zeitraumEnde: '2026-10-05',
            kalendertage: DIENSTPLAN.kalendertage.filter((kalendertag) => {
              return kalendertag.datum === '2026-10-05';
            }),
          },
        ],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
        schichten: [
          {
            ...PFAD,
            id: 's-1',
            dienstplanId: '2026-10',
            versionId: 'v-1',
            datum: '2026-10-05',
            mitarbeiterId: 'm-1',
            modellschichtId: 'frueh',
            beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
            ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
        ],
      }),
    );
    dialogOpen.mockReturnValue({ afterClosed: () => of(true) });
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.publishDienstplan();

    expect(dialogOpen).toHaveBeenCalledWith(
      BestaetigungDialog,
      expect.objectContaining({
        data: expect.objectContaining({ bestaetigenText: 'Veröffentlichen' }),
      }),
    );
    expect(publishDienstplan).toHaveBeenCalledWith({
      ...PFAD,
      dienstplanId: '2026-10',
      versionId: 'v-1',
    });
    expect(fixture.componentInstance.aktionsmeldung()).toContain('erfolgreich veröffentlicht');
  });

  it('should warn about unoccupied shift slots before publishing', async () => {
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
      }),
    );
    dialogOpen.mockReturnValue({ afterClosed: () => of(true) });
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.publishDienstplan();

    expect(fixture.componentInstance.unbesetzteSchichtplaetze()).toBe(31);
    expect(dialogOpen).toHaveBeenCalledWith(
      BestaetigungDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          nachricht: expect.stringContaining('31 unbesetzte Schichtplätze'),
          bestaetigenText: 'Trotzdem veröffentlichen',
        }),
      }),
    );
    expect(publishDienstplan).toHaveBeenCalledWith({
      ...PFAD,
      dienstplanId: '2026-10',
      versionId: 'v-1',
    });
  });

  it('should not offer publishing when a draft employee is no longer assignable', async () => {
    getMitarbeiter.mockReturnValue([]);
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
        schichten: [
          {
            ...PFAD,
            id: 's-1',
            dienstplanId: '2026-10',
            versionId: 'v-1',
            datum: '2026-10-05',
            mitarbeiterId: 'm-1',
            modellschichtId: 'frueh',
            beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
            ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
        ],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.dienstplanVeroeffentlichenDeaktiviert()).toBe(true);
    expect(fixture.componentInstance.dienstplanVeroeffentlichenHinweis()).toContain('inaktive');
  });

  it('should open a shift dialog for the selected grid cell', async () => {
    getMitarbeiter.mockReturnValue([
      MITARBEITER,
      { ...MITARBEITER, id: 'm-inaktiv', aktiv: false },
      { ...MITARBEITER, id: 'm-andere-filiale', filialIds: ['b-2'] },
    ]);
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openSchichtDialog({
      datum: '2026-10-05',
      modellschichtId: 'frueh',
    });

    expect(dialogOpen).toHaveBeenCalledWith(
      SchichtBearbeitenDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          pfad: { ...PFAD, dienstplanId: '2026-10', versionId: 'v-1' },
          datum: '2026-10-05',
          mitarbeiter: [MITARBEITER],
          modellschicht: MODELLSCHICHT,
        }),
      }),
    );
  });

  it('should create a shift directly for a valid employee drop', async () => {
    getMitarbeiter.mockReturnValue([MITARBEITER]);
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.createSchichtAusAblage({
      mitarbeiterId: 'm-1',
      datum: '2026-10-05',
      modellschichtId: 'frueh',
    });

    expect(createSchicht).toHaveBeenCalledWith(
      { ...PFAD, dienstplanId: '2026-10', versionId: 'v-1' },
      expect.objectContaining({
        datum: '2026-10-05',
        mitarbeiterId: 'm-1',
        modellschichtId: 'frueh',
      }),
    );
  });

  it('should reject a drop for an employee without branch assignment', async () => {
    getMitarbeiter.mockReturnValue([MITARBEITER]);
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.createSchichtAusAblage({
      mitarbeiterId: 'm-fremd',
      datum: '2026-10-05',
      modellschichtId: 'frueh',
    });

    expect(createSchicht).not.toHaveBeenCalled();
  });

  it('should reject an overlapping shift from the loaded draft', async () => {
    hatMitarbeiterZeitkonflikt.mockReturnValue(true);
    getMitarbeiter.mockReturnValue([MITARBEITER]);
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
        schichten: [
          {
            ...PFAD,
            id: 's-1',
            dienstplanId: '2026-10',
            versionId: 'v-1',
            datum: '2026-10-05',
            mitarbeiterId: 'm-1',
            modellschichtId: 'frueh',
            beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
            ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
        ],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.createSchichtAusAblage({
      mitarbeiterId: 'm-1',
      datum: '2026-10-05',
      modellschichtId: 'frueh',
    });

    expect(createSchicht).not.toHaveBeenCalled();
    expect(fixture.componentInstance.aktionsfehler()).toContain('bereits eingeplant');
  });

  it('should move an existing draft shift while preserving its identity and employee', async () => {
    getMitarbeiter.mockReturnValue([MITARBEITER]);
    const schicht = {
      ...PFAD,
      id: 's-1',
      dienstplanId: '2026-10',
      versionId: 'v-1',
      datum: '2026-10-05',
      mitarbeiterId: 'm-1',
      modellschichtId: 'frueh',
      beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
      ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
        schichten: [schicht],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.moveSchichtAusAblage({
      schicht,
      datum: '2026-10-06',
      modellschichtId: 'frueh',
    });

    expect(updateSchicht).toHaveBeenCalledWith(
      { ...PFAD, dienstplanId: '2026-10', versionId: 'v-1' },
      's-1',
      { datum: '2026-10-06', mitarbeiterId: 'm-1', modellschichtId: 'frueh' },
    );
  });

  it('should leave an existing shift unchanged when its move has a time conflict', async () => {
    hatMitarbeiterZeitkonflikt.mockReturnValue(true);
    getMitarbeiter.mockReturnValue([MITARBEITER]);
    const schicht = {
      ...PFAD,
      id: 's-1',
      dienstplanId: '2026-10',
      versionId: 'v-1',
      datum: '2026-10-05',
      mitarbeiterId: 'm-1',
      modellschichtId: 'frueh',
      beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
      ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
        schichten: [schicht],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.moveSchichtAusAblage({
      schicht,
      datum: '2026-10-06',
      modellschichtId: 'frueh',
    });

    expect(updateSchicht).not.toHaveBeenCalled();
    expect(fixture.componentInstance.aktionsfehler()).toContain('Mitarbeiterbelegung');
  });

  it('should allow directly consecutive shifts for the same employee', async () => {
    getMitarbeiter.mockReturnValue([MITARBEITER]);
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
        schichten: [
          {
            ...PFAD,
            id: 's-1',
            dienstplanId: '2026-10',
            versionId: 'v-1',
            datum: '2026-10-05',
            mitarbeiterId: 'm-1',
            modellschichtId: 'vorherige-schicht',
            beginn: Timestamp.fromDate(new Date('2026-10-05T03:00:00+02:00')),
            ende: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
        ],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.createSchichtAusAblage({
      mitarbeiterId: 'm-1',
      datum: '2026-10-05',
      modellschichtId: 'frueh',
    });

    expect(createSchicht).toHaveBeenCalledWith(
      { ...PFAD, dienstplanId: '2026-10', versionId: 'v-1' },
      expect.objectContaining({
        datum: '2026-10-05',
        mitarbeiterId: 'm-1',
        modellschichtId: 'frueh',
      }),
    );
    expect(fixture.componentInstance.aktionsfehler()).toBeNull();
  });

  it('should reject an overlapping shift from another loaded branch', async () => {
    hatMitarbeiterZeitkonflikt.mockReturnValue(true);
    getMitarbeiter.mockReturnValue([MITARBEITER]);
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
      }),
    );
    weitereKontexte.set([
      {
        ...createKontext(),
        filialeId: 'b-2',
        dienstplaene: [{ ...DIENSTPLAN, filialeId: 'b-2', entwurfVersionId: 'v-2' }],
        versionen: [{ ...VERSION, filialeId: 'b-2', id: 'v-2' }],
        schichten: [
          {
            ...PFAD,
            filialeId: 'b-2',
            id: 's-2',
            dienstplanId: '2026-10',
            versionId: 'v-2',
            datum: '2026-10-05',
            mitarbeiterId: 'm-1',
            modellschichtId: 'frueh',
            beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
            ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
        ],
      },
    ]);
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.createSchichtAusAblage({
      mitarbeiterId: 'm-1',
      datum: '2026-10-05',
      modellschichtId: 'frueh',
    });

    expect(createSchicht).not.toHaveBeenCalled();
    expect(fixture.componentInstance.aktionsfehler()).toContain('bereits eingeplant');
  });

  it('should show an error when creating a dropped shift fails', async () => {
    getMitarbeiter.mockReturnValue([MITARBEITER]);
    createSchicht.mockRejectedValueOnce(new Error('Speichern fehlgeschlagen.'));
    kontext.set(
      createKontext({
        dienstplaene: [DIENSTPLAN],
        versionen: [VERSION],
        modellschichten: [MODELLSCHICHT],
      }),
    );
    const fixture = createComponent(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.createSchichtAusAblage({
      mitarbeiterId: 'm-1',
      datum: '2026-10-05',
      modellschichtId: 'frueh',
    });

    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Speichern fehlgeschlagen.',
    );
  });

  function createSchichtmodell(
    id = 'modell-1',
    bezeichnung = 'Sommer',
  ): ISchichtrastermodellBestand {
    return {
      schichtmodell: {
        ...PFAD,
        id,
        bezeichnung,
        aktiv: true,
        planungsart: 'schichtraster',
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      modellschichten: [
        {
          ...PFAD,
          id: 'frueh',
          schichtmodellId: id,
          bezeichnung: 'Früh',
          reihenfolge: 0,
          mehrfachbelegungErlaubt: false,
        },
      ],
    };
  }
});
