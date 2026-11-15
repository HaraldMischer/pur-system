// pur-system/src/app/commons/validators/schichtmodell.validator.spec.ts

import type {
  ITagesvorlagenschichtSchreibdaten,
  TTagesvorlageTyp,
} from '../models/domain/schichtmodell';
import { assertGueltigeTagesvorlagenschichten } from './schichtmodell.validator';

describe('Schichtmodell-Validierung', () => {
  const randzeiten = { vorbereitungsminuten: 15, nachbereitungsminuten: 10 };
  const vorlagen = [
    {
      vorlage: 'wochentag' as const,
      bezeichnung: 'Wochentagsvorlage',
      oeffnung: {
        geoeffnet: true as const,
        beginnLokalzeit: '07:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    },
    {
      vorlage: 'sonntag' as const,
      bezeichnung: 'Sonntagsvorlage',
      oeffnung: {
        geoeffnet: true as const,
        beginnLokalzeit: '10:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    },
  ];

  it('akzeptiert unabhängige Vorlagen mit Überlappungen', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, '17:00'),
      createSchicht('wochentag', 1, '15:00', undefined),
      createSchicht('sonntag', 0, undefined, '18:00'),
      createSchicht('sonntag', 1, '17:00', undefined),
    ];

    expect(() => {
      assertGueltigeTagesvorlagenschichten(schichten, vorlagen, randzeiten);
    }).not.toThrow();
  });

  it('weist Kernzeiten außerhalb der Öffnung zurück', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, '16:00'),
      createSchicht('wochentag', 1, '06:00', undefined),
      createSchicht('sonntag', 0, undefined, undefined),
    ];

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, vorlagen, randzeiten)).toThrow(
      'Die Kernzeit der Tagesschicht muss innerhalb der Öffnung liegen.',
    );
  });

  it('weist ungültige modellweite Randminuten zurück', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, '17:00'),
      createSchicht('wochentag', 1, '15:00', undefined),
      createSchicht('sonntag', 0, undefined, undefined),
    ];

    expect(() =>
      assertGueltigeTagesvorlagenschichten(schichten, vorlagen, {
        vorbereitungsminuten: -1,
        nachbereitungsminuten: 10,
      }),
    ).toThrow('Vor- und Nachbereitungsminuten müssen ganze Zahlen von 0 bis 999 sein.');

    expect(() =>
      assertGueltigeTagesvorlagenschichten(schichten, vorlagen, {
        vorbereitungsminuten: 15,
        nachbereitungsminuten: 1.5,
      }),
    ).toThrow('Vor- und Nachbereitungsminuten müssen ganze Zahlen von 0 bis 999 sein.');

    expect(() =>
      assertGueltigeTagesvorlagenschichten(schichten, vorlagen, {
        vorbereitungsminuten: undefined as unknown as number,
        nachbereitungsminuten: 10,
      }),
    ).toThrow('Vor- und Nachbereitungsminuten müssen ganze Zahlen von 0 bis 999 sein.');
  });

  it('verlangt dynamische Außengrenzen und feste innere Grenzen', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, '17:00'),
      createSchicht('wochentag', 1, '15:00', undefined),
      createSchicht('sonntag', 0, undefined, undefined),
    ];
    schichten[0].beginn = { lokalzeit: '07:00', tag: 'starttag' };

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, vorlagen, randzeiten)).toThrow(
      'Die erste Tagesschicht darf keinen festen Beginn enthalten.',
    );

    delete schichten[0].beginn;
    delete schichten[1].beginn;

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, vorlagen, randzeiten)).toThrow(
      'Die Tagesschicht benötigt einen festen Beginn.',
    );
  });

  it('weist Schichtgrenzen außerhalb des 15-Minuten-Rasters zurück', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, '17:07'),
      createSchicht('wochentag', 1, '15:00', undefined),
      createSchicht('sonntag', 0, undefined, undefined),
    ];

    expect(() => {
      assertGueltigeTagesvorlagenschichten(schichten, vorlagen, randzeiten);
    }).toThrow('15-Minuten-Raster');
  });

  it('verlangt jede aktuell erforderliche abweichende Vorlage', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, undefined),
      createSchicht('sonntag', 0, undefined, undefined),
    ];
    const erweiterteVorlagen = [
      ...vorlagen,
      {
        vorlage: 'wochentag:montag' as const,
        bezeichnung: 'Montag',
        oeffnung: {
          geoeffnet: true as const,
          beginnLokalzeit: '14:00',
          endeLokalzeit: '01:00',
          endetAmFolgetag: true,
        },
      },
    ];

    expect(() =>
      assertGueltigeTagesvorlagenschichten(schichten, erweiterteVorlagen, randzeiten),
    ).toThrow('Die Tagesvorlage „Montag“ benötigt mindestens eine Schicht.');

    schichten.push(createSchicht('wochentag:montag', 0, undefined, undefined));

    expect(() => {
      assertGueltigeTagesvorlagenschichten(schichten, erweiterteVorlagen, randzeiten);
    }).not.toThrow();
  });

  it('weist nicht mehr erforderliche Vorlagen zurück', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, undefined),
      createSchicht('sonntag', 0, undefined, undefined),
      createSchicht('sondertag:alt', 0, undefined, undefined),
    ];

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, vorlagen, randzeiten)).toThrow(
      'Das Schichtmodell enthält eine nicht mehr erforderliche Tagesvorlage.',
    );
  });
});

function createSchicht(
  vorlage: TTagesvorlageTyp,
  reihenfolge: number,
  beginn: string | undefined,
  ende: string | undefined,
  endeTag: 'starttag' | 'folgetag' = 'starttag',
): ITagesvorlagenschichtSchreibdaten {
  return {
    vorlage,
    bezeichnung: `Schicht ${reihenfolge + 1}`,
    reihenfolge,
    ...(beginn ? { beginn: { lokalzeit: beginn, tag: 'starttag' as const } } : {}),
    ...(ende ? { ende: { lokalzeit: ende, tag: endeTag } } : {}),
    mehrfachbelegungErlaubt: false,
  };
}
