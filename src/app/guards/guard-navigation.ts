// pur-system/src/app/guards/guard-navigation.ts

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
