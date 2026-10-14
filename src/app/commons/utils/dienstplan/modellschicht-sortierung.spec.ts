// pur-system/src/app/commons/utils/dienstplan/modellschicht-sortierung.spec.ts

import { compareModellschichtenNachBeginn } from './modellschicht-sortierung';

describe('compareModellschichtenNachBeginn', () => {
  it('should sort model shifts by start time', () => {
    const modellschichten = [
      { bezeichnung: 'Spät', beginnLokalzeit: '16:00', endeLokalzeit: '01:00' },
      { bezeichnung: 'Früh', beginnLokalzeit: '07:00', endeLokalzeit: '16:00' },
      { bezeichnung: 'Mittel', beginnLokalzeit: '11:00', endeLokalzeit: '19:00' },
    ];

    expect(
      modellschichten.sort(compareModellschichtenNachBeginn).map(({ bezeichnung }) => bezeichnung),
    ).toEqual(['Früh', 'Mittel', 'Spät']);
  });

  it('should use end time, label and id as deterministic tie breakers', () => {
    const modellschichten = [
      { id: 'b', bezeichnung: 'B', beginnLokalzeit: '08:00', endeLokalzeit: '16:00' },
      { id: 'c', bezeichnung: 'A', beginnLokalzeit: '08:00', endeLokalzeit: '16:00' },
      { id: 'a', bezeichnung: 'A', beginnLokalzeit: '08:00', endeLokalzeit: '16:00' },
      { id: 'd', bezeichnung: 'D', beginnLokalzeit: '08:00', endeLokalzeit: '15:00' },
    ];

    expect(modellschichten.sort(compareModellschichtenNachBeginn).map(({ id }) => id)).toEqual([
      'd',
      'a',
      'c',
      'b',
    ]);
  });
});
