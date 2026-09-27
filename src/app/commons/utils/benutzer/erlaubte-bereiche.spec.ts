// pur-system/src/app/commons/utils/benutzer/erlaubte-bereiche.spec.ts

import { buildErlaubteBereiche, getWaehlbareAppBereiche } from './erlaubte-bereiche';

describe('erlaubte-bereiche', () => {
  it.each([
    ['master', ['schichtplan', 'mitarbeiter', 'verwaltung']],
    ['office', ['schichtplan', 'mitarbeiter', 'verwaltung']],
    ['filiale', ['schichtplan', 'mitarbeiter']],
    ['mitarbeiter', ['schichtplan']],
  ] as const)('should expose optional areas for %s', (userRole, expected) => {
    expect(getWaehlbareAppBereiche(userRole).map((bereich) => bereich.value)).toEqual(expected);
  });

  it.each(['office', 'filiale', 'mitarbeiter'] as const)(
    'should always provide dashboard and exclude system administration for %s',
    (userRole) => {
      expect(buildErlaubteBereiche(userRole, ['systemverwaltung'])).toEqual(['dashboard']);
    },
  );

  it('should always provide dashboard and system administration for master', () => {
    expect(buildErlaubteBereiche('master', [])).toEqual(['dashboard', 'systemverwaltung']);
  });

  it('should preserve optional areas once in their configured order', () => {
    expect(
      buildErlaubteBereiche('office', ['verwaltung', 'dashboard', 'schichtplan', 'verwaltung']),
    ).toEqual(['dashboard', 'schichtplan', 'verwaltung']);
  });

  it.each([
    ['filiale', ['verwaltung'], ['dashboard']],
    ['mitarbeiter', ['mitarbeiter', 'verwaltung'], ['dashboard']],
  ] as const)('should remove areas unavailable for %s', (userRole, areas, expected) => {
    expect(buildErlaubteBereiche(userRole, [...areas])).toEqual(expected);
  });

  it('should preserve the optional employee area for master', () => {
    expect(buildErlaubteBereiche('master', ['mitarbeiter'])).toEqual([
      'dashboard',
      'mitarbeiter',
      'systemverwaltung',
    ]);
  });
});
