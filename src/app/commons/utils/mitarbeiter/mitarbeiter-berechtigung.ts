// pur-system/src/app/commons/utils/mitarbeiter/mitarbeiter-berechtigung.ts

import { IBenutzerProfilDokument } from '../../models/domain/benutzer';

/**
 * Prüft, ob ein Benutzerprofil den App-Bereich Mitarbeiter öffnen darf.
 *
 * @param profil - Das zu prüfende Benutzerprofil.
 * @returns `true`, wenn der Bereich zugewiesen und für die Rolle erreichbar ist.
 */
export function darfMitarbeiterBereichNutzen(profil: IBenutzerProfilDokument): boolean {
  if (!profil.aktiv || !profil.erlaubteBereiche.includes('mitarbeiter')) {
    return false;
  }

  return hatMitarbeiterVerwaltungszugriff(profil);
}

/**
 * Prüft, ob ein Benutzerprofil die fachliche Mitarbeiterverwaltung verwenden darf.
 *
 * @param profil - Das zu prüfende Benutzerprofil.
 * @returns `true`, wenn Rolle und Datenzugriff die Mitarbeiterverwaltung erlauben.
 */
export function hatMitarbeiterVerwaltungszugriff(profil: IBenutzerProfilDokument): boolean {
  if (!profil.aktiv || !['master', 'office', 'filiale'].includes(profil.userRole)) {
    return false;
  }

  if (profil.userRole === 'master') return true;

  return Object.entries(profil.zugriffe).some(([unternehmerId, firmen]) => {
    return Object.keys(firmen).some((firmaId) => {
      return hatMitarbeiterVerwaltungszugriffAufFirma(profil, unternehmerId, firmaId);
    });
  });
}

/**
 * Prüft den fachlichen Mitarbeiterverwaltungszugriff für eine bestimmte Firma.
 *
 * @param profil - Das zu prüfende Benutzerprofil.
 * @param unternehmerId - Die ID des übergeordneten Unternehmers.
 * @param firmaId - Die ID der zu prüfenden Firma.
 * @returns `true`, wenn die Firma mit mindestens einer erlaubten Filiale erreichbar ist.
 */
export function hatMitarbeiterVerwaltungszugriffAufFirma(
  profil: IBenutzerProfilDokument,
  unternehmerId: string,
  firmaId: string,
): boolean {
  if (profil.aktiv && profil.userRole === 'master') {
    return true;
  }

  const filialIds = profil.zugriffe[unternehmerId]?.[firmaId];
  const hatGueltigenDatenzugriff =
    Array.isArray(filialIds) &&
    (profil.userRole === 'office' ? filialIds.length > 0 : filialIds.length === 1);
  return (
    profil.aktiv &&
    (profil.userRole === 'office' || profil.userRole === 'filiale') &&
    hatGueltigenDatenzugriff
  );
}
