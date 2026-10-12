// pur-system/src/app/commons/utils/datum/monat.ts

/**
 * Ermittelt den aktuellen Kalendermonat in der verbindlichen Zeitzone.
 *
 * @returns Monat im Format `YYYY-MM`.
 */
export function getAktuellerMonat(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
}
