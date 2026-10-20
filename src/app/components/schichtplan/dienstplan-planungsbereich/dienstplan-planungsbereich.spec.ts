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
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import {
  IModellschichtMomentaufnahmeEintrag,
  ISchichtmodellBestand,
} from '../../../commons/models/domain/schichtmodell';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import {
  DienstplanStore,
  TDienstplanKontextBestand,
} from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
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
  id: '2026-10',
  zeitraumStart: '2026-10-01',
  zeitraumEnde: '2026-10-31',
  zeitzone: 'Europe/Berlin',
  schichtmodellId: 'modell-1',
  schichtmodellBezeichnung: 'Sommer',
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
const MODELLSCHICHT: IModellschichtMomentaufnahmeEintrag = {
  ...PFAD,
  id: 'frueh',
  dienstplanId: '2026-10',
  bezeichnung: 'Früh',
  beginnLokalzeit: '07:00',
  endeLokalzeit: '12:00',
  endetAmFolgetag: false,
  standardpauseMinuten: 0,
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
  const deleteDienstplan = vi.fn().mockResolvedValue(undefined);
  const loadSchichtmodelle = vi.fn().mockResolvedValue(undefined);
  const dialogOpen = vi.fn();
  const getMitarbeiter = vi.fn().mockReturnValue([]);
  const schichtmodelle = signal<readonly ISchichtmodellBestand[]>([createSchichtmodell()]);

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
    deleteDienstplan.mockResolvedValue(undefined);
    loadSchichtmodelle.mockResolvedValue(undefined);
    getMitarbeiter.mockReturnValue([]);
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
            deleteDienstplan,
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
            mitarbeiterId: 'm-1',
            modellschichtId: 'frueh',
            beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
            ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
            pauseMinuten: 0,
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
        mitarbeiterId: 'm-1',
        modellschichtId: 'frueh',
        pauseMinuten: 0,
      }),
    );
    const anlage = createSchicht.mock.calls[0][1];
    expect(anlage.beginn.toDate().toISOString()).toBe('2026-10-05T05:00:00.000Z');
    expect(anlage.ende.toDate().toISOString()).toBe('2026-10-05T10:00:00.000Z');
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
            mitarbeiterId: 'm-1',
            modellschichtId: 'frueh',
            beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
            ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
            pauseMinuten: 0,
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

  it('should reject an overlapping shift from another loaded branch', async () => {
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
            mitarbeiterId: 'm-1',
            modellschichtId: 'frueh',
            beginn: Timestamp.fromDate(new Date('2026-10-05T07:00:00+02:00')),
            ende: Timestamp.fromDate(new Date('2026-10-05T12:00:00+02:00')),
            pauseMinuten: 0,
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
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Speichern fehlgeschlagen.');
  });

  function createSchichtmodell(id = 'modell-1', bezeichnung = 'Sommer'): ISchichtmodellBestand {
    return {
      schichtmodell: {
        ...PFAD,
        id,
        bezeichnung,
        aktiv: true,
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      modellschichten: [
        {
          ...PFAD,
          id: 'frueh',
          schichtmodellId: id,
          bezeichnung: 'Früh',
          beginnLokalzeit: '07:00',
          endeLokalzeit: '12:00',
          endetAmFolgetag: false,
          standardpauseMinuten: 0,
          mehrfachbelegungErlaubt: false,
        },
      ],
    };
  }
});
