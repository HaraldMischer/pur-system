// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-berechtigung.spec.ts

import { IBenutzerProfilDokument, TUserRole } from '../../models/domain/benutzer';
import {
  darfMitarbeiterBereichNutzen,
  hatMitarbeiterVerwaltungszugriff,
  hatMitarbeiterVerwaltungszugriffAufFirma,
} from './mitarbeiter-berechtigung';

function createProfil(
  userRole: TUserRole,
  overrides: Partial<IBenutzerProfilDokument> = {},
): IBenutzerProfilDokument {
  return {
    email: 'test@example.com',
    anzeigename: 'Test',
    aktiv: true,
    userRole,
    erlaubteBereiche: ['dashboard', 'mitarbeiter'],
    zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
    ...overrides,
  };
}

describe('hatMitarbeiterVerwaltungszugriff', () => {
  it.each(['master', 'office', 'filiale'] as const)(
    'should allow an assigned active %s user',
    (userRole) => {
      expect(hatMitarbeiterVerwaltungszugriff(createProfil(userRole))).toBe(true);
    },
  );

  it('should allow a master without data scopes to manage every company', () => {
    const profil = createProfil('master', { zugriffe: {} });

    expect(darfMitarbeiterBereichNutzen(profil)).toBe(true);
    expect(hatMitarbeiterVerwaltungszugriff(profil)).toBe(true);
    expect(hatMitarbeiterVerwaltungszugriffAufFirma(profil, 'u-1', 'f-1')).toBe(true);
  });

  it('should reject the employee role', () => {
    expect(hatMitarbeiterVerwaltungszugriff(createProfil('mitarbeiter'))).toBe(false);
  });

  it('should reject the app area for master when it is not assigned', () => {
    expect(
      darfMitarbeiterBereichNutzen(
        createProfil('master', { erlaubteBereiche: ['dashboard'], zugriffe: {} }),
      ),
    ).toBe(false);
  });

  it('should keep data access independent from the assigned app area', () => {
    expect(
      hatMitarbeiterVerwaltungszugriff(createProfil('office', { erlaubteBereiche: ['dashboard'] })),
    ).toBe(true);
  });

  it('should reject inactive profiles and incomplete access scopes', () => {
    expect(hatMitarbeiterVerwaltungszugriff(createProfil('office', { aktiv: false }))).toBe(false);
    expect(
      hatMitarbeiterVerwaltungszugriff(createProfil('office', { zugriffe: { 'u-1': {} } })),
    ).toBe(false);
    expect(
      hatMitarbeiterVerwaltungszugriff(
        createProfil('filiale', { zugriffe: { 'u-1': { 'f-1': [] } } }),
      ),
    ).toBe(false);
  });

  it('should restrict company access to the explicitly assigned company', () => {
    const profil = createProfil('office');

    expect(hatMitarbeiterVerwaltungszugriffAufFirma(profil, 'u-1', 'f-1')).toBe(true);
    expect(hatMitarbeiterVerwaltungszugriffAufFirma(profil, 'u-1', 'f-2')).toBe(false);
    expect(hatMitarbeiterVerwaltungszugriffAufFirma(profil, 'u-2', 'f-1')).toBe(false);
  });
});
