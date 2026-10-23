// pur-system/src/app/stores/domain/mitarbeiterbelegung.store.spec.ts

import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import type { IMitarbeiterbelegungDokument } from '../../commons/models/domain/mitarbeiterbelegung';
import { DebugLogService } from '../../services/core/debug-log.service';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { DienstplanService } from '../../services/domain/dienstplan.service';
import { MitarbeiterbelegungStore } from './mitarbeiterbelegung.store';

type TListener = {
  readonly dokumentIds: readonly string[];
  readonly next: (
    dokumente: readonly { id: string; daten: IMitarbeiterbelegungDokument }[],
  ) => void;
  readonly error: (error: unknown) => void;
  readonly unsubscribe: ReturnType<typeof vi.fn>;
};

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1' } as const;

describe('MitarbeiterbelegungStore', () => {
  const listener: TListener[] = [];
  const observeMitarbeiterbelegungen = vi.fn(
    (_pfad, dokumentIds: readonly string[], next: TListener['next'], error: TListener['error']) => {
      const unsubscribe = vi.fn();
      listener.push({ dokumentIds, next, error, unsubscribe });
      return unsubscribe;
    },
  );
  const log = vi.fn();
  const registerStoreSnapshot = vi.fn().mockReturnValue(vi.fn());

  beforeEach(() => {
    listener.length = 0;
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        MitarbeiterbelegungStore,
        { provide: DienstplanService, useValue: { observeMitarbeiterbelegungen } },
        { provide: DebugLogService, useValue: { log } },
        { provide: StoreSnapshotService, useValue: { registerStoreSnapshot } },
      ],
    });
  });

  it('should load the selected month with adjacent boundary days in bounded listeners', () => {
    const store = TestBed.inject(MitarbeiterbelegungStore);

    store.observeMitarbeiterbelegungen(PFAD, ['b-1'], '2026-10', ['m-1']);

    expect(listener.map((eintrag) => eintrag.dokumentIds.length)).toEqual([30, 3]);
    expect(listener.flatMap((eintrag) => eintrag.dokumentIds)).toEqual(
      expect.arrayContaining(['m-1__2026-09-30', 'm-1__2026-11-01']),
    );
    listener[0].next([{ id: 'm-1__2026-10-01', daten: createBelegungstag('2026-10-01') }]);
    expect(store.download()).toBe(true);
    expect(store.isLoaded()).toBe(false);
    expect(store.belegungstage()['m-1__2026-10-01']).toBeDefined();

    listener[1].next([]);
    expect(store.istVerfuegbar()).toBe(true);
  });

  it('should replace a listener group immediately on subsequent snapshots', () => {
    const store = TestBed.inject(MitarbeiterbelegungStore);
    store.observeMitarbeiterbelegungen(PFAD, ['b-1'], '2026-10', ['m-1']);
    listener[0].next([{ id: 'm-1__2026-10-01', daten: createBelegungstag('2026-10-01') }]);
    listener[1].next([]);

    listener[0].next([]);

    expect(store.belegungstage()['m-1__2026-10-01']).toBeUndefined();
  });

  it('should replace listeners when the observed context changes and stop them explicitly', () => {
    const store = TestBed.inject(MitarbeiterbelegungStore);
    store.observeMitarbeiterbelegungen(PFAD, ['b-1'], '2026-10', ['m-1']);
    const alteListener = [...listener];

    store.observeMitarbeiterbelegungen(PFAD, ['b-2'], '2026-11', ['m-2']);

    expect(alteListener.every((eintrag) => eintrag.unsubscribe.mock.calls.length === 1)).toBe(true);
    expect(store.filialIds()).toEqual(['b-2']);
    expect(store.monat()).toBe('2026-11');
    expect(store.mitarbeiterIds()).toEqual(['m-2']);

    const neueListener = listener.slice(alteListener.length);
    store.stopMitarbeiterbelegungen();
    expect(neueListener.every((eintrag) => eintrag.unsubscribe.mock.calls.length === 1)).toBe(true);
    expect(store.monat()).toBeNull();
  });

  it('should preserve valid data, lock planning and allow a retry after a listener error', () => {
    const store = TestBed.inject(MitarbeiterbelegungStore);
    store.observeMitarbeiterbelegungen(PFAD, ['b-1'], '2026-10', ['m-1']);
    listener[0].next([{ id: 'm-1__2026-10-01', daten: createBelegungstag('2026-10-01') }]);

    listener[1].error(new Error('offline'));

    expect(store.belegungstage()['m-1__2026-10-01']).toBeDefined();
    expect(store.istVerfuegbar()).toBe(false);
    expect(store.error()).toContain('Der Belegungsindex konnte nicht live geladen werden.');
    expect(log).toHaveBeenCalled();
    const bisherigeListeneranzahl = listener.length;

    store.observeMitarbeiterbelegungen(PFAD, ['b-1'], '2026-10', ['m-1']);

    expect(listener.length).toBeGreaterThan(bisherigeListeneranzahl);
    expect(store.error()).toBeNull();
  });

  it('should derive live conflicts and check candidate periods with an optional exclusion', () => {
    const store = TestBed.inject(MitarbeiterbelegungStore);
    store.observeMitarbeiterbelegungen(PFAD, ['b-1', 'b-2'], '2026-10', ['m-1']);
    const erste = createBelegung('s-1', 'b-1', '08:00', '12:00');
    const zweite = createBelegung('s-2', 'b-2', '11:00', '15:00');
    listener[0].next([
      {
        id: 'm-1__2026-10-05',
        daten: {
          ...createBelegungstag('2026-10-05'),
          belegungen: [erste, zweite],
        },
      },
    ]);
    listener.slice(1).forEach((eintrag) => eintrag.next([]));

    expect(store.konflikte()).toEqual([
      expect.objectContaining({ art: 'ueberschneidung', schwere: 'blockierend' }),
    ]);
    expect(store.konfliktSchichtSchluessel()).toEqual(
      new Set([
        JSON.stringify(['b-1', '2026-10', 'v-b-1', 's-1']),
        JSON.stringify(['b-2', '2026-10', 'v-b-2', 's-2']),
      ]),
    );
    expect(
      store.hatMitarbeiterZeitkonflikt('m-1', {
        beginn: Timestamp.fromDate(new Date('2026-10-05T14:00:00+02:00')),
        ende: Timestamp.fromDate(new Date('2026-10-05T16:00:00+02:00')),
      }),
    ).toBe(true);
    expect(
      store.hatMitarbeiterZeitkonflikt(
        'm-1',
        { beginn: erste.beginn, ende: erste.ende },
        JSON.stringify(['b-1', '2026-10', 'v-b-1', 's-1']),
      ),
    ).toBe(true);
  });

  function createBelegungstag(datum: string): IMitarbeiterbelegungDokument {
    return {
      mitarbeiterId: 'm-1',
      datum,
      belegungen: [],
      aktualisiertVonUid: 'uid-1',
    };
  }

  function createBelegung(
    schichtId: string,
    filialeId: string,
    beginn: string,
    ende: string,
  ): IMitarbeiterbelegungDokument['belegungen'][number] {
    return {
      datum: '2026-10-05',
      mitarbeiterId: 'm-1',
      filialeId,
      dienstplanId: '2026-10',
      versionId: `v-${filialeId}`,
      schichtId,
      status: 'entwurf',
      beginn: Timestamp.fromDate(new Date(`2026-10-05T${beginn}:00+02:00`)),
      ende: Timestamp.fromDate(new Date(`2026-10-05T${ende}:00+02:00`)),
    };
  }
});
