// pur-system/src/app/commons/constants/firebase.constants.ts

import type {
  IDienstplanPfad,
  IDienstplanVersionPfad,
  IFilialPfad,
  ISchichtPfad,
  ISchichtvorlagePfad,
} from '../models/app/firestore-pfad.types';
import type {
  IPurBranchPfad,
  IPurCompanyPfad,
  IPurCustomerPfad,
  IPurEmployeePfad,
} from '../models/legacy/pur-firestore-pfad.types';

export const FIRESTORE_COLLECTION_PATHS = {
  // ===== Legacy-Pfade =======================
  purCustomers: 'purCustomers',
  purCompanies(pfad: IPurCustomerPfad): string {
    return `${FIRESTORE_DOCUMENT_PATHS.purCustomer(pfad)}/company`;
  },
  purBranches(pfad: IPurCompanyPfad): string {
    return `${FIRESTORE_DOCUMENT_PATHS.purCompany(pfad)}/branches`;
  },
  purEmployees(pfad: IPurBranchPfad): string {
    return `${FIRESTORE_DOCUMENT_PATHS.purBranch(pfad)}/employee`;
  },

  // ===== Pur-System-Pfade ===================
  benutzerprofile: 'benutzerprofil',
  systemMigrationen: 'systemMigrationen',
  unternehmer: 'unternehmer',
  migrationsDatenbereiche(purCustomerId: string): string {
    return `systemMigrationen/${purCustomerId}/datenbereiche`;
  },
  firmen(unternehmerId: string): string {
    return `unternehmer/${unternehmerId}/firma`;
  },
  filialen(unternehmerId: string, firmaId: string): string {
    return `unternehmer/${unternehmerId}/firma/${firmaId}/filiale`;
  },
  mitarbeiter(unternehmerId: string, firmaId: string): string {
    return `unternehmer/${unternehmerId}/firma/${firmaId}/mitarbeiter`;
  },
  schichtvorlagen(pfad: IFilialPfad): string {
    return `${FIRESTORE_DOCUMENT_PATHS.filiale(pfad)}/schichtvorlage`;
  },
  dienstplaene(pfad: IFilialPfad): string {
    return `${FIRESTORE_DOCUMENT_PATHS.filiale(pfad)}/dienstplan`;
  },
  dienstplanVersionen(pfad: IDienstplanPfad): string {
    return `${FIRESTORE_DOCUMENT_PATHS.dienstplan(pfad)}/version`;
  },
  schichten(pfad: IDienstplanVersionPfad): string {
    return `${FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad)}/schicht`;
  },
} as const;

export const FIRESTORE_DOCUMENT_PATHS = {
  // ===== Legacy-Pfade =======================
  purCustomer(pfad: IPurCustomerPfad): string {
    return `${FIRESTORE_COLLECTION_PATHS.purCustomers}/${pfad.purCustomerId}`;
  },
  purCompany(pfad: IPurCompanyPfad): string {
    return `${FIRESTORE_COLLECTION_PATHS.purCompanies(pfad)}/${pfad.purCompanyId}`;
  },
  purBranch(pfad: IPurBranchPfad): string {
    return `${FIRESTORE_COLLECTION_PATHS.purBranches(pfad)}/${pfad.purBranchId}`;
  },
  purEmployee(pfad: IPurEmployeePfad): string {
    return `${FIRESTORE_COLLECTION_PATHS.purEmployees(pfad)}/${pfad.purEmployeeId}`;
  },

  // ===== Pur-System-Pfade ===================
  benutzerprofil(uid: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.benutzerprofile}/${uid}`;
  },
  systemmigration(purCustomerId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.systemMigrationen}/${purCustomerId}`;
  },
  migrationsDatenbereich(purCustomerId: string, datenbereichId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.migrationsDatenbereiche(purCustomerId)}/${datenbereichId}`;
  },
  unternehmer(unternehmerId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.unternehmer}/${unternehmerId}`;
  },
  firma(unternehmerId: string, firmaId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.firmen(unternehmerId)}/${firmaId}`;
  },
  filiale(pfad: IFilialPfad): string {
    return `${FIRESTORE_COLLECTION_PATHS.filialen(pfad.unternehmerId, pfad.firmaId)}/${pfad.filialeId}`;
  },
  mitarbeiter(unternehmerId: string, firmaId: string, mitarbeiterId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firmaId)}/${mitarbeiterId}`;
  },
  schichtvorlage(pfad: ISchichtvorlagePfad): string {
    return `${FIRESTORE_COLLECTION_PATHS.schichtvorlagen(pfad)}/${pfad.schichtvorlageId}`;
  },
  dienstplan(pfad: IDienstplanPfad): string {
    return `${FIRESTORE_COLLECTION_PATHS.dienstplaene(pfad)}/${pfad.dienstplanId}`;
  },
  dienstplanVersion(pfad: IDienstplanVersionPfad): string {
    return `${FIRESTORE_COLLECTION_PATHS.dienstplanVersionen(pfad)}/${pfad.versionId}`;
  },
  schicht(pfad: ISchichtPfad): string {
    return `${FIRESTORE_COLLECTION_PATHS.schichten(pfad)}/${pfad.schichtId}`;
  },
} as const;
