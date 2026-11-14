// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-rollen.spec.ts

import { ergaenzeServicekraftFuerFilialkasse } from './mitarbeiter-rollen';

describe('mitarbeiter-rollen', () => {
  it('should add the service role to the branch checkout role', () => {
    expect(ergaenzeServicekraftFuerFilialkasse(['filialkasse'])).toEqual([
      'filialkasse',
      'servicekraft',
    ]);
    expect(
      ergaenzeServicekraftFuerFilialkasse(['administrator', 'filialkasse', 'techniker']),
    ).toEqual(['administrator', 'filialkasse', 'servicekraft', 'techniker']);
  });

  it('should preserve independently selected roles', () => {
    expect(ergaenzeServicekraftFuerFilialkasse(['servicekraft'])).toEqual(['servicekraft']);
    expect(ergaenzeServicekraftFuerFilialkasse(['filialkasse', 'servicekraft'])).toEqual([
      'filialkasse',
      'servicekraft',
    ]);
  });
});
