// pur-system/src/app/commons/validators/schicht-tagesmodell.validator.spec.ts

import type { ITagesvorlagenschichtSchreibdaten } from '../models/domain/schicht-tagesmodell';
import { assertGueltigeTagesvorlagenschichten } from './schicht-tagesmodell.validator';

describe('Schicht-Tagesmodell-Validierung', () => {
  const oeffnungen = {
    wochentag: {
      geoeffnet: true as const,
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    },
    sonntag: {
      geoeffnet: true as const,
      beginnLokalzeit: '10:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    },
  };

  it('akzeptiert unabhängige Vorlagen mit Überlappungen', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, '17:00'),
      createSchicht('wochentag', 1, '15:00', undefined),
      createSchicht('sonntag', 0, undefined, '18:00'),
      createSchicht('sonntag', 1, '17:00', undefined),
    ];

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, oeffnungen)).not.toThrow();
  });

  it('weist Kernzeiten außerhalb der Öffnung zurück', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, '16:00'),
      createSchicht('wochentag', 1, '06:00', undefined),
      createSchicht('sonntag', 0, undefined, undefined),
    ];

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, oeffnungen)).toThrow(
      'Die Kernzeit der Tagesschicht muss innerhalb der Öffnung liegen.',
    );
  });

  it('erlaubt Randminuten nur an der ersten und letzten Schicht jeder Vorlage', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, '17:00', 'starttag', 15, 0),
      createSchicht('wochentag', 1, '15:00', undefined, 'starttag', 5, 15),
      createSchicht('sonntag', 0, undefined, undefined, 'starttag', 15, 15),
    ];

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, oeffnungen)).toThrow(
      'Vorbereitungsminuten sind nur an der ersten und Nachbereitungsminuten nur an der letzten Tagesschicht erlaubt.',
    );

    schichten[1].vorbereitungsminuten = 0;
    schichten[0].nachbereitungsminuten = 5;

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, oeffnungen)).toThrow(
      'Vorbereitungsminuten sind nur an der ersten und Nachbereitungsminuten nur an der letzten Tagesschicht erlaubt.',
    );

    schichten[0].nachbereitungsminuten = 0;

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, oeffnungen)).not.toThrow();
  });

  it('verlangt dynamische Außengrenzen und feste innere Grenzen', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, undefined, '17:00'),
      createSchicht('wochentag', 1, '15:00', undefined),
      createSchicht('sonntag', 0, undefined, undefined),
    ];
    schichten[0].beginn = { lokalzeit: '07:00', tag: 'starttag' };

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, oeffnungen)).toThrow(
      'Die erste Tagesschicht darf keinen festen Beginn enthalten.',
    );

    delete schichten[0].beginn;
    delete schichten[1].beginn;

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, oeffnungen)).toThrow(
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
      assertGueltigeTagesvorlagenschichten(schichten, oeffnungen);
    }).toThrow('15-Minuten-Raster');
  });
});

function createSchicht(
  vorlage: 'wochentag' | 'sonntag',
  reihenfolge: number,
  beginn: string | undefined,
  ende: string | undefined,
  endeTag: 'starttag' | 'folgetag' = 'starttag',
  vorbereitungsminuten = 0,
  nachbereitungsminuten = 0,
): ITagesvorlagenschichtSchreibdaten {
  return {
    vorlage,
    bezeichnung: `Schicht ${reihenfolge + 1}`,
    reihenfolge,
    ...(beginn ? { beginn: { lokalzeit: beginn, tag: 'starttag' as const } } : {}),
    ...(ende ? { ende: { lokalzeit: ende, tag: endeTag } } : {}),
    vorbereitungsminuten,
    nachbereitungsminuten,
    mehrfachbelegungErlaubt: false,
  };
}
