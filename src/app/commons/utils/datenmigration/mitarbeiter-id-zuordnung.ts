// pur-system/src/app/commons/utils/datenmigration/mitarbeiter-id-zuordnung.ts

import { ISystemmigrationDokument } from '../../models/domain/datenmigration';

/**
 * Leitet alle Legacy-Zuordnungen mehrerer Firmenmitarbeiter auf einen Zielmitarbeiter um.
 *
 * @param systemmigration - Vollständige Migrationszuordnung eines Legacy-Kunden.
 * @param firmaId - Ziel-ID der Firma, deren Mitarbeiterzuordnungen angepasst werden.
 * @param quellMitarbeiterIds - Bisherige Mitarbeiter-Ziel-IDs.
 * @param zielMitarbeiterId - Künftig verwendete Mitarbeiter-Ziel-ID.
 * @returns Die angepasste Zuordnungsstruktur oder `null`, wenn keine Zuordnung gefunden wurde.
 */
export function replaceMitarbeiterIdZuordnungen(
  systemmigration: ISystemmigrationDokument,
  firmaId: string,
  quellMitarbeiterIds: readonly string[],
  zielMitarbeiterId: string,
): NonNullable<ISystemmigrationDokument['mitarbeiterIds']> | null {
  const mitarbeiterIds = systemmigration.mitarbeiterIds;
  if (!mitarbeiterIds) return null;
  const quellIds = new Set(quellMitarbeiterIds);
  if (quellIds.size === 0) return null;

  let aktualisiert = false;
  const aktualisierteFirmen = Object.fromEntries(
    Object.entries(mitarbeiterIds).map(([purCompanyId, filialen]) => {
      if (systemmigration.firmenIds?.[purCompanyId] !== firmaId) {
        return [purCompanyId, filialen];
      }

      const aktualisierteFilialen = Object.fromEntries(
        Object.entries(filialen).map(([purBranchId, ids]) => {
          const aktualisierteIds = Object.fromEntries(
            Object.entries(ids).map(([purEmployeeId, mitarbeiterId]) => {
              if (!quellIds.has(mitarbeiterId)) {
                return [purEmployeeId, mitarbeiterId];
              }
              aktualisiert = true;
              return [purEmployeeId, zielMitarbeiterId];
            }),
          );
          return [purBranchId, aktualisierteIds];
        }),
      );
      return [purCompanyId, aktualisierteFilialen];
    }),
  );

  return aktualisiert ? aktualisierteFirmen : null;
}
