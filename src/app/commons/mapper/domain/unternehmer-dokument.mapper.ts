// pur-system/src/app/commons/mapper/domain/unternehmer-dokument.mapper.ts

import { IUnternehmerEintrag } from '../../models/domain/unternehmer';
import { getString } from '../../utils/firestore/firestore-dokumentwerte';

/**
 * Bildet unveränderte Firestore-Daten als fachlichen Unternehmereintrag ab.
 *
 * @param id - Dokument-ID des Unternehmers.
 * @param daten - Unveränderte Firestore-Daten des Unternehmers.
 * @returns Der normalisierte fachliche Unternehmereintrag.
 */
export function mapUnternehmerEintrag(
  id: string,
  daten: Record<string, unknown>,
): IUnternehmerEintrag {
  const nummer = daten['nummer'];

  return {
    id,
    anzeigename: getString(daten['anzeigename'], id),
    nummer: Number.isInteger(nummer) && Number(nummer) > 0 ? Number(nummer) : 0,
  };
}
