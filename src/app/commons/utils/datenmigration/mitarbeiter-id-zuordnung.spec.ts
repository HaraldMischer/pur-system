// pur-system/src/app/commons/utils/datenmigration/mitarbeiter-id-zuordnung.spec.ts

import { ISystemmigrationDokument } from '../../models/domain/datenmigration';
import { replaceMitarbeiterIdZuordnungen } from './mitarbeiter-id-zuordnung';

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

  it('should replace only matching target ids in the selected company', () => {
    expect(replaceMitarbeiterIdZuordnungen(systemmigration, 'f-1', ['m-1'], 'm-ziel')).toEqual({
      'firma-alt': {
        'filiale-alt': {
          'mitarbeiter-alt': 'm-ziel',
          'mitarbeiter-bleibt': 'm-2',
        },
      },
      'andere-firma-alt': systemmigration.mitarbeiterIds?.['andere-firma-alt'],
    });
  });

  it('should return null without a matching assignment', () => {
    expect(
      replaceMitarbeiterIdZuordnungen(systemmigration, 'f-1', ['nicht-vorhanden'], 'm-ziel'),
    ).toBeNull();
    expect(
      replaceMitarbeiterIdZuordnungen(
        { ...systemmigration, mitarbeiterIds: undefined },
        'f-1',
        ['m-1'],
        'm-ziel',
      ),
    ).toBeNull();
  });
});
