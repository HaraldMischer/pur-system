// pur-system/src/app/commons/utils/datenmigration/mitarbeiter-id-zuordnung.spec.ts

import { ISystemmigrationDokument } from '../../models/domain/datenmigration';
import { removeMitarbeiterIdZuordnung } from './mitarbeiter-id-zuordnung';

describe('Mitarbeiter-ID-Zuordnung', () => {
  const systemmigration = {
    firmenIds: {
      'firma-alt': 'f-1',
      'andere-firma-alt': 'f-2',
    },
    mitarbeiterIds: {
      'firma-alt': {
        'filiale-alt': {
          'mitarbeiter-alt': 'm-1',
          'mitarbeiter-bleibt': 'm-2',
        },
      },
      'andere-firma-alt': {
        'andere-filiale-alt': {
          'anderer-mitarbeiter-alt': 'm-1',
        },
      },
    },
  } as unknown as ISystemmigrationDokument;

  it('should remove only matching target ids from the selected company', () => {
    expect(removeMitarbeiterIdZuordnung(systemmigration, 'f-1', 'm-1')).toEqual({
      'firma-alt': {
        'filiale-alt': {
          'mitarbeiter-bleibt': 'm-2',
        },
      },
      'andere-firma-alt': systemmigration.mitarbeiterIds?.['andere-firma-alt'],
    });
  });

  it('should return null without a matching assignment', () => {
    expect(removeMitarbeiterIdZuordnung(systemmigration, 'f-1', 'nicht-vorhanden')).toBeNull();
    expect(
      removeMitarbeiterIdZuordnung({ ...systemmigration, mitarbeiterIds: undefined }, 'f-1', 'm-1'),
    ).toBeNull();
  });

  it('should remove empty branch and company maps', () => {
    expect(
      removeMitarbeiterIdZuordnung(
        {
          ...systemmigration,
          mitarbeiterIds: {
            'firma-alt': {
              'filiale-alt': { 'mitarbeiter-alt': 'm-1' },
            },
          },
        },
        'f-1',
        'm-1',
      ),
    ).toEqual({});
  });
});
