// pur-system/src/app/commons/utils/dienstplan/modellschicht-sortierung.spec.ts

import { compareModellschichtenNachReihenfolge } from './modellschicht-sortierung';

describe('compareModellschichtenNachReihenfolge', () => {
  it('should sort model shifts by their stored order', () => {
    const modellschichten = [
      { bezeichnung: 'Spät', reihenfolge: 2 },
      { bezeichnung: 'Früh', reihenfolge: 0 },
      { bezeichnung: 'Mittel', reihenfolge: 1 },
    ];

    expect(
      modellschichten
        .sort(compareModellschichtenNachReihenfolge)
        .map(({ bezeichnung }) => bezeichnung),
    ).toEqual(['Früh', 'Mittel', 'Spät']);
  });

  it('should use label and id as deterministic tie breakers', () => {
    const modellschichten = [
      { id: 'b', bezeichnung: 'B', reihenfolge: 0 },
      { id: 'c', bezeichnung: 'A', reihenfolge: 0 },
      { id: 'a', bezeichnung: 'A', reihenfolge: 0 },
    ];

    expect(modellschichten.sort(compareModellschichtenNachReihenfolge).map(({ id }) => id)).toEqual(
      ['a', 'c', 'b'],
    );
  });
});
