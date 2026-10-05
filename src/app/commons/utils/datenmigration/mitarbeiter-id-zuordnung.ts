// pur-system/src/app/commons/utils/datenmigration/mitarbeiter-id-zuordnung.ts

import { ISystemmigrationDokument } from '../../models/domain/datenmigration';

/**
 * Entfernt alle Legacy-Zuordnungen eines Firmenmitarbeiters.
 *
 * @param systemmigration - Vollständige Migrationszuordnung eines Legacy-Kunden.
 * @param firmaId - Ziel-ID der Firma, deren Mitarbeiterzuordnungen angepasst werden.
 * @param mitarbeiterId - Zu entfernende Mitarbeiter-Ziel-ID.
 * @returns Die angepasste Zuordnungsstruktur oder `null`, wenn keine Zuordnung gefunden wurde.
 */
export function deleteMitarbeiterIdZuordnung(
  systemmigration: ISystemmigrationDokument,
  firmaId: string,
  mitarbeiterId: string,
): NonNullable<ISystemmigrationDokument['mitarbeiterIds']> | null {
  const mitarbeiterIds = systemmigration.mitarbeiterIds;
  if (!mitarbeiterIds) return null;

  let aktualisiert = false;
  const aktualisierteFirmen = Object.fromEntries(
    Object.entries(mitarbeiterIds).map(([purCompanyId, filialen]) => {
      if (systemmigration.firmenIds?.[purCompanyId] !== firmaId) {
        return [purCompanyId, filialen];
      }

      const aktualisierteFilialen = Object.fromEntries(
        Object.entries(filialen).map(([purBranchId, ids]) => {
          const aktualisierteIds = Object.fromEntries(
            Object.entries(ids).filter(([, zielId]) => {
              const behalten = zielId !== mitarbeiterId;
              if (!behalten) aktualisiert = true;
              return behalten;
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

/**
 * Leitet alle Legacy-Zuordnungen eines Firmenmitarbeiters auf einen anderen Mitarbeiter um.
 *
 * @param systemmigration - Vollständige Migrationszuordnung eines Legacy-Kunden.
 * @param firmaId - Ziel-ID der Firma, deren Mitarbeiterzuordnungen angepasst werden.
 * @param quellMitarbeiterId - Bisherige Mitarbeiter-Ziel-ID.
 * @param zielMitarbeiterId - Künftig verwendete Mitarbeiter-Ziel-ID.
 * @returns Die angepasste Zuordnungsstruktur oder `null`, wenn keine Zuordnung gefunden wurde.
 */
export function replaceMitarbeiterIdZuordnung(
  systemmigration: ISystemmigrationDokument,
  firmaId: string,
  quellMitarbeiterId: string,
  zielMitarbeiterId: string,
): NonNullable<ISystemmigrationDokument['mitarbeiterIds']> | null {
  const mitarbeiterIds = systemmigration.mitarbeiterIds;
  if (!mitarbeiterIds) return null;

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
              if (mitarbeiterId !== quellMitarbeiterId) {
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
