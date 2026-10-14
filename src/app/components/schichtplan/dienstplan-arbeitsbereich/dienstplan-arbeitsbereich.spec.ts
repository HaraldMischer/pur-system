// pur-system/src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { Timestamp } from 'firebase/firestore';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IBenutzerProfilDokument } from '../../../commons/models/domain/benutzer';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { ISchichtEintrag } from '../../../commons/models/domain/schicht';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import {
  DienstplanStore,
  TDienstplanKontextBestand,
} from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { SchichtmodellStore } from '../../../stores/domain/schichtmodell.store';
import { MonatSelector } from '../../date-selectors/monat-selector/monat-selector';
import { DienstplanArbeitsbereich } from './dienstplan-arbeitsbereich';

const FILIALE_1: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};
const FILIALE_2: IFilialeEintrag = {
  ...FILIALE_1,
  id: 'b-2',
  nummer: 2,
  anzeigename: 'Bochum 2',
  filialname: 'Bochum 2',
};

describe('DienstplanArbeitsbereich', () => {
  const selectedUnternehmer = signal<{ id: string } | null>({ id: 'u-1' });
  const selectedFirma = signal<{ id: string } | null>({ id: 'f-1' });
  const selectedFilialen = signal<readonly IFilialeEintrag[]>([FILIALE_1, FILIALE_2]);
  const benutzerProfil = signal<IBenutzerProfilDokument>({
    email: 'office@example.com',
    anzeigename: 'Office',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard', 'schichtplan'],
    zugriffe: { 'u-1': { 'f-1': ['b-1', 'b-2'] } },
  });
  const loadDienstplanMonat = vi.fn().mockResolvedValue(undefined);
  const getDienstplanKontext = vi.fn().mockReturnValue(null);
  const getMitarbeiter = vi.fn().mockReturnValue([]);
  const getMitarbeiterNachFilialen = vi.fn().mockReturnValue([]);

  beforeEach(async () => {
    selectedUnternehmer.set({ id: 'u-1' });
    selectedFirma.set({ id: 'f-1' });
    selectedFilialen.set([FILIALE_1, FILIALE_2]);
    vi.clearAllMocks();
    getMitarbeiter.mockReturnValue([]);
    getMitarbeiterNachFilialen.mockReturnValue([]);
    getDienstplanKontext.mockReturnValue(null);
    await TestBed.configureTestingModule({
      imports: [DienstplanArbeitsbereich],
      providers: [
        {
          provide: AppKontextStore,
          useValue: { selectedUnternehmer, selectedFirma, selectedFilialen },
        },
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        {
          provide: DienstplanStore,
          useValue: {
            getDienstplanKontext,
            loadDienstplanMonat,
            createDienstplan: vi.fn(),
            inProgress: signal(false),
            error: signal(null),
          },
        },
        {
          provide: MitarbeiterStore,
          useValue: {
            getMitarbeiter,
            getMitarbeiterNachFilialen,
            getMitarbeiterById: vi.fn().mockReturnValue(null),
          },
        },
        {
          provide: SchichtmodellStore,
          useValue: {
            loadSchichtmodelle: vi.fn(),
            getSchichtmodellKontext: vi.fn().mockReturnValue(null),
            error: signal(null),
          },
        },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('should render and load one monthly section per selected branch', async () => {
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('app-dienstplan-filiale')).toHaveLength(
      2,
    );
    expect(loadDienstplanMonat).toHaveBeenCalledTimes(2);
    expect(loadDienstplanMonat).toHaveBeenCalledWith(
      { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' },
      fixture.componentInstance.selectedMonat(),
      false,
    );
    expect(loadDienstplanMonat).toHaveBeenCalledWith(
      { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-2' },
      fixture.componentInstance.selectedMonat(),
      false,
    );
  });

  it('should apply a month change to every selected branch section', async () => {
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.componentInstance.selectedMonat.set('2026-01');
    fixture.detectChanges();
    await fixture.whenStable();
    vi.clearAllMocks();

    const monatSelector = fixture.debugElement.query(By.directive(MonatSelector))
      .componentInstance as MonatSelector;
    monatSelector.changeMonat(-1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedMonat()).toBe('2025-12');
    expect(loadDienstplanMonat).toHaveBeenCalledTimes(2);
    expect(loadDienstplanMonat.mock.calls.every((aufruf) => aufruf[1] === '2025-12')).toBe(true);
  });

  it('should merge active employees from the selected branches without duplicates', async () => {
    const mitarbeiter1 = createMitarbeiter('m-1', 'Anna', 'Alpha', ['b-1'], true, '#123456');
    const mitarbeiter2 = createMitarbeiter('m-2', 'Berta', 'Beta', ['b-2'], true);
    const inaktiverMitarbeiter = createMitarbeiter('m-3', 'Ingo', 'Inaktiv', ['b-1'], false);
    const gemeinsamerMitarbeiter = createMitarbeiter(
      'm-4',
      'Georg',
      'Gemeinsam',
      ['b-1', 'b-2'],
      true,
    );
    const fremderMitarbeiter = createMitarbeiter('m-5', 'Fred', 'Fremd', ['b-3'], true);
    getMitarbeiter.mockReturnValue([
      inaktiverMitarbeiter,
      mitarbeiter1,
      mitarbeiter2,
      gemeinsamerMitarbeiter,
      fremderMitarbeiter,
    ]);
    getMitarbeiterNachFilialen.mockReturnValue([gemeinsamerMitarbeiter]);
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const eintraege = compiled.querySelectorAll<HTMLElement>('.mitarbeiter-karte');

    expect(eintraege).toHaveLength(3);
    expect(
      Array.from(eintraege).map((eintrag) => eintrag.querySelector('strong')?.textContent),
    ).toEqual(['Alpha, Anna', 'Beta, Berta', 'Gemeinsam, Georg']);
    expect(compiled.textContent).not.toContain('Inaktiv, Ingo');
    expect(compiled.textContent).not.toContain('Fremd, Fred');
    expect(
      eintraege[0].querySelector<HTMLElement>('.mitarbeiter-farbe')?.style.backgroundColor,
    ).toBe('rgb(18, 52, 86)');
    expect(
      eintraege[1].querySelector<HTMLElement>('.mitarbeiter-farbe')?.style.backgroundColor,
    ).toBe('');
  });

  it('should show monthly hours and shift counts from active planning versions', async () => {
    const mitarbeiter = createMitarbeiter('m-1', 'Anna', 'Alpha', ['b-1', 'b-2'], true);
    getMitarbeiter.mockReturnValue([mitarbeiter]);
    const kontexte = new Map<string, TDienstplanKontextBestand>([
      [
        'b-1',
        createDienstplanKontext('b-1', 'entwurf-b-1', 'veroeffentlicht-b-1', [
          createSchicht('schicht-1', 'b-1', 'entwurf-b-1', 'm-1', '08:00', '16:00', 30),
          createSchicht('alte-schicht', 'b-1', 'veroeffentlicht-b-1', 'm-1', '08:00', '12:00', 0),
        ]),
      ],
      [
        'b-2',
        createDienstplanKontext('b-2', undefined, 'veroeffentlicht-b-2', [
          createSchicht('schicht-2', 'b-2', 'veroeffentlicht-b-2', 'm-1', '12:00', '17:00', 30),
        ]),
      ],
    ]);
    getDienstplanKontext.mockImplementation((pfad: IFilialPfad) => {
      return kontexte.get(pfad.filialeId) ?? null;
    });
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.componentInstance.selectedMonat.set('2026-10');
    fixture.detectChanges();
    await fixture.whenStable();

    const monatswerte = fixture.nativeElement.querySelector('.mitarbeiter-monatswerte');

    expect(monatswerte.textContent.replace(/\s+/g, ' ').trim()).toBe('12 Std. · 2 Schichten');
  });

  it('should provide employees as drag sources only in planning mode', async () => {
    getMitarbeiter.mockReturnValue([createMitarbeiter('m-1', 'Anna', 'Alpha', ['b-1'], true)]);
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    let drag = fixture.debugElement.query(By.directive(CdkDrag)).injector.get(CdkDrag);
    expect(drag.data).toBe('m-1');
    expect(drag.disabled).toBe(true);

    fixture.componentRef.setInput('planungsmodus', true);
    fixture.detectChanges();

    drag = fixture.debugElement.query(By.directive(CdkDrag)).injector.get(CdkDrag);
    expect(drag.disabled).toBe(false);
  });

  it('should not load a plan without a selected branch', async () => {
    selectedFilialen.set([]);
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('app-dienstplan-filiale')).toHaveLength(
      0,
    );
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(loadDienstplanMonat).not.toHaveBeenCalled();
  });

  function createMitarbeiter(
    id: string,
    vorname: string,
    nachname: string,
    filialIds: string[],
    aktiv: boolean,
    farbkennung?: string,
  ): IMitarbeiterEintrag {
    return {
      id,
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      person: {
        vorname,
        nachname,
        adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
        kontakt: {},
      },
      rollen: ['servicekraft'],
      filialIds,
      aktiv,
      ...(farbkennung ? { farbkennung } : {}),
    };
  }

  function createDienstplanKontext(
    filialeId: string,
    entwurfVersionId: string | undefined,
    veroeffentlichteVersionId: string | undefined,
    schichten: readonly ISchichtEintrag[],
  ): TDienstplanKontextBestand {
    return {
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId,
      dienstplaene: [
        {
          id: '2026-10',
          unternehmerId: 'u-1',
          firmaId: 'f-1',
          filialeId,
          zeitraumStart: '2026-10-01',
          zeitraumEnde: '2026-10-31',
          zeitzone: 'Europe/Berlin',
          schichtmodellId: 'modell-1',
          schichtmodellBezeichnung: 'Standard',
          naechsteVersionsnummer: 3,
          erstelltVonUid: 'uid-1',
          aktualisiertVonUid: 'uid-1',
          ...(entwurfVersionId ? { entwurfVersionId } : {}),
          ...(veroeffentlichteVersionId ? { veroeffentlichteVersionId } : {}),
        },
      ],
      versionen: [
        ...(entwurfVersionId
          ? [
              {
                id: entwurfVersionId,
                dienstplanId: '2026-10',
                unternehmerId: 'u-1',
                firmaId: 'f-1',
                filialeId,
                nummer: 2,
                revision: 1,
                status: 'entwurf' as const,
                erstelltVonUid: 'uid-1',
                aktualisiertVonUid: 'uid-1',
              },
            ]
          : []),
        ...(veroeffentlichteVersionId
          ? [
              {
                id: veroeffentlichteVersionId,
                dienstplanId: '2026-10',
                unternehmerId: 'u-1',
                firmaId: 'f-1',
                filialeId,
                nummer: 1,
                revision: 1,
                status: 'veroeffentlicht' as const,
                erstelltVonUid: 'uid-1',
                aktualisiertVonUid: 'uid-1',
              },
            ]
          : []),
      ],
      schichten,
      modellschichten: [],
      monatsmodi: { '2026-10': 'vollstaendig' },
      vollstaendigGeladen: false,
      download: false,
      isLoaded: true,
      error: null,
    };
  }

  function createSchicht(
    id: string,
    filialeId: string,
    versionId: string,
    mitarbeiterId: string,
    beginn: string,
    ende: string,
    pauseMinuten: number,
  ): ISchichtEintrag {
    return {
      id,
      dienstplanId: '2026-10',
      versionId,
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId,
      mitarbeiterId,
      modellschichtId: 'modellschicht-1',
      beginn: Timestamp.fromDate(new Date(`2026-10-05T${beginn}:00+02:00`)),
      ende: Timestamp.fromDate(new Date(`2026-10-05T${ende}:00+02:00`)),
      pauseMinuten,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
  }
});
