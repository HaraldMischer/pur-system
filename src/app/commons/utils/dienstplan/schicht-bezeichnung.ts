// pur-system/src/app/commons/utils/dienstplan/schicht-bezeichnung.ts

/**
 * Ermittelt die nächste freie fortlaufende Standardbezeichnung einer Schichtliste.
 *
 * @param bezeichnungen - Bereits verwendete Schichtbezeichnungen.
 * @returns Nächste Standardbezeichnung im Format `Schicht n`.
 */
export function getNaechsteSchichtbezeichnung(bezeichnungen: readonly string[]): string {
  let hoechsteNummer = 0;
  bezeichnungen.forEach((bezeichnung) => {
    const treffer = /^Schicht (\d+)$/.exec(bezeichnung.trim());
    if (treffer) hoechsteNummer = Math.max(hoechsteNummer, Number(treffer[1]));
  });
  return `Schicht ${hoechsteNummer + 1}`;
}
