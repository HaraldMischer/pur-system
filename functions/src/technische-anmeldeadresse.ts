// pur-system/functions/src/technische-anmeldeadresse.ts

export const TECHNISCHE_ANMELDE_DOMAIN = 'pur-system.invalid';

const UMLAUT_ERSETZUNGEN: Readonly<Record<string, string>> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
};

function normalizeZeichen(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[äöüß]/g, (zeichen) => {
      return UMLAUT_ERSETZUNGEN[zeichen] ?? zeichen;
    })
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeTrennzeichen(trennzeichen: string): string {
  return trennzeichen.includes('-') ? '-' : '.';
}

/**
 * Normalisiert einen frei eingegebenen Namen für die Verwendung im Anmeldenamen.
 */
export function normalizeNamensbestandteil(value: string): string {
  return normalizeZeichen(value)
    .replace(/[^a-z0-9.\s-]/g, '')
    .replace(/[.\s-]+/g, normalizeTrennzeichen)
    .replace(/^[.-]+|[.-]+$/g, '');
}

/**
 * Bildet den vollständigen Anmeldenamen aus Namensbestandteil und Benutzerrolle.
 */
export function buildAnmeldename(value: string, userRole: string): string {
  const namensbestandteil = normalizeNamensbestandteil(value);
  return namensbestandteil ? `${namensbestandteil}-${userRole}` : '';
}

/**
 * Normalisiert einen bereits zusammengesetzten Anmeldenamen für die Anmeldung.
 */
export function normalizeAnmeldename(value: string): string {
  return normalizeNamensbestandteil(value);
}

/**
 * Bildet aus einem vollständigen Anmeldenamen die technische Firebase-Adresse.
 */
export function buildTechnischeAnmeldeadresse(anmeldename: string): string {
  const normalisierterAnmeldename = normalizeAnmeldename(anmeldename);
  return normalisierterAnmeldename
    ? `${normalisierterAnmeldename}@${TECHNISCHE_ANMELDE_DOMAIN}`
    : '';
}
