// pur-system/src/app/commons/utils/dienstplan/dienstplan-tagesschichten.spec.ts

import type { IDienstplanKalendertag } from '../../models/domain/dienstplan-kalendertag';
import type { ISchichtmodellBestand, TTagesvorlageTyp } from '../../models/domain/schichtmodell';
import {
  assertSchichtmodellPasstZuKalendertagen,
  createDienstplanTagesschichten,
  SchichtmodellOeffnungszeitenFehler,
} from './dienstplan-tagesschichten';

describe('Dienstplan-Tagesschichten', () => {
  it('verwendet die passenden Modellvorlagen für reguläre und abweichende Tage', () => {
    const kalendertage = [
      createKalendertag('2026-12-05', false),
      createKalendertag('2026-12-06', true),
      createKalendertag('2026-12-07', false, false, '09:00', '23:00', false, 'montag'),
      {
        ...createKalendertag('2026-12-25', false, false, '10:00'),
        oeffnungsregelQuelle: 'sonntag' as const,
        tagesstrukturQuelle: 'sonntagsvorlage' as const,
        sondertagId: 'erster-weihnachtstag',
      },
      {
        ...createKalendertag('2026-12-24', false, true, '07:00', '16:00', false),
        sondertagId: 'heiligabend',
      },
    ];
    const ergebnis = createDienstplanTagesschichten({
      kalendertage,
      schichtmodell: createModell(),
      zeitzone: 'Europe/Berlin',
    });

    expect(ergebnis.filter((schicht) => schicht.datum === '2026-12-05')).toHaveLength(2);
    expect(ergebnis.filter((schicht) => schicht.datum === '2026-12-06')).toHaveLength(3);
    const abweichenderWochentag = ergebnis.filter((schicht) => schicht.datum === '2026-12-07');
    expect(abweichenderWochentag[0].kernbeginnLokalzeit).toBe('09:00');
    expect(abweichenderWochentag[0].kernendeLokalzeit).toBe('14:00');
    expect(abweichenderWochentag.at(-1)?.kernendeLokalzeit).toBe('23:00');
    expect(ergebnis.filter((schicht) => schicht.datum === '2026-12-25')).toHaveLength(3);
    expect(ergebnis.find((schicht) => schicht.datum === '2026-12-25')?.herkunft).toBe('sonntag');
    expect(ergebnis.find((schicht) => schicht.datum === '2026-12-24')?.herkunft).toBe('sondertag');
    const samstag = ergebnis.filter((schicht) => schicht.datum === '2026-12-05');
    expect(samstag[0].vorbereitungsminuten).toBe(30);
    expect(samstag[0].nachbereitungsminuten).toBe(0);
    expect(samstag.at(-1)?.vorbereitungsminuten).toBe(0);
    expect(samstag.at(-1)?.nachbereitungsminuten).toBe(20);
    const sonntag = ergebnis.filter((schicht) => schicht.datum === '2026-12-06');
    expect(sonntag[0].vorbereitungsminuten).toBe(30);
    expect(sonntag[0].nachbereitungsminuten).toBe(0);
    expect(sonntag[1].vorbereitungsminuten).toBe(0);
    expect(sonntag[1].nachbereitungsminuten).toBe(0);
    expect(sonntag[2].vorbereitungsminuten).toBe(0);
    expect(sonntag[2].nachbereitungsminuten).toBe(20);
    const heiligabend = ergebnis.filter((schicht) => schicht.datum === '2026-12-24');
    expect(heiligabend[0].vorbereitungsminuten).toBe(30);
    expect(heiligabend[0].nachbereitungsminuten).toBe(20);
  });

  it('behält die übernommenen Randzeiten als Monatsmomentaufnahme bei', () => {
    const modell = createModell();
    const ergebnis = createDienstplanTagesschichten({
      kalendertage: [createKalendertag('2026-12-05', false)],
      schichtmodell: modell,
      zeitzone: 'Europe/Berlin',
    });

    modell.schichtmodell.vorbereitungsminuten = 45;
    modell.schichtmodell.nachbereitungsminuten = 35;

    expect(ergebnis[0].vorbereitungsminuten).toBe(30);
    expect(ergebnis.at(-1)?.nachbereitungsminuten).toBe(20);
  });

  it('verhindert die Anlage ohne erforderliche abweichende Modellvorlage', () => {
    expect(() => {
      return createDienstplanTagesschichten({
        kalendertage: [
          createKalendertag('2026-12-07', false, false, '09:00', '23:00', false, 'montag'),
        ],
        schichtmodell: {
          ...createModell(),
          tagesvorlagenschichten: createModell().tagesvorlagenschichten.filter((schicht) => {
            return schicht.vorlage !== 'wochentag:montag';
          }),
        },
        zeitzone: 'Europe/Berlin',
      });
    }).toThrow(SchichtmodellOeffnungszeitenFehler);
  });

  it('erkennt ein unpassendes Schichtmodell bereits vor der freien Tageskonfiguration', () => {
    expect(() => {
      assertSchichtmodellPasstZuKalendertagen(
        [createKalendertag('2026-12-05', false, false, '15:00', '23:00', false)],
        createModell(),
      );
    }).toThrow(SchichtmodellOeffnungszeitenFehler);
  });
});

function createKalendertag(
  datum: string,
  istSonntag: boolean,
  istSondertag = false,
  beginnLokalzeit = istSonntag ? '10:00' : '07:00',
  endeLokalzeit = '01:00',
  endetAmFolgetag = true,
  wochentag: IDienstplanKalendertag['wochentag'] = istSonntag ? 'sonntag' : 'samstag',
): IDienstplanKalendertag {
  return {
    datum,
    wochentag,
    istSonntag,
    aktiveSondertage: [],
    oeffnungsregelQuelle: istSondertag ? 'sondertag' : 'wochentag',
    oeffnungsregel: { geoeffnet: true, beginnLokalzeit, endeLokalzeit, endetAmFolgetag },
    tagesstrukturQuelle: istSondertag
      ? 'sondertagsvorlage'
      : wochentag === 'montag'
        ? 'abweichendeWochentagsvorlage'
        : istSonntag
          ? 'sonntagsvorlage'
          : 'wochentagsvorlage',
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
      vorbereitungsminuten: 30,
      nachbereitungsminuten: 20,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    },
    tagesvorlagenschichten: [
      ...createVorlage(pfad, 'wochentag', 2),
      ...createVorlage(pfad, 'sonntag', 3),
      ...createVorlage(pfad, 'wochentag:montag', 2),
      ...createVorlage(pfad, 'sondertag:heiligabend', 1),
    ],
  };
}

function createVorlage(
  pfad: { unternehmerId: string; firmaId: string; filialeId: string },
  vorlage: TTagesvorlageTyp,
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
      mehrfachbelegungErlaubt: false,
    };
  });
}
