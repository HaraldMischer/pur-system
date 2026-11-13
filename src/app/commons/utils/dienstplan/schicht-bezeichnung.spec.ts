// pur-system/src/app/commons/utils/dienstplan/schicht-bezeichnung.spec.ts

import { getNaechsteSchichtbezeichnung } from './schicht-bezeichnung';

describe('getNaechsteSchichtbezeichnung', () => {
  it('should return the next numbered default name', () => {
    expect(getNaechsteSchichtbezeichnung([])).toBe('Schicht 1');
    expect(getNaechsteSchichtbezeichnung(['Schicht 1', 'Frühschicht', ' Schicht 3 '])).toBe(
      'Schicht 4',
    );
  });
});
