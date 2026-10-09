// pur-system/src/app/commons/utils/dienstplan/schicht-zeit.spec.ts

import { Timestamp } from 'firebase/firestore';

import { ISchichtAnlage } from '../../models/domain/schicht';
import { calculateSchichtArbeitszeitMinuten } from './schicht-zeit';

describe('calculateSchichtArbeitszeitMinuten', () => {
  it('should calculate a same-day shift', () => {
    expect(
      calculateSchichtArbeitszeitMinuten(createSchicht('2026-10-05T08:00', '2026-10-05T16:00', 30)),
    ).toBe(450);
  });

  it('should calculate a shift across midnight', () => {
    expect(
      calculateSchichtArbeitszeitMinuten(createSchicht('2026-10-06T22:00', '2026-10-07T06:00', 30)),
    ).toBe(450);
  });

  it.each([
    ['2026-10-05T08:00', '2026-10-05T08:00', 0],
    ['2026-10-05T09:00', '2026-10-05T08:00', 0],
    ['2026-10-05T08:00', '2026-10-05T09:00', -1],
    ['2026-10-05T08:00', '2026-10-05T09:00', 60],
    ['2026-10-05T08:00', '2026-10-05T09:00', 60.5],
  ])('should reject invalid shift values', (beginn, ende, pauseMinuten) => {
    expect(() =>
      calculateSchichtArbeitszeitMinuten(createSchicht(beginn, ende, pauseMinuten)),
    ).toThrow('Beginn, Ende und Pause ergeben keine gültige Schicht.');
  });
});

function createSchicht(beginn: string, ende: string, pauseMinuten: number): ISchichtAnlage {
  return {
    mitarbeiterId: 'm-1',
    mitarbeiterAnzeigename: 'Mia Muster',
    schichtvorlageId: 'sv-1',
    schichtvorlageBezeichnung: 'Frühschicht',
    beginn: Timestamp.fromDate(new Date(`${beginn}:00+02:00`)),
    ende: Timestamp.fromDate(new Date(`${ende}:00+02:00`)),
    pauseMinuten,
  };
}
