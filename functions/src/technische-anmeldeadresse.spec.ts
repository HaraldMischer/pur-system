// pur-system/functions/src/technische-anmeldeadresse.spec.ts

import { describe, expect, it } from 'vitest';

import {
  buildAnmeldename,
  buildTechnischeAnmeldeadresse,
  normalizeAnmeldename,
  normalizeNamensbestandteil,
} from './technische-anmeldeadresse';

describe('technische Anmeldeadresse', () => {
  it('normalisiert Namen mit Leerzeichen, Umlauten und Sonderzeichen', () => {
    expect(normalizeNamensbestandteil('  HÄRÄLD Míßer!  ')).toBe('haeraeld.misser');
  });

  it('erhält vorhandene Punkte und Bindestriche', () => {
    expect(normalizeNamensbestandteil('Harald-Mischer')).toBe('harald-mischer');
    expect(normalizeNamensbestandteil('Harald.Mischer')).toBe('harald.mischer');
  });

  it('bereinigt mehrfache und äußere Namenstrennzeichen', () => {
    expect(normalizeNamensbestandteil(' . Harald  --  Mischer . ')).toBe('harald-mischer');
  });

  it.each(['filiale', 'office', 'mitarbeiter', 'master'])(
    'hängt die Rolle %s an den Namensbestandteil an',
    (userRole) => {
      expect(buildAnmeldename('Harald Mischer', userRole)).toBe(`harald.mischer-${userRole}`);
    },
  );

  it('bildet die technische Firebase-Adresse', () => {
    expect(buildTechnischeAnmeldeadresse('Harald.Mischer--MASTER')).toBe(
      'harald.mischer-master@pur-system.invalid',
    );
  });

  it('normalisiert vollständige Anmeldenamen mit Punkten und Rollentrenner', () => {
    expect(normalizeAnmeldename(' Harald.Mischer--MASTER ')).toBe('harald.mischer-master');
  });
});
