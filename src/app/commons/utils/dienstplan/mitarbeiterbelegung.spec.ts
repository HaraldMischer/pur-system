// pur-system/src/app/commons/utils/dienstplan/mitarbeiterbelegung.spec.ts

import { Timestamp } from 'firebase/firestore';

import type { IMitarbeiterbelegungDokument } from '../../models/domain/mitarbeiterbelegung';
import {
  createMitarbeiterbelegungId,
  createMitarbeiterbelegungReferenz,
  getMitarbeiterbelegungKonflikte,
  getMitarbeiterbelegungPausenzuordnungen,
  getRelevanteMitarbeiterbelegungen,
  getMitarbeiterbelegungTage,
  getMitarbeiterbelegungZeitraumTage,
  updateMitarbeiterbelegungDokument,
} from './mitarbeiterbelegung';

describe('Mitarbeiterbelegung', () => {
  const pfad = {
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    filialeId: 'b-1',
    dienstplanId: '2026-10',
    versionId: 'v-1',
  };

  it('should create a deterministic employee-day id', () => {
    expect(createMitarbeiterbelegungId('m-1', '2026-10-05')).toBe('m-1__2026-10-05');
  });

  it('should include both local days of a shift over midnight', () => {
    expect(
      getMitarbeiterbelegungTage(
        {
          beginn: timestamp('2026-10-05T23:00:00+02:00'),
          ende: timestamp('2026-10-06T01:00:00+02:00'),
        },
        'Europe/Berlin',
      ),
    ).toEqual(['2026-10-05', '2026-10-06']);
  });

  it('should treat an end at midnight as exclusive', () => {
    expect(
      getMitarbeiterbelegungTage(
        {
          beginn: timestamp('2026-10-05T20:00:00+02:00'),
          ende: timestamp('2026-10-06T00:00:00+02:00'),
        },
        'Europe/Berlin',
      ),
    ).toEqual(['2026-10-05']);
  });

  it('should include both adjacent days around a planning period', () => {
    const tage = getMitarbeiterbelegungZeitraumTage('2026-10-01', '2026-10-31');

    expect(tage[0]).toBe('2026-09-30');
    expect(tage.at(-1)).toBe('2026-11-01');
    expect(tage).toHaveLength(33);
  });

  it('should add, replace and remove an indexed shift', () => {
    const erste = createReferenz('s-1', '08:00', '12:00');
    const zweite = createReferenz('s-2', '12:00', '16:00');
    const dokument = updateMitarbeiterbelegungDokument(
      null,
      'm-1',
      '2026-10-05',
      null,
      erste,
      'uid-1',
    );
    const erweitert = updateMitarbeiterbelegungDokument(
      dokument,
      'm-1',
      '2026-10-05',
      null,
      zweite,
      'uid-1',
    );

    expect(erweitert?.belegungen.map((belegung) => belegung.schichtId)).toEqual(['s-1', 's-2']);
    expect(
      updateMitarbeiterbelegungDokument(erweitert, 'm-1', '2026-10-05', erste, null, 'uid-1')
        ?.belegungen,
    ).toEqual([zweite]);
    expect(
      updateMitarbeiterbelegungDokument(dokument, 'm-1', '2026-10-05', erste, null, 'uid-1'),
    ).toBeNull();
  });

  it('should reject overlapping shifts of the same employee', () => {
    const dokument: IMitarbeiterbelegungDokument = {
      mitarbeiterId: 'm-1',
      datum: '2026-10-05',
      belegungen: [createReferenz('s-1', '08:00', '12:00')],
      aktualisiertVonUid: 'uid-1',
    };

    expect(() => {
      return updateMitarbeiterbelegungDokument(
        dokument,
        'm-1',
        '2026-10-05',
        null,
        createReferenz('s-2', '11:00', '15:00'),
        'uid-1',
      );
    }).toThrow('Der Mitarbeiter ist in diesem Zeitraum bereits eingeplant.');
  });

  it('should prefer a draft over the published state of the same branch plan', () => {
    const veroeffentlicht = {
      ...createReferenz('s-alt', '08:00', '16:00'),
      versionId: 'v-alt',
      status: 'veroeffentlicht' as const,
    };
    const entwurf = createReferenz('s-neu', '09:00', '17:00');

    expect(
      getRelevanteMitarbeiterbelegungen([veroeffentlicht, entwurf]).map(
        (belegung) => belegung.schichtId,
      ),
    ).toEqual(['s-neu']);
  });

  it('should report invalid and overlapping relevant allocations as blocking conflicts', () => {
    const ungueltig = createReferenz('s-ungueltig', '10:00', '09:00');
    const erste = createReferenz('s-1', '08:00', '12:00');
    const zweite = { ...createReferenz('s-2', '11:00', '15:00'), filialeId: 'b-2' };

    expect(getMitarbeiterbelegungKonflikte([ungueltig, erste, zweite])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ art: 'ungueltige-zeitfolge', schwere: 'blockierend' }),
        expect.objectContaining({ art: 'ueberschneidung', schwere: 'blockierend' }),
      ]),
    );
  });

  it('should assign a paid block break only to the chronologically last shift', () => {
    const erste = createReferenz('s-1', '07:00', '11:00');
    const zweite = { ...createReferenz('s-2', '11:00', '14:00'), filialeId: 'b-2' };

    expect(
      getMitarbeiterbelegungPausenzuordnungen([erste, zweite]).map((zuordnung) => ({
        schichtId: zuordnung.belegung.schichtId,
        pauseMinuten: zuordnung.pauseMinuten,
      })),
    ).toEqual([
      { schichtId: 's-1', pauseMinuten: 0 },
      { schichtId: 's-2', pauseMinuten: 30 },
    ]);
  });

  it('should report a stored paid break that differs from the calculated block value', () => {
    const schicht = createReferenz('s-1', '07:00', '14:00');

    expect(getMitarbeiterbelegungKonflikte([schicht])).toEqual([
      expect.objectContaining({
        art: 'ungueltige-pause',
        schwere: 'blockierend',
        belegungen: [schicht],
      }),
    ]);
  });

  it('should calculate blocks independently by service-plan date across midnight', () => {
    const nachts = {
      ...createReferenz('s-nacht', '22:00', '23:00'),
      beginn: timestamp('2026-10-05T22:00:00+02:00'),
      ende: timestamp('2026-10-06T02:00:00+02:00'),
    };
    const folgetag = {
      ...createReferenz('s-folgetag', '02:00', '05:00'),
      datum: '2026-10-06',
      beginn: timestamp('2026-10-06T02:00:00+02:00'),
      ende: timestamp('2026-10-06T05:00:00+02:00'),
    };

    expect(
      getMitarbeiterbelegungPausenzuordnungen([nachts, folgetag]).map(
        (zuordnung) => zuordnung.pauseMinuten,
      ),
    ).toEqual([0, 0]);
  });

  function createReferenz(schichtId: string, beginn: string, ende: string) {
    return createMitarbeiterbelegungReferenz(pfad, schichtId, 'entwurf', {
      datum: '2026-10-05',
      mitarbeiterId: 'm-1',
      modellschichtId: 'frueh',
      beginn: timestamp(`2026-10-05T${beginn}:00+02:00`),
      ende: timestamp(`2026-10-05T${ende}:00+02:00`),
    });
  }

  function timestamp(wert: string): Timestamp {
    return Timestamp.fromDate(new Date(wert));
  }
});
