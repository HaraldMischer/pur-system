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

  it('should preserve exact boundaries and create one grid column per 15-minute interval', () => {
    const zeitachse = createDienstplanZeitachse([zeitfenster]);

    expect(zeitachse.beginnMinuten).toBe(8 * 60 + 15);
    expect(zeitachse.endeMinuten).toBe(16 * 60 + 30);
    expect(zeitachse.dauerMinuten).toBe(8 * 60 + 15);
    expect(zeitachse.rasterAnzahl).toBe(33);
  });

  it('should create exact boundary marks with full hours in between', () => {
    const zeitachse = createDienstplanZeitachse([zeitfenster]);

    expect(zeitachse.marken.map((marke) => marke.bezeichnung)).toEqual([
      '08:15',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '16:30',
    ]);
  });

  it('should create exact boundary marks with full hours across midnight', () => {
    const zeitachse = createDienstplanZeitachse([
      {
        beginn: { lokalzeit: '18:15', amFolgetag: false },
        ende: { lokalzeit: '00:30', amFolgetag: true },
      },
    ]);

    expect(zeitachse.marken.map((marke) => marke.bezeichnung)).toEqual([
      '18:15',
      '19:00',
      '20:00',
      '21:00',
      '22:00',
      '23:00',
      '00:00',
      '00:30',
    ]);
  });

  it('should position shifts without artificial closed ranges on the 15-minute grid', () => {
    const zeitachse = createDienstplanZeitachse([zeitfenster]);

    expect(
      createDienstplanZeitachsenPositionen([{ id: 'schicht-1', ...zeitfenster }], zeitachse),
    ).toEqual([{ id: 'schicht-1', beginnRasterlinie: 1, endeRasterlinie: 34, spur: 0 }]);
    expect(createGeschlosseneZeitachsenPositionen(zeitfenster, zeitachse)).toEqual([]);
  });

  it('should reject a time outside the 15-minute grid', () => {
    const zeitachse = createDienstplanZeitachse([zeitfenster]);

    expect(() => {
      createDienstplanZeitachsenPositionen(
        [
          {
            id: 'schicht-1',
            beginn: { lokalzeit: '08:22', amFolgetag: false },
            ende: { lokalzeit: '16:30', amFolgetag: false },
          },
        ],
        zeitachse,
      );
    }).toThrow('15-Minuten-Rasters');
  });
});
