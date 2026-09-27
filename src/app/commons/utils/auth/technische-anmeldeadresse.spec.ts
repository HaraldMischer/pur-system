// pur-system/src/app/commons/utils/auth/technische-anmeldeadresse.spec.ts

import { TUserRole } from '../../models/domain/benutzer';
import {
  buildAnmeldename,
  buildTechnischeAnmeldeadresse,
  normalizeAnmeldename,
  normalizeNamensbestandteil,
  TECHNISCHE_ANMELDE_DOMAIN,
} from './technische-anmeldeadresse';

describe('technische Anmeldeadresse', () => {
  it('normalisiert Leerzeichen, Großschreibung und deutsche Zeichen', () => {
    expect(normalizeNamensbestandteil('  Jörg Weiß  ')).toBe('joerg.weiss');
  });

  it('erhält Punkte und Bindestriche und entfernt andere Sonderzeichen', () => {
    expect(normalizeNamensbestandteil("Émilie Anne-Marie O'Neil")).toBe('emilie.anne-marie.oneil');
  });

  it('bereinigt mehrfache und äußere Namenstrennzeichen', () => {
    expect(normalizeNamensbestandteil(' . Harald  --  Mischer . ')).toBe('harald-mischer');
  });

  it.each<TUserRole>(['filiale', 'office', 'mitarbeiter', 'master'])(
    'hängt die Rolle %s an den normalisierten Namensbestandteil an',
    (userRole) => {
      expect(buildAnmeldename('Harald Mischer', userRole)).toBe(`harald.mischer-${userRole}`);
    },
  );

  it.each([
    ['Hagener Str.', 'filiale', 'hagener.str-filiale@pur-system.invalid'],
    ['Harald-Mischer', 'mitarbeiter', 'harald-mischer-mitarbeiter@pur-system.invalid'],
  ] as const)(
    'bildet für %s und die Rolle %s die appabhängige technische Adresse',
    (namensbestandteil, userRole, erwarteteAdresse) => {
      const anmeldename = buildAnmeldename(namensbestandteil, userRole);

      expect(buildTechnischeAnmeldeadresse(anmeldename)).toBe(erwarteteAdresse);
    },
  );

  it('normalisiert einen vollständigen Anmeldenamen und erhält den Rollentrenner', () => {
    expect(normalizeAnmeldename('  Harald.Mischer--MASTER  ')).toBe('harald.mischer-master');
  });

  it('bildet die technische Firebase-Adresse mit der gemeinsamen Domain', () => {
    expect(buildTechnischeAnmeldeadresse('Harald.Mischer-MASTER')).toBe(
      `harald.mischer-master@${TECHNISCHE_ANMELDE_DOMAIN}`,
    );
  });

  it('liefert für einen leeren oder vollständig entfernten Namen keinen Anmeldenamen', () => {
    expect(normalizeNamensbestandteil(' --- ')).toBe('');
    expect(buildAnmeldename(' --- ', 'master')).toBe('');
    expect(buildTechnischeAnmeldeadresse(' --- ')).toBe('');
  });
});
