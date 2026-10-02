// pur-system/src/app/commons/constants/firebase.constants.ts

export const FIRESTORE_COLLECTION_PATHS = {
  benutzerprofile: 'benutzerprofil',
  purCustomers: 'purCustomers',
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
} as const;

export const FIRESTORE_DOCUMENT_PATHS = {
  benutzerprofil(uid: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.benutzerprofile}/${uid}`;
  },
  purCustomer(purCustomerId: string): string {
    return `${FIRESTORE_COLLECTION_PATHS.purCustomers}/${purCustomerId}`;
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
