// pur-system/src/app/commons/utils/dienstplan/dienstplan-zeitraum.spec.ts

import { createDienstplanZeitraum } from './dienstplan-zeitraum';

describe('createDienstplanZeitraum', () => {
  it.each([
    ['2026-01', '2026-01-31'],
    ['2026-04', '2026-04-30'],
    ['2025-02', '2025-02-28'],
    ['2024-02', '2024-02-29'],
    ['2100-02', '2100-02-28'],
    ['2000-02', '2000-02-29'],
  ])('should create the complete calendar month for %s', (monat, zeitraumEnde) => {
    expect(createDienstplanZeitraum(monat)).toEqual({
      zeitraumStart: `${monat}-01`,
      zeitraumEnde,
      zeitzone: 'Europe/Berlin',
    });
  });

  it.each(['2026-1', '2026-13', '26-01', '2026-01-01', ''])(
    'should reject the invalid month %s',
    (monat) => {
      expect(() => createDienstplanZeitraum(monat)).toThrow(
        'Der Dienstplanmonat muss dem Format YYYY-MM entsprechen.',
      );
    },
  );
});
