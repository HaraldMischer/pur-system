// pur-system/src/app/services/domain/dienstplan.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { FirestoreDbService } from '../firebase/firestore-db.service';
import { DienstplanService } from './dienstplan.service';
import { FilialeinstellungService } from './filialeinstellung.service';

describe('DienstplanService', () => {
  const pfad = {
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    filialeId: 'b-1',
    dienstplanId: '2026-10',
  };
  const loadDocument = vi.fn();
  const loadCollection = vi.fn();
  const observeCollectionByDocumentIds = vi.fn();
  const createDocumentId = vi.fn().mockReturnValue('version-1');
  const createServerTimestamp = vi.fn().mockReturnValue({});
  const loadFilialeinstellung = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    loadDocument.mockResolvedValue(null);
    loadCollection.mockResolvedValue([]);
    loadFilialeinstellung.mockReset();
    TestBed.configureTestingModule({
      providers: [
        DienstplanService,
        {
          provide: FirestoreDbService,
          useValue: {
            loadDocument,
            loadCollection,
            observeCollectionByDocumentIds,
            createDocumentId,
            createServerTimestamp,
          },
        },
        { provide: FilialeinstellungService, useValue: { loadFilialeinstellung } },
      ],
    });
  });

  it('should return an empty monthly result for a missing service plan', async () => {
    const service = TestBed.inject(DienstplanService);

    await expect(service.loadDienstplanMonat(pfad, false)).resolves.toEqual({
      dienstplaene: [],
      versionen: [],
      schichten: [],
      tagesschichten: [],
    });
  });

  it('should load the daily shifts of an existing monthly plan', async () => {
    loadDocument.mockResolvedValue({
      id: '2026-10',
      daten: {
        zeitraumStart: '2026-10-01',
        zeitraumEnde: '2026-10-31',
        zeitzone: 'Europe/Berlin',
        schichtmodellId: 'modell-1',
        schichtmodellBezeichnung: 'Standard',
        kalendertage: [],
        naechsteVersionsnummer: 2,
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    });
    loadCollection.mockImplementation(async (path: string) => {
      if (!path.endsWith('/tagesschicht')) return [];
      return [
        {
          id: '2026-10-05-frueh',
          daten: {
            datum: '2026-10-05',
            herkunft: 'wochentag',
            vorlagenschichtId: 'frueh',
            bezeichnung: 'Früh',
            reihenfolge: 0,
            kernbeginnLokalzeit: '08:00',
            kernendeLokalzeit: '16:00',
            kernbeginnAmFolgetag: false,
            kernendeAmFolgetag: false,
            beginn: { toDate: () => new Date('2026-10-05T06:00:00Z') },
            ende: { toDate: () => new Date('2026-10-05T14:00:00Z') },
            mehrfachbelegungErlaubt: false,
            vorbereitungsminuten: 0,
            nachbereitungsminuten: 0,
          },
        },
      ];
    });
    const service = TestBed.inject(DienstplanService);

    const bestand = await service.loadDienstplanMonat(pfad, false);

    expect(bestand.tagesschichten).toEqual([
      expect.objectContaining({ id: '2026-10-05-frueh', dienstplanId: '2026-10' }),
    ]);
  });

  it('should observe a bounded group of company-wide employee allocations', () => {
    const next = vi.fn();
    const error = vi.fn();
    const unsubscribe = vi.fn();
    observeCollectionByDocumentIds.mockReturnValue(unsubscribe);
    const service = TestBed.inject(DienstplanService);

    const ergebnis = service.observeMitarbeiterbelegungen(
      { unternehmerId: 'u-1', firmaId: 'f-1' },
      ['m-1__2026-10-01'],
      next,
      error,
    );

    expect(ergebnis).toBe(unsubscribe);
    expect(observeCollectionByDocumentIds).toHaveBeenCalledWith(
      'unternehmer/u-1/firma/f-1/mitarbeiterbelegung',
      ['m-1__2026-10-01'],
      next,
      error,
    );
  });

  it('should explain that a shift model no longer matches the current opening times', async () => {
    const oeffnungsregel = {
      geoeffnet: true as const,
      beginnLokalzeit: '18:00',
      endeLokalzeit: '23:00',
      endetAmFolgetag: false,
    };
    loadFilialeinstellung.mockResolvedValue({
      oeffnungszeiten: {
        standardoeffnungsregel: oeffnungsregel,
        wochenregeln: {
          montag: { modus: 'standard' },
          dienstag: { modus: 'standard' },
          mittwoch: { modus: 'standard' },
          donnerstag: { modus: 'standard' },
          freitag: { modus: 'standard' },
          samstag: { modus: 'standard' },
          sonntag: { modus: 'standard' },
        },
      },
      sondertage: [],
    });
    const service = TestBed.inject(DienstplanService);

    await expect(
      service.createDienstplan(
        pfad,
        '2026-10',
        {
          schichtmodell: {
            unternehmerId: 'u-1',
            firmaId: 'f-1',
            filialeId: 'b-1',
            id: 'modell-1',
            bezeichnung: 'Schichtmodell',
            aktiv: true,
            vorbereitungsminuten: 0,
            nachbereitungsminuten: 0,
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
          tagesvorlagenschichten: [
            {
              unternehmerId: 'u-1',
              firmaId: 'f-1',
              filialeId: 'b-1',
              schichtmodellId: 'modell-1',
              id: 'wochentag-1',
              vorlage: 'wochentag',
              bezeichnung: 'Schicht 1',
              reihenfolge: 0,
              ende: { lokalzeit: '16:30', tag: 'starttag' },
              mehrfachbelegungErlaubt: false,
            },
            {
              unternehmerId: 'u-1',
              firmaId: 'f-1',
              filialeId: 'b-1',
              schichtmodellId: 'modell-1',
              id: 'wochentag-2',
              vorlage: 'wochentag',
              bezeichnung: 'Schicht 2',
              reihenfolge: 1,
              beginn: { lokalzeit: '16:30', tag: 'starttag' },
              mehrfachbelegungErlaubt: false,
            },
            {
              unternehmerId: 'u-1',
              firmaId: 'f-1',
              filialeId: 'b-1',
              schichtmodellId: 'modell-1',
              id: 'sonntag-1',
              vorlage: 'sonntag',
              bezeichnung: 'Sonntag',
              reihenfolge: 0,
              mehrfachbelegungErlaubt: false,
            },
          ],
        },
        'uid-1',
      ),
    ).rejects.toMatchObject({
      message:
        'Der Dienstplan konnte nicht angelegt werden. Das Schichtmodell „Schichtmodell“ ist für die aktuellen Öffnungszeiten nicht vollständig oder nicht mehr gültig. Bitte passen Sie die Schichtvorlagen an.',
      code: 'schichtmodell-oeffnungszeiten',
    });
  });
});
