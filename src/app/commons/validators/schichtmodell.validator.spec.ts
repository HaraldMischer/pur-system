// pur-system/src/app/commons/validators/schichtmodell.validator.spec.ts

import { IModellschichtSchreibdaten } from '../models/domain/schichtmodell';
import { assertGueltigeModellschichten, hatModellschichtLuecken } from './schichtmodell.validator';

describe('Schichtmodellvalidierung', () => {
  it('should accept consecutive and overlapping model shifts', () => {
    expect(() => assertGueltigeModellschichten(createModellschichten())).not.toThrow();

    const ueberlappend = createModellschichtenMitDreiSchichten();
    ueberlappend[0].ende = { lokalzeit: '18:00', tag: 'starttag' };
    ueberlappend[1].ende = { lokalzeit: '18:00', tag: 'starttag' };
    ueberlappend[2].beginn = { lokalzeit: '13:00', tag: 'starttag' };

    expect(() => assertGueltigeModellschichten(ueberlappend)).not.toThrow();
    expect(hatModellschichtLuecken(ueberlappend)).toBe(false);
  });

  it('should detect a gap without rejecting the model', () => {
    const modellschichten = createModellschichten();
    modellschichten[1].beginn = { lokalzeit: '16:30', tag: 'starttag' };

    expect(() => assertGueltigeModellschichten(modellschichten)).not.toThrow();
    expect(hatModellschichtLuecken(modellschichten)).toBe(true);
  });

  it('should require a unique consecutive order and unique existing ids', () => {
    const falscheReihenfolge = createModellschichten();
    falscheReihenfolge[1].reihenfolge = 2;
    expect(() => assertGueltigeModellschichten(falscheReihenfolge)).toThrow('Reihenfolge');

    const doppelteIds = createModellschichten();
    doppelteIds[1].id = doppelteIds[0].id;
    expect(() => assertGueltigeModellschichten(doppelteIds)).toThrow('IDs');
  });

  it('should require only the inner boundaries with valid day assignments', () => {
    const ersterBeginn = createModellschichten();
    ersterBeginn[0].beginn = { lokalzeit: '07:00', tag: 'starttag' };
    expect(() => assertGueltigeModellschichten(ersterBeginn)).toThrow('keinen festen Beginn');

    const fehlenderInnererBeginn = createModellschichten();
    delete fehlenderInnererBeginn[1].beginn;
    expect(() => assertGueltigeModellschichten(fehlenderInnererBeginn)).toThrow('festen Beginn');

    const ungueltigerTag = createModellschichten();
    ungueltigerTag[1].beginn = {
      lokalzeit: '16:00',
      tag: 'ungueltig' as 'starttag',
    };
    expect(() => assertGueltigeModellschichten(ungueltigerTag)).toThrow('Zeitgrenze');
  });

  it('should reject nonpositive inner durations and misplaced edge minutes', () => {
    const ohneDauer = createModellschichtenMitDreiSchichten();
    ohneDauer[1].beginn = { lokalzeit: '16:00', tag: 'starttag' };
    ohneDauer[1].ende = { lokalzeit: '16:00', tag: 'starttag' };
    expect(() => assertGueltigeModellschichten(ohneDauer)).toThrow('positive Dauer');

    const falscheVorbereitung = createModellschichten();
    falscheVorbereitung[1].vorbereitungsminuten = 15;
    expect(() => assertGueltigeModellschichten(falscheVorbereitung)).toThrow(
      'Vorbereitungsminuten',
    );

    const zuLangeVorbereitung = createModellschichten();
    zuLangeVorbereitung[0].vorbereitungsminuten = 1000;
    expect(() => assertGueltigeModellschichten(zuLangeVorbereitung)).toThrow('0 bis 999');
  });
});

function createModellschichten(): IModellschichtSchreibdaten[] {
  return [
    {
      id: 'frueh',
      bezeichnung: 'Früh',
      reihenfolge: 0,
      ende: { lokalzeit: '16:00', tag: 'starttag' },
      mehrfachbelegungErlaubt: false,
      vorbereitungsminuten: 30,
    },
    {
      id: 'spaet',
      bezeichnung: 'Spät',
      reihenfolge: 1,
      beginn: { lokalzeit: '16:00', tag: 'starttag' },
      mehrfachbelegungErlaubt: false,
      nachbereitungsminuten: 15,
    },
  ];
}

function createModellschichtenMitDreiSchichten(): IModellschichtSchreibdaten[] {
  return [
    {
      id: 'frueh',
      bezeichnung: 'Früh',
      reihenfolge: 0,
      ende: { lokalzeit: '12:00', tag: 'starttag' },
      mehrfachbelegungErlaubt: false,
    },
    {
      id: 'mittel',
      bezeichnung: 'Mittel',
      reihenfolge: 1,
      beginn: { lokalzeit: '12:00', tag: 'starttag' },
      ende: { lokalzeit: '16:00', tag: 'starttag' },
      mehrfachbelegungErlaubt: false,
    },
    {
      id: 'spaet',
      bezeichnung: 'Spät',
      reihenfolge: 2,
      beginn: { lokalzeit: '16:00', tag: 'starttag' },
      mehrfachbelegungErlaubt: false,
    },
  ];
}
