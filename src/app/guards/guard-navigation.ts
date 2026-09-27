// pur-system/src/app/guards/guard-navigation.ts

import { IBenutzerProfilDokument } from '../commons/models/domain/benutzer';
import {
  getNavigationLinks,
  getSichtbareRollenNavigation,
} from '../commons/utils/navigation/rollen-navigation';

/**
 * Ermittelt eine tatsächlich erreichbare Ausweichroute für das Benutzerprofil.
 *
 * @param profil - Das aktive Benutzerprofil mit Rolle und Bereichsfreigaben.
 * @returns Die bevorzugte erlaubte Route oder `null`, wenn keine erreichbar ist.
 */
export function getErlaubteStartRoute(profil: IBenutzerProfilDokument): string | null {
  const navigation = getSichtbareRollenNavigation(profil);
  const links = getNavigationLinks(navigation.eintraege);
  const startLink = links.find((link) => link.bereich === 'dashboard') ?? links[0];

  return startLink?.route ?? null;
}
