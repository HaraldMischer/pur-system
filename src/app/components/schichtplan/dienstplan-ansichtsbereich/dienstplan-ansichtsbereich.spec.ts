// pur-system/src/app/components/schichtplan/dienstplan-ansichtsbereich/dienstplan-ansichtsbereich.spec.ts

import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import {
  DienstplanStore,
  TDienstplanKontextBestand,
} from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { DienstplanAnsichtsbereich } from './dienstplan-ansichtsbereich';

const FILIALE: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Testhalle',
  filialname: 'Testhalle',
  kontakt: {},
};
const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
const MITARBEITER: Readonly<Record<string, IMitarbeiterEintrag>> = {
  'm-1': createMitarbeiter('m-1', 'Anna', 'Alpha'),
  'm-2': createMitarbeiter('m-2', 'Berta', 'Beta'),
};

describe('DienstplanAnsichtsbereich', () => {
  const loadDienstplanMonat = vi.fn().mockResolvedValue(undefined);
  const getDienstplanKontext = vi.fn();
  const getMitarbeiterById = vi.fn(
    (_unternehmerId: string, _firmaId: string, mitarbeiterId: string) => {
      return MITARBEITER[mitarbeiterId] ?? null;
    },
  );

  beforeEach(async () => {
    vi.clearAllMocks();
    getDienstplanKontext.mockReturnValue(createKontext());
    await TestBed.configureTestingModule({
      imports: [DienstplanAnsichtsbereich],
      providers: [
        {
          provide: DienstplanStore,
          useValue: { getDienstplanKontext, loadDienstplanMonat },
        },
        { provide: MitarbeiterStore, useValue: { getMitarbeiterById } },
      ],
    }).compileComponents();
  });

  it('lädt ausschließlich den veröffentlichten Monatsstand über das Netzwerk', async () => {
    const fixture = createFixture();
    await fixture.whenStable();

    expect(loadDienstplanMonat).toHaveBeenCalledWith(PFAD, '2026-10', true, 'networkOnly');
  });

  it('zeigt nur Schichten der aktuell veröffentlichten Version mit Zeit und Pause', () => {
    const fixture = createFixture();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Anna Alpha');
    expect(text).toContain('06:00–14:00 Uhr');
    expect(text).toContain('Bezahlte Pause: 30 Min.');
    expect(text).not.toContain('Berta Beta');
  });

  it('zeigt ohne veröffentlichte Version einen eindeutigen Leerzustand', () => {
    getDienstplanKontext.mockReturnValue(createKontext(false));
    const fixture = createFixture();

    expect(fixture.nativeElement.textContent).toContain(
      'Für diesen Monat ist noch kein Dienstplan veröffentlicht.',
    );
  });

  function createFixture() {
    const fixture = TestBed.createComponent(DienstplanAnsichtsbereich);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.componentRef.setInput('monat', '2026-10');
    fixture.detectChanges();
    return fixture;
  }
});

function createKontext(mitVeroeffentlichung = true): TDienstplanKontextBestand {
  return {
    ...PFAD,
    dienstplaene: [
      {
        ...PFAD,
        id: '2026-10',
        zeitraumStart: '2026-10-01',
        zeitraumEnde: '2026-10-31',
        zeitzone: 'Europe/Berlin',
        schichtmodellId: 'modell-1',
        schichtmodellBezeichnung: 'Früh und Spät',
        planungsart: 'schichtraster',
        kalendertage: [],
        naechsteVersionsnummer: 3,
        entwurfVersionId: 'v-entwurf',
        ...(mitVeroeffentlichung ? { veroeffentlichteVersionId: 'v-veroeffentlicht' } : {}),
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    ],
    versionen: [
      {
        ...PFAD,
        id: 'v-entwurf',
        dienstplanId: '2026-10',
        nummer: 2,
        revision: 1,
        status: 'entwurf',
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
      ...(mitVeroeffentlichung
        ? [
            {
              ...PFAD,
              id: 'v-veroeffentlicht',
              dienstplanId: '2026-10',
              nummer: 1,
              revision: 2,
              status: 'veroeffentlicht' as const,
              erstelltVonUid: 'uid-1',
              aktualisiertVonUid: 'uid-1',
              veroeffentlichtAm: Timestamp.fromDate(new Date('2026-09-28T10:00:00Z')),
              veroeffentlichtVonUid: 'uid-1',
            },
          ]
        : []),
    ],
    schichten: [
      createSchicht('s-veroeffentlicht', 'v-veroeffentlicht', 'm-1', '06:00', '14:00', 30),
      createSchicht('s-entwurf', 'v-entwurf', 'm-2', '14:00', '22:00', 0),
    ],
    modellschichten: [],
    monatsmodi: { '2026-10': 'veroeffentlicht' },
    vollstaendigGeladen: false,
    download: false,
    isLoaded: true,
    error: null,
  };
}

function createSchicht(
  id: string,
  versionId: string,
  mitarbeiterId: string,
  beginn: string,
  ende: string,
  pauseMinuten: number,
) {
  return {
    ...PFAD,
    id,
    dienstplanId: '2026-10',
    versionId,
    datum: '2026-10-02',
    mitarbeiterId,
    modellschichtId: 'ms-1',
    beginn: createTimestamp(beginn),
    ende: createTimestamp(ende),
    pauseMinuten,
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}

function createTimestamp(uhrzeit: string): Timestamp {
  return Timestamp.fromDate(new Date(`2026-10-02T${uhrzeit}:00+02:00`));
}

function createMitarbeiter(id: string, vorname: string, nachname: string): IMitarbeiterEintrag {
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
    filialIds: ['b-1'],
    aktiv: true,
  };
}
