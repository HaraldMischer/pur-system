// pur-system/src/app/commons/utils/datenmigration/mitarbeiter-id-zuordnung.ts

import { ISystemmigrationDokument } from '../../models/domain/datenmigration';

/**
 * Entfernt alle Zuordnungen zu einer Mitarbeiter-Ziel-ID aus einer Firmenmigration.
 *
 * @param systemmigration - Vollständige Migrationszuordnung eines Legacy-Kunden.
 * @param firmaId - Ziel-ID der Firma, deren Mitarbeiterzuordnungen bereinigt werden.
 * @param mitarbeiterId - Zu entfernende Mitarbeiter-Ziel-ID.
 * @returns Die bereinigte Zuordnungsstruktur oder `null`, wenn keine Zuordnung gefunden wurde.
 */
export function removeMitarbeiterIdZuordnung(
  systemmigration: ISystemmigrationDokument,
  firmaId: string,
  mitarbeiterId: string,
): NonNullable<ISystemmigrationDokument['mitarbeiterIds']> | null {
  const mitarbeiterIds = systemmigration.mitarbeiterIds;
  if (!mitarbeiterIds) return null;

  let aktualisiert = false;
  const bereinigteFirmen = Object.fromEntries(
    Object.entries(mitarbeiterIds).flatMap(([purCompanyId, filialen]) => {
      if (systemmigration.firmenIds?.[purCompanyId] !== firmaId) {
        return [[purCompanyId, filialen]];
      }

      const bereinigteFilialen = Object.fromEntries(
        Object.entries(filialen).flatMap(([purBranchId, ids]) => {
          const bereinigteIds = Object.fromEntries(
            Object.entries(ids).filter(([, zielId]) => {
              const behalten = zielId !== mitarbeiterId;
              aktualisiert ||= !behalten;
              return behalten;
            }),
          );
          return Object.keys(bereinigteIds).length > 0 ? [[purBranchId, bereinigteIds]] : [];
        }),
      );
      return Object.keys(bereinigteFilialen).length > 0 ? [[purCompanyId, bereinigteFilialen]] : [];
    }),
  );

  return aktualisiert ? bereinigteFirmen : null;
}
