// pur-system/src/app/commons/constants/firebase.constants.spec.ts

import { describe, expect, it } from 'vitest';

import { FIRESTORE_COLLECTION_PATHS, FIRESTORE_DOCUMENT_PATHS } from './firebase.constants';

describe('Firebase-Konstanten', () => {
  it('bildet die Legacy- und Systemmigrationspfade', () => {
    expect(FIRESTORE_COLLECTION_PATHS.purCustomers).toBe('purCustomers');
    expect(FIRESTORE_DOCUMENT_PATHS.purCustomer('kunde-1')).toBe('purCustomers/kunde-1');
    expect(FIRESTORE_COLLECTION_PATHS.purCompanies('kunde-1')).toBe('purCustomers/kunde-1/company');
    expect(FIRESTORE_DOCUMENT_PATHS.purCompany('kunde-1', 'firma-alt')).toBe(
      'purCustomers/kunde-1/company/firma-alt',
    );
    expect(FIRESTORE_COLLECTION_PATHS.systemMigrationen).toBe('systemMigrationen');
    expect(FIRESTORE_DOCUMENT_PATHS.systemmigration('kunde-1')).toBe('systemMigrationen/kunde-1');
    expect(FIRESTORE_COLLECTION_PATHS.migrationsDatenbereiche('kunde-1')).toBe(
      'systemMigrationen/kunde-1/datenbereiche',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.migrationsDatenbereich('kunde-1', 'unternehmer_v1')).toBe(
      'systemMigrationen/kunde-1/datenbereiche/unternehmer_v1',
    );
  });
});
