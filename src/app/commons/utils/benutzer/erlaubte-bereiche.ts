// pur-system/src/app/commons/utils/benutzer/erlaubte-bereiche.ts

import { TAppBereich } from '../../models/app/app-bereich';
import { TUserRole } from '../../models/domain/benutzer';

export type TWaehlbarerAppBereich = Exclude<TAppBereich, 'dashboard' | 'systemverwaltung'>;

type TWaehlbarerAppBereichEintrag = {
  value: TWaehlbarerAppBereich;
  label: string;
};

const WAEHLBARE_APP_BEREICHE: ReadonlyArray<TWaehlbarerAppBereichEintrag> = [
  { value: 'schichtplan', label: 'Schichtplan' },
  { value: 'mitarbeiter', label: 'Mitarbeiter' },
  { value: 'verwaltung', label: 'Verwaltung' },
];

const WAEHLBARE_APP_BEREICHE_NACH_ROLLE = {
  filiale: ['schichtplan', 'mitarbeiter'],
  office: ['schichtplan', 'mitarbeiter', 'verwaltung'],
  mitarbeiter: ['schichtplan'],
  master: ['schichtplan', 'mitarbeiter', 'verwaltung'],
} as const satisfies Readonly<Record<TUserRole, ReadonlyArray<TWaehlbarerAppBereich>>>;

/**
 * Liefert die optional wählbaren App-Bereiche in ihrer Darstellungsreihenfolge.
 *
 * @param userRole - Rolle, für die die optionalen Bereiche bestimmt werden.
 * @returns Die Beschriftungen und Bereichsschlüssel der optionalen Freigaben.
 */
export function getWaehlbareAppBereiche(
  userRole: TUserRole,
): ReadonlyArray<TWaehlbarerAppBereichEintrag> {
  const erlaubteBereiche: ReadonlyArray<TWaehlbarerAppBereich> =
    WAEHLBARE_APP_BEREICHE_NACH_ROLLE[userRole];
  return WAEHLBARE_APP_BEREICHE.filter((bereich) => erlaubteBereiche.includes(bereich.value));
}

/**
 * Ergänzt die verpflichtenden Bereiche und entfernt unzulässige Systemverwaltungsfreigaben.
 *
 * @param userRole - Die unveränderliche Benutzerrolle.
 * @param bereiche - Die zusätzlich ausgewählten App-Bereiche.
 * @returns Die erlaubten Bereiche in ihrer festgelegten Reihenfolge.
 */
export function buildErlaubteBereiche(
  userRole: TUserRole,
  bereiche: readonly TAppBereich[],
): TAppBereich[] {
  const ausgewaehlteBereiche = new Set(bereiche);
  const erlaubteBereiche: TAppBereich[] = ['dashboard'];

  for (const bereich of getWaehlbareAppBereiche(userRole)) {
    if (ausgewaehlteBereiche.has(bereich.value)) {
      erlaubteBereiche.push(bereich.value);
    }
  }

  if (userRole === 'master') {
    erlaubteBereiche.push('systemverwaltung');
  }

  return erlaubteBereiche;
}
