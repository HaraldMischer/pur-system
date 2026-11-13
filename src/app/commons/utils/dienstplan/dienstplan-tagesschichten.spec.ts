// pur-system/src/app/commons/utils/dienstplan/dienstplan-tagesschichten.spec.ts

import type { IDienstplanKalendertag } from '../../models/domain/dienstplan-kalendertag';
import type { ISchichtmodellBestand } from '../../models/domain/schichtmodell';
import { createDienstplanTagesschichten } from './dienstplan-tagesschichten';

describe('Dienstplan-Tagesschichten', () => {
  it('verwendet unabhängige Vorlagen und verlangt nur für abweichende Sondertage eine freie Struktur', () => {
    const kalendertage = [
      createKalendertag('2026-12-05', false),
      createKalendertag('2026-12-06', true),
      createKalendertag('2026-12-07', false, false, '09:00', '23:00', false),
      {
        ...createKalendertag('2026-12-25', false, false, '10:00'),
        oeffnungsregelQuelle: 'sonntag' as const,
        sondertagId: 'erster-weihnachtstag',
      },
      createKalendertag('2026-12-24', false, true, '07:00', '16:00', false),
    ];
    const ergebnis = createDienstplanTagesschichten({
      kalendertage,
      schichtmodell: createModell(),
      freieSondertagsschichten: [
        {
          datum: '2026-12-24',
          bezeichnung: 'Heiligabend',
          reihenfolge: 0,
          beginn: { lokalzeit: '07:00', tag: 'starttag' },
          ende: { lokalzeit: '16:00', tag: 'starttag' },
          vorbereitungsminuten: 15,
          nachbereitungsminuten: 30,
          mehrfachbelegungErlaubt: false,
        },
      ],
      zeitzone: 'Europe/Berlin',
    });

    expect(ergebnis.filter((schicht) => schicht.datum === '2026-12-05')).toHaveLength(2);
    expect(ergebnis.filter((schicht) => schicht.datum === '2026-12-06')).toHaveLength(3);
    const abweichenderWochentag = ergebnis.filter((schicht) => schicht.datum === '2026-12-07');
    expect(abweichenderWochentag[0].kernbeginnLokalzeit).toBe('09:00');
    expect(abweichenderWochentag.at(-1)?.kernendeLokalzeit).toBe('23:00');
    expect(ergebnis.filter((schicht) => schicht.datum === '2026-12-25')).toHaveLength(3);
    expect(ergebnis.find((schicht) => schicht.datum === '2026-12-25')?.herkunft).toBe('sonntag');
    expect(ergebnis.find((schicht) => schicht.datum === '2026-12-24')?.herkunft).toBe('sondertag');
  });
});

function createKalendertag(
  datum: string,
  istSonntag: boolean,
  istSondertag = false,
  beginnLokalzeit = istSonntag ? '10:00' : '07:00',
  endeLokalzeit = '01:00',
  endetAmFolgetag = true,
): IDienstplanKalendertag {
  return {
    datum,
    wochentag: istSonntag ? 'sonntag' : 'samstag',
    istSonntag,
    aktiveSondertage: [],
    oeffnungsregelQuelle: istSondertag ? 'sondertag' : 'wochentag',
    oeffnungsregel: { geoeffnet: true, beginnLokalzeit, endeLokalzeit, endetAmFolgetag },
  };
}

function createModell(): ISchichtmodellBestand {
  const pfad = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' };
  return {
    schichtmodell: {
      ...pfad,
      id: 'tage-1',
      bezeichnung: 'Standard',
      aktiv: true,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    tagesvorlagenschichten: [
      ...createVorlage(pfad, 'wochentag', 2),
      ...createVorlage(pfad, 'sonntag', 3),
    ],
  };
}

function createVorlage(
  pfad: { unternehmerId: string; firmaId: string; filialeId: string },
  vorlage: 'wochentag' | 'sonntag',
  anzahl: number,
) {
  return Array.from({ length: anzahl }, (_, reihenfolge) => {
    const beginn = `${10 + reihenfolge * 4}:00`;
    const istLetzte = reihenfolge === anzahl - 1;
    return {
      ...pfad,
      id: `${vorlage}-${reihenfolge}`,
      schichtmodellId: 'tage-1',
      vorlage,
      bezeichnung: `Schicht ${reihenfolge + 1}`,
      reihenfolge,
      ...(reihenfolge > 0 ? { beginn: { lokalzeit: beginn, tag: 'starttag' as const } } : {}),
      ...(!istLetzte
        ? { ende: { lokalzeit: `${14 + reihenfolge * 4}:00`, tag: 'starttag' as const } }
        : {}),
      vorbereitungsminuten: 0,
      nachbereitungsminuten: 0,
      mehrfachbelegungErlaubt: false,
    };
  });
}
