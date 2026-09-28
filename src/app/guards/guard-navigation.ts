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

/**
 * Liefert eine sichere interne Rückkehr-URL nach erfolgreicher Sitzungsinitialisierung.
 *
 * @param returnUrl - Die ursprünglich angeforderte URL aus den Query-Parametern.
 * @returns Eine interne Fachroute oder das Dashboard als sichere Ausweichroute.
 */
export function getInitialisierungsRueckkehrUrl(returnUrl: string | null): string {
  if (
    !returnUrl ||
    !returnUrl.startsWith('/') ||
    returnUrl.startsWith('//') ||
    returnUrl.startsWith('/login') ||
    returnUrl.startsWith('/initialisierungsfehler')
  ) {
    return '/dashboard';
  }

  return returnUrl;
}
