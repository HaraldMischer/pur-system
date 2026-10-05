// pur-system/src/app/commons/mapper/domain/unternehmer-dokument.mapper.spec.ts

import { mapUnternehmerEintrag } from './unternehmer-dokument.mapper';

describe('Unternehmer-Dokument-Mapper', () => {
  it('should normalize an entrepreneur document', () => {
    expect(mapUnternehmerEintrag('u-1', { anzeigename: ' Unternehmer ', nummer: 2 })).toEqual({
      id: 'u-1',
      anzeigename: 'Unternehmer',
      nummer: 2,
    });
  });

  it('should use safe fallback values for invalid data', () => {
    expect(mapUnternehmerEintrag('u-1', { anzeigename: '', nummer: -1 })).toEqual({
      id: 'u-1',
      anzeigename: 'u-1',
      nummer: 0,
    });
  });
});
