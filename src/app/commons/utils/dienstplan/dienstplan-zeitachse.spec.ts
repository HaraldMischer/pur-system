// pur-system/src/app/commons/utils/dienstplan/dienstplan-zeitachse.spec.ts

import {
  createDienstplanZeitachse,
  createDienstplanZeitachsenPositionen,
  createGeschlosseneZeitachsenPositionen,
} from './dienstplan-zeitachse';

describe('Dienstplan-Zeitachse', () => {
  const zeitfenster = {
    beginn: { lokalzeit: '08:15', amFolgetag: false },
    ende: { lokalzeit: '16:30', amFolgetag: false },
  } as const;

  it('should create one grid column for each 15-minute interval', () => {
    const zeitachse = createDienstplanZeitachse([zeitfenster]);

    expect(zeitachse.beginnMinuten).toBe(8 * 60);
    expect(zeitachse.endeMinuten).toBe(17 * 60);
    expect(zeitachse.dauerMinuten).toBe(9 * 60);
    expect(zeitachse.rasterAnzahl).toBe(36);
  });

  it('should position shifts and closed ranges on the 15-minute grid', () => {
    const zeitachse = createDienstplanZeitachse([zeitfenster]);

    expect(
      createDienstplanZeitachsenPositionen([{ id: 'schicht-1', ...zeitfenster }], zeitachse),
    ).toEqual([{ id: 'schicht-1', beginnRasterlinie: 2, endeRasterlinie: 35, spur: 0 }]);
    expect(createGeschlosseneZeitachsenPositionen(zeitfenster, zeitachse)).toEqual([
      { id: 'geschlossen-vorher', beginnRasterlinie: 1, endeRasterlinie: 2, spur: 0 },
      { id: 'geschlossen-nachher', beginnRasterlinie: 35, endeRasterlinie: 37, spur: 0 },
    ]);
  });

  it('should reject a time outside the 15-minute grid', () => {
    const zeitachse = createDienstplanZeitachse([zeitfenster]);

    expect(() => {
      createDienstplanZeitachsenPositionen(
        [
          {
            id: 'schicht-1',
            beginn: { lokalzeit: '08:07', amFolgetag: false },
            ende: { lokalzeit: '16:30', amFolgetag: false },
          },
        ],
        zeitachse,
      );
    }).toThrow('15-Minuten-Rasters');
  });
});
