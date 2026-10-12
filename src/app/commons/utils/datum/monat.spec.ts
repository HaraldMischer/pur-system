// pur-system/src/app/commons/utils/datum/monat.spec.ts

import { getAktuellerMonat } from './monat';

describe('Monat', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the current month at the Berlin month boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-31T22:30:00Z'));

    expect(getAktuellerMonat()).toBe('2026-04');
  });
});
