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
      createSchicht('wochentag', 0, '07:00', '17:00'),
      createSchicht('wochentag', 1, '15:00', '01:00', 'folgetag'),
      createSchicht('sonntag', 0, '10:00', '18:00'),
      createSchicht('sonntag', 1, '17:00', '01:00', 'folgetag'),
    ];

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, oeffnungen)).not.toThrow();
  });

  it('weist Kernzeiten außerhalb der Öffnung zurück', () => {
    const schichten: ITagesvorlagenschichtSchreibdaten[] = [
      createSchicht('wochentag', 0, '06:00', '16:00'),
      createSchicht('sonntag', 0, '10:00', '18:00'),
    ];

    expect(() => assertGueltigeTagesvorlagenschichten(schichten, oeffnungen)).toThrow(
      'Die Kernzeit der Tagesschicht muss innerhalb der Öffnung liegen.',
    );
  });
});

function createSchicht(
  vorlage: 'wochentag' | 'sonntag',
  reihenfolge: number,
  beginn: string,
  ende: string,
  endeTag: 'starttag' | 'folgetag' = 'starttag',
): ITagesvorlagenschichtSchreibdaten {
  return {
    vorlage,
    bezeichnung: `Schicht ${reihenfolge + 1}`,
    reihenfolge,
    beginn: { lokalzeit: beginn, tag: 'starttag' },
    ende: { lokalzeit: ende, tag: endeTag },
    vorbereitungsminuten: 15,
    nachbereitungsminuten: 15,
    mehrfachbelegungErlaubt: false,
  };
}
