// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-namensaehnlichkeit.spec.ts

import { istAehnlicherMitarbeiterName } from './mitarbeiter-namensaehnlichkeit';

describe('Mitarbeiter-Namensähnlichkeit', () => {
  it('should recognize similar complete employee names', () => {
    expect(
      istAehnlicherMitarbeiterName(
        { vorname: 'Mia', nachname: 'Muster' },
        { vorname: 'Maria', nachname: 'Muster' },
      ),
    ).toBe(true);
    expect(
      istAehnlicherMitarbeiterName(
        { vorname: 'Harald', nachname: 'Mischer' },
        { vorname: 'Harry', nachname: 'Mischer' },
      ),
    ).toBe(true);
  });

  it('should normalize case, accents, spaces and separators', () => {
    expect(
      istAehnlicherMitarbeiterName(
        { vorname: ' Anne-Marie ', nachname: 'Weiß' },
        { vorname: 'annemarie', nachname: 'WEISS' },
      ),
    ).toBe(true);
  });

  it('should compare one available name component with the stricter threshold', () => {
    expect(
      istAehnlicherMitarbeiterName(
        { vorname: '', nachname: 'Mischer' },
        { vorname: 'Harald', nachname: 'Mischer' },
      ),
    ).toBe(true);
    expect(
      istAehnlicherMitarbeiterName(
        { vorname: '', nachname: 'Müller' },
        { vorname: 'Mia', nachname: 'Mueller' },
      ),
    ).toBe(true);
    expect(
      istAehnlicherMitarbeiterName(
        { vorname: '', nachname: 'Muster' },
        { vorname: 'Mia', nachname: 'Mustermann' },
      ),
    ).toBe(false);
  });

  it('should reject unrelated or non-comparable employee names', () => {
    expect(
      istAehnlicherMitarbeiterName(
        { vorname: 'Heike', nachname: 'Schilling' },
        { vorname: 'Heike', nachname: 'Fleing' },
      ),
    ).toBe(false);
    expect(
      istAehnlicherMitarbeiterName(
        { vorname: 'Mia', nachname: 'Muster' },
        { vorname: 'Zoe', nachname: 'Zulu' },
      ),
    ).toBe(false);
    expect(
      istAehnlicherMitarbeiterName(
        { vorname: '', nachname: '' },
        { vorname: 'Mia', nachname: 'Muster' },
      ),
    ).toBe(false);
  });
});
