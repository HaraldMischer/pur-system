// pur-system/src/app/commons/constants/navigation.constants.spec.ts

import { TUserRole } from '../models/domain/benutzer';
import { getNavigationLinks } from '../utils/navigation/rollen-navigation';
import { NAVIGATION_NACH_ROLLE } from './navigation.constants';

const USER_ROLES: readonly TUserRole[] = ['filiale', 'office', 'mitarbeiter', 'master'];

function getNavigationIds(userRole: TUserRole): string[] {
  return NAVIGATION_NACH_ROLLE[userRole].eintraege.map((eintrag) => eintrag.id);
}

describe('NAVIGATION_NACH_ROLLE', () => {
  it('should provide a navigation configuration for every user role', () => {
    expect(Object.keys(NAVIGATION_NACH_ROLLE).sort()).toEqual([...USER_ROLES].sort());
  });

  it('should use nested navigation for management roles and flat navigation for employees', () => {
    expect(NAVIGATION_NACH_ROLLE.master.darstellung).toBe('nested');
    expect(NAVIGATION_NACH_ROLLE.office.darstellung).toBe('nested');
    expect(NAVIGATION_NACH_ROLLE.filiale.darstellung).toBe('nested');
    expect(NAVIGATION_NACH_ROLLE.mitarbeiter.darstellung).toBe('flat');
  });

  it('should provide employees as a nested list route for the allowed management roles', () => {
    for (const userRole of ['master', 'office', 'filiale'] as const) {
      const mitarbeiter = NAVIGATION_NACH_ROLLE[userRole].eintraege.find(
        (eintrag) => eintrag.id === 'mitarbeiter',
      );

      expect(mitarbeiter?.typ).toBe('gruppe');
      if (mitarbeiter?.typ !== 'gruppe') continue;
      expect(mitarbeiter.kinder.map((eintrag) => eintrag.id)).toEqual(['mitarbeiterliste']);
      expect(getNavigationLinks(mitarbeiter.kinder).map((eintrag) => eintrag.route)).toEqual([
        '/mitarbeiter/liste',
      ]);
    }

    expect(getNavigationIds('mitarbeiter')).not.toContain('mitarbeiter');
  });

  it('should provide verwaltung only for master and office', () => {
    expect(getNavigationIds('master')).toContain('verwaltung');
    expect(getNavigationIds('office')).toContain('verwaltung');
    expect(getNavigationIds('filiale')).not.toContain('verwaltung');
    expect(getNavigationIds('mitarbeiter')).not.toContain('verwaltung');
  });

  it('should provide systemverwaltung only for master', () => {
    expect(getNavigationIds('master')).toContain('systemverwaltung');
    expect(getNavigationIds('office')).not.toContain('systemverwaltung');
    expect(getNavigationIds('filiale')).not.toContain('systemverwaltung');
    expect(getNavigationIds('mitarbeiter')).not.toContain('systemverwaltung');
  });

  it('should provide administration as a group with separate child routes', () => {
    const systemverwaltung = NAVIGATION_NACH_ROLLE.master.eintraege.find(
      (eintrag) => eintrag.id === 'systemverwaltung',
    );

    expect(systemverwaltung?.typ).toBe('gruppe');
    if (systemverwaltung?.typ !== 'gruppe') return;

    const kinder = getNavigationLinks(systemverwaltung.kinder).map((eintrag) => ({
      id: eintrag.id,
      route: eintrag.route,
    }));
    expect(kinder).toHaveLength(3);
    expect(kinder).toEqual(
      expect.arrayContaining([
        { id: 'datenstruktur', route: '/systemverwaltung/datenstruktur' },
        { id: 'benutzerverwaltung', route: '/systemverwaltung/benutzer' },
        { id: 'datenmigration', route: '/systemverwaltung/datenmigration' },
      ]),
    );
  });

  it('should provide complete link data for every configured entry', () => {
    for (const userRole of USER_ROLES) {
      const links = getNavigationLinks(NAVIGATION_NACH_ROLLE[userRole].eintraege);
      for (const eintrag of links) {
        expect(eintrag.id).not.toBe('');
        expect(eintrag.label).not.toBe('');
        expect(eintrag.icon).not.toBe('');
        expect(eintrag.route).toMatch(/^\//);
        expect(eintrag.bereich).not.toBe('');
      }
    }
  });
});
