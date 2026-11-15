// pur-system/src/app/guards/schichtmodelle-aenderungen.guard.spec.ts

import { schichtmodelleAenderungenGuard } from './schichtmodelle-aenderungen.guard';

describe('schichtmodelleAenderungenGuard', () => {
  it('should use the page decision before leaving the route', async () => {
    const confirmVerlassen = vi.fn().mockResolvedValue(false);

    const result = await schichtmodelleAenderungenGuard(
      { confirmVerlassen },
      {} as never,
      {} as never,
      {} as never,
    );

    expect(result).toBe(false);
    expect(confirmVerlassen).toHaveBeenCalledTimes(1);
  });
});
