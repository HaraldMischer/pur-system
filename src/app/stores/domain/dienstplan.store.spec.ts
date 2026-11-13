// pur-system/src/app/stores/domain/dienstplan.store.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { DebugLogService } from '../../services/core/debug-log.service';
import { DienstplanService } from '../../services/domain/dienstplan.service';
import { BenutzerStore } from '../app/benutzer.store';
import { StammdatenStore } from '../app/stammdaten.store';
import { DienstplanStore } from './dienstplan.store';
import { MitarbeiterStore } from './mitarbeiter.store';

describe('DienstplanStore', () => {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  const benutzerId = signal<string | null>('uid-1');
  const loadDienstplanMonat = vi.fn();
  const loadDienstplanBestand = vi.fn();
  const createDienstplan = vi.fn();
  const loadMitarbeiterNachIds = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    benutzerId.set('uid-1');
    loadDienstplanMonat.mockResolvedValue(createLeerenBestand());
    loadDienstplanBestand.mockResolvedValue(createLeerenBestand());
    createDienstplan.mockResolvedValue(createAnlageErgebnis());
    TestBed.configureTestingModule({
      providers: [
        DienstplanStore,
        {
          provide: DienstplanService,
          useValue: { loadDienstplanMonat, loadDienstplanBestand, createDienstplan },
        },
        { provide: BenutzerStore, useValue: { benutzerId } },
        { provide: MitarbeiterStore, useValue: { loadMitarbeiterNachIds } },
        {
          provide: StammdatenStore,
          useValue: {
            getFilialen: vi.fn().mockReturnValue([{ id: 'b-1', anzeigename: 'Halle 1' }]),
          },
        },
        {
          provide: DebugLogService,
          useValue: { log: vi.fn(), logDatenflussTitel: vi.fn(), logDatenGeladen: vi.fn() },
        },
        {
          provide: StoreSnapshotService,
          useValue: { registerStoreSnapshot: vi.fn().mockReturnValue(vi.fn()) },
        },
      ],
    });
  });

  it('should load and select a complete monthly plan', async () => {
    const store = TestBed.inject(DienstplanStore);
    store.selectDienstplan(pfad, '2026-10');

    await store.loadDienstplanMonat(pfad, '2026-10', false);

    expect(store.selectedMonat()).toBe('2026-10');
    expect(store.getDienstplanKontext(pfad)?.monatsmodi['2026-10']).toBe('vollstaendig');
  });

  it('should add a newly created daily plan to the loaded month', async () => {
    const store = TestBed.inject(DienstplanStore);
    await store.loadDienstplanMonat(pfad, '2026-10', false);
    const schichtmodell = createSchichtmodell();

    await store.createDienstplan(pfad, '2026-10', schichtmodell, []);

    expect(createDienstplan).toHaveBeenCalledWith(pfad, '2026-10', schichtmodell, [], 'uid-1');
    expect(store.getDienstplanKontext(pfad)?.dienstplaene).toHaveLength(1);
    expect(store.getDienstplanKontext(pfad)?.tagesschichten).toHaveLength(1);
  });

  it('should expose a loading error without discarding an existing context', async () => {
    loadDienstplanMonat.mockRejectedValueOnce(new Error('Netzwerkfehler'));
    const store = TestBed.inject(DienstplanStore);

    await expect(store.loadDienstplanMonat(pfad, '2026-10', false)).rejects.toThrow(
      'Netzwerkfehler',
    );

    expect(store.getDienstplanKontext(pfad)?.error).toBeTruthy();
  });
});

function createLeerenBestand() {
  return { dienstplaene: [], versionen: [], schichten: [], tagesschichten: [] };
}

function createAnlageErgebnis() {
  const basisPfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  return {
    dienstplan: {
      ...basisPfad,
      id: '2026-10',
      zeitraumStart: '2026-10-01',
      zeitraumEnde: '2026-10-31',
      zeitzone: 'Europe/Berlin',
      schichtmodellId: 'modell-1',
      schichtmodellBezeichnung: 'Standard',
      kalendertage: [],
      entwurfVersionId: 'v-1',
      naechsteVersionsnummer: 2,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    version: {
      ...basisPfad,
      id: 'v-1',
      dienstplanId: '2026-10',
      nummer: 1,
      revision: 0,
      status: 'entwurf',
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    tagesschichten: [
      {
        ...basisPfad,
        id: '2026-10-05-frueh',
        dienstplanId: '2026-10',
        datum: '2026-10-05',
        herkunft: 'wochentag',
        vorlagenschichtId: 'frueh',
        bezeichnung: 'Früh',
        reihenfolge: 0,
        kernbeginnLokalzeit: '08:00',
        kernendeLokalzeit: '16:00',
        kernbeginnAmFolgetag: false,
        kernendeAmFolgetag: false,
        beginn: Timestamp.fromDate(new Date('2026-10-05T06:00:00Z')),
        ende: Timestamp.fromDate(new Date('2026-10-05T14:00:00Z')),
        mehrfachbelegungErlaubt: false,
        vorbereitungsminuten: 0,
        nachbereitungsminuten: 0,
      },
    ],
  };
}

function createSchichtmodell() {
  const basisPfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  return {
    schichtmodell: {
      ...basisPfad,
      id: 'modell-1',
      bezeichnung: 'Standard',
      aktiv: true,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    tagesvorlagenschichten: [],
  };
}
