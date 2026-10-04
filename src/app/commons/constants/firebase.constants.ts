// pur-system/src/app/commons/constants/firebase.constants.ts

export const FIRESTORE_COLLECTION_PATHS = {
  benutzerprofile: 'benutzerprofil',
  purCustomers: 'purCustomers',
  systemMigrationen: 'systemMigrationen',
  unternehmer: 'unternehmer',
  migrationsDatenbereiche(purCustomerId: string): string {
    return `systemMigrationen/${purCustomerId}/datenbereiche`;
  },
  purCompanies(purCustomerId: string): string {
    return `purCustomers/${purCustomerId}/company`;
  },
  purBranches(purCustomerId: string, purCompanyId: string): string {
    return `purCustomers/${purCustomerId}/company/${purCompanyId}/branches`;
  },
  purEmployees(purCustomerId: string, purCompanyId: string, purBranchId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.purBranches(purCustomerId, purCompanyId)}/${purBranchId}/employee`;
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
} as const;

export const FIRESTORE_DOCUMENT_PATHS = {
  benutzerprofil(uid: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.benutzerprofile}/${uid}`;
  },
  purCustomer(purCustomerId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.purCustomers}/${purCustomerId}`;
  },
  purCompany(purCustomerId: string, purCompanyId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.purCompanies(purCustomerId)}/${purCompanyId}`;
  },
  purBranch(purCustomerId: string, purCompanyId: string, purBranchId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.purBranches(purCustomerId, purCompanyId)}/${purBranchId}`;
  },
  purEmployee(
    purCustomerId: string,
    purCompanyId: string,
    purBranchId: string,
    purEmployeeId: string,
  ): string {
    return `${FIRESTORE_COLLECTION_PATHS.purEmployees(purCustomerId, purCompanyId, purBranchId)}/${purEmployeeId}`;
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
  filiale(unternehmerId: string, firmaId: string, filialeId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.filialen(unternehmerId, firmaId)}/${filialeId}`;
  },
  mitarbeiter(unternehmerId: string, firmaId: string, mitarbeiterId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firmaId)}/${mitarbeiterId}`;
  },
} as const;
