// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-rollen.ts

import { TMitarbeiterRolle } from '../../models/domain/mitarbeiter';

/**
 * Ergänzt die für eine Filialkasse verpflichtende Servicekraftrolle.
 */
export function ergaenzeServicekraftFuerFilialkasse(
  rollen: TMitarbeiterRolle[],
): TMitarbeiterRolle[] {
  if (!rollen.includes('filialkasse') || rollen.includes('servicekraft')) return rollen;
  const filialkasseIndex = rollen.indexOf('filialkasse');
  return [
    ...rollen.slice(0, filialkasseIndex + 1),
    'servicekraft',
    ...rollen.slice(filialkasseIndex + 1),
  ];
}
