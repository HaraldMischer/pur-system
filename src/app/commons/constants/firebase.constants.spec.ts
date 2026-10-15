// pur-system/src/app/commons/constants/firebase.constants.spec.ts

import { describe, expect, it } from 'vitest';

import type {
  IDienstplanModellschichtPfad,
  IFilialeinstellungAusnahmePfad,
  IFilialeinstellungSondertagPfad,
  IModellschichtPfad,
  ISchichtPfad,
} from '../models/app/firestore-pfad.types';
import type { IPurEmployeePfad } from '../models/legacy/pur-firestore-pfad.types';
import { FIRESTORE_COLLECTION_PATHS, FIRESTORE_DOCUMENT_PATHS } from './firebase.constants';

describe('Firebase-Konstanten', () => {
  it('bildet die Legacy- und Systemmigrationspfade', () => {
    const purPfad: IPurEmployeePfad = {
      purCustomerId: 'kunde-1',
      purCompanyId: 'firma-alt',
      purBranchId: 'filiale-alt',
      purEmployeeId: 'mitarbeiter-alt',
    };

    expect(FIRESTORE_COLLECTION_PATHS.purCustomers).toBe('purCustomers');
    expect(FIRESTORE_DOCUMENT_PATHS.purCustomer(purPfad)).toBe('purCustomers/kunde-1');
    expect(FIRESTORE_COLLECTION_PATHS.purCompanies(purPfad)).toBe('purCustomers/kunde-1/company');
    expect(FIRESTORE_DOCUMENT_PATHS.purCompany(purPfad)).toBe(
      'purCustomers/kunde-1/company/firma-alt',
    );
    expect(FIRESTORE_COLLECTION_PATHS.purBranches(purPfad)).toBe(
      'purCustomers/kunde-1/company/firma-alt/branches',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.purBranch(purPfad)).toBe(
      'purCustomers/kunde-1/company/firma-alt/branches/filiale-alt',
    );
    expect(FIRESTORE_COLLECTION_PATHS.purEmployees(purPfad)).toBe(
      'purCustomers/kunde-1/company/firma-alt/branches/filiale-alt/employee',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.purEmployee(purPfad)).toBe(
      'purCustomers/kunde-1/company/firma-alt/branches/filiale-alt/employee/mitarbeiter-alt',
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

  it('bildet die Dienstplanpfade innerhalb einer Filiale', () => {
    const pfad: ISchichtPfad = {
      unternehmerId: 'unternehmer-1',
      firmaId: 'firma-1',
      filialeId: 'filiale-1',
      dienstplanId: '2026-10',
      versionId: 'version-1',
      schichtId: 'schicht-1',
    };

    expect(FIRESTORE_COLLECTION_PATHS.dienstplaene(pfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/dienstplan',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.dienstplan(pfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/dienstplan/2026-10',
    );
    expect(FIRESTORE_COLLECTION_PATHS.dienstplanVersionen(pfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/dienstplan/2026-10/version',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/dienstplan/2026-10/version/version-1',
    );
    expect(FIRESTORE_COLLECTION_PATHS.schichten(pfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/dienstplan/2026-10/version/version-1/schicht',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.schicht(pfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/dienstplan/2026-10/version/version-1/schicht/schicht-1',
    );
  });

  it('bildet die Schichtmodellpfade und die Dienstplan-Momentaufnahme', () => {
    const modellschichtPfad: IModellschichtPfad = {
      unternehmerId: 'unternehmer-1',
      firmaId: 'firma-1',
      filialeId: 'filiale-1',
      schichtmodellId: 'sommer',
      modellschichtId: 'frueh',
    };
    const momentaufnahmePfad: IDienstplanModellschichtPfad = {
      unternehmerId: 'unternehmer-1',
      firmaId: 'firma-1',
      filialeId: 'filiale-1',
      dienstplanId: '2026-10',
      modellschichtId: 'frueh',
    };

    expect(FIRESTORE_COLLECTION_PATHS.schichtmodelle(modellschichtPfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/schichtmodell',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.schichtmodell(modellschichtPfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/schichtmodell/sommer',
    );
    expect(FIRESTORE_COLLECTION_PATHS.modellschichten(modellschichtPfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/schichtmodell/sommer/modellschicht',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.modellschicht(modellschichtPfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/schichtmodell/sommer/modellschicht/frueh',
    );
    expect(FIRESTORE_COLLECTION_PATHS.dienstplanModellschichten(momentaufnahmePfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/dienstplan/2026-10/modellschicht',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.dienstplanModellschicht(momentaufnahmePfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/dienstplan/2026-10/modellschicht/frueh',
    );
  });

  it('bildet die Pfade der Filialeinstellungen', () => {
    const sondertagPfad: IFilialeinstellungSondertagPfad = {
      unternehmerId: 'unternehmer-1',
      firmaId: 'firma-1',
      filialeId: 'filiale-1',
      sondertagId: 'heiligabend',
    };
    const ausnahmePfad: IFilialeinstellungAusnahmePfad = {
      unternehmerId: 'unternehmer-1',
      firmaId: 'firma-1',
      filialeId: 'filiale-1',
      datum: '2026-12-24',
    };

    expect(FIRESTORE_COLLECTION_PATHS.filialeinstellungen(sondertagPfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/einstellung',
    );
    expect(
      FIRESTORE_DOCUMENT_PATHS.filialeinstellung({
        ...sondertagPfad,
        einstellungId: 'allgemein',
      }),
    ).toBe('unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/einstellung/allgemein');
    expect(FIRESTORE_COLLECTION_PATHS.filialeinstellungSondertage(sondertagPfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/einstellung/oeffnungszeiten/sondertag',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.filialeinstellungSondertag(sondertagPfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/einstellung/oeffnungszeiten/sondertag/heiligabend',
    );
    expect(FIRESTORE_COLLECTION_PATHS.filialeinstellungAusnahmen(ausnahmePfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/einstellung/oeffnungszeiten/ausnahme',
    );
    expect(FIRESTORE_DOCUMENT_PATHS.filialeinstellungAusnahme(ausnahmePfad)).toBe(
      'unternehmer/unternehmer-1/firma/firma-1/filiale/filiale-1/einstellung/oeffnungszeiten/ausnahme/2026-12-24',
    );
  });
});
