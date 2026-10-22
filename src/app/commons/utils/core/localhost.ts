// pur-system/src/app/commons/utils/core/localhost.ts

/**
 * Prüft, ob ein Hostname auf die lokale Entwicklungsumgebung verweist.
 */
export function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
