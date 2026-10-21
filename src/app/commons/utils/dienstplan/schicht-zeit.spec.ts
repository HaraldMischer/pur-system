// pur-system/src/app/commons/utils/dienstplan/schicht-zeit.spec.ts

import { Timestamp } from 'firebase/firestore';

import { ISchichtZeitdaten } from '../../models/domain/schicht';
import { calculateArbeitsbloecke, calculateSchichtLohnzeitMinuten } from './schicht-zeit';

describe('calculateSchichtLohnzeitMinuten', () => {
  it('should calculate a same-day shift', () => {
    expect(
      calculateSchichtLohnzeitMinuten(createSchicht('2026-10-05T08:00', '2026-10-05T16:00')),
    ).toBe(480);
  });

  it('should calculate a shift across midnight', () => {
    expect(
      calculateSchichtLohnzeitMinuten(createSchicht('2026-10-06T22:00', '2026-10-07T06:00')),
    ).toBe(480);
  });

  it.each([
    ['2026-10-05T08:00', '2026-10-05T08:00'],
    ['2026-10-05T09:00', '2026-10-05T08:00'],
  ])('should reject invalid shift values', (beginn, ende) => {
    expect(() => calculateSchichtLohnzeitMinuten(createSchicht(beginn, ende))).toThrow(
      'Beginn und Ende ergeben keine gültige Schicht.',
    );
  });
});

describe('calculateArbeitsbloecke', () => {
  it('should join shifts separated by less than 30 minutes without counting the gap as work', () => {
    const bloecke = calculateArbeitsbloecke([
      createSchicht('2026-10-05T07:00', '2026-10-05T11:00'),
      createSchicht('2026-10-05T11:20', '2026-10-05T14:20'),
    ]);

    expect(bloecke).toHaveLength(1);
    expect(bloecke[0]).toEqual(
      expect.objectContaining({ arbeitszeitMinuten: 420, pauseMinuten: 30 }),
    );
  });

  it('should split blocks at a gap of 30 minutes', () => {
    const bloecke = calculateArbeitsbloecke([
      createSchicht('2026-10-05T07:00', '2026-10-05T11:00'),
      createSchicht('2026-10-05T11:30', '2026-10-05T17:30'),
    ]);

    expect(bloecke.map((block) => block.pauseMinuten)).toEqual([0, 0]);
  });

  it.each([
    [360, 0],
    [361, 30],
    [540, 30],
    [541, 45],
  ])('should calculate %i work minutes with %i paid break minutes', (dauer, pause) => {
    const beginn = Timestamp.fromMillis(0);
    const ende = Timestamp.fromMillis(dauer * 60_000);

    expect(calculateArbeitsbloecke([{ beginn, ende }])[0].pauseMinuten).toBe(pause);
  });

  it('should reject overlapping shifts', () => {
    expect(() => {
      return calculateArbeitsbloecke([
        createSchicht('2026-10-05T07:00', '2026-10-05T12:00'),
        createSchicht('2026-10-05T11:00', '2026-10-05T16:00'),
      ]);
    }).toThrow('dürfen sich nicht überschneiden');
  });
});

function createSchicht(beginn: string, ende: string): ISchichtZeitdaten {
  return {
    beginn: Timestamp.fromDate(new Date(`${beginn}:00+02:00`)),
    ende: Timestamp.fromDate(new Date(`${ende}:00+02:00`)),
  };
}
