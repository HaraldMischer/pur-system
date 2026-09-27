// pur-system/src/app/guards/guard-navigation.spec.ts

import { TAppBereich } from '../commons/models/app/app-bereich';
import { IBenutzerProfilDokument, TUserRole } from '../commons/models/domain/benutzer';
import { getErlaubteStartRoute } from './guard-navigation';

function createProfil(
  userRole: TUserRole,
  erlaubteBereiche: TAppBereich[],
): IBenutzerProfilDokument {
  return {
    email: 'test@example.com',
    anzeigename: 'Test',
    aktiv: true,
    userRole,
    erlaubteBereiche,
    zugriffe: {},
  };
}

describe('getErlaubteStartRoute', () => {
  it('should prefer dashboard over an earlier allowed area', () => {
    const profil = createProfil('mitarbeiter', ['schichtplan', 'dashboard']);

    expect(getErlaubteStartRoute(profil)).toBe('/dashboard');
  });

  it.each([['schichtplan', '/schichtplan']] as const)(
    'should map the allowed %s area to %s',
    (bereich, route) => {
      const profil = createProfil('mitarbeiter', [bereich]);

      expect(getErlaubteStartRoute(profil)).toBe(route);
    },
  );

  it.each(['office', 'filiale'] as const)(
    'should map the employee area to its list route for an assigned %s user',
    (userRole) => {
      const profil = createProfil(userRole, ['mitarbeiter']);
      profil.zugriffe = { 'u-1': { 'f-1': ['b-1'] } };

      expect(getErlaubteStartRoute(profil)).toBe('/mitarbeiter/liste');
    },
  );

  it('should allow verwaltung for an office user', () => {
    const profil = createProfil('office', ['verwaltung']);

    expect(getErlaubteStartRoute(profil)).toBe('/verwaltung');
  });

  it('should allow systemverwaltung for a master user', () => {
    const profil = createProfil('master', ['systemverwaltung']);

    expect(getErlaubteStartRoute(profil)).toBe('/systemverwaltung/datenstruktur');
  });

  it.each([
    ['filiale', ['verwaltung']],
    ['mitarbeiter', ['systemverwaltung']],
    ['office', ['systemverwaltung']],
  ] as const)(
    'should return null for a %s user with only inaccessible areas',
    (userRole, erlaubteBereiche) => {
      const profil = createProfil(userRole, [...erlaubteBereiche]);

      expect(getErlaubteStartRoute(profil)).toBeNull();
    },
  );

  it('should return null when no area is allowed', () => {
    const profil = createProfil('master', []);

    expect(getErlaubteStartRoute(profil)).toBeNull();
  });
});
