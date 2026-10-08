// pur-system/src/app/services/domain/datenmigration.service.ts

import { Injectable, inject } from '@angular/core';

import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import { mapPurBranchToFiliale } from '../../commons/mapper/datenmigration/pur-branch-filiale.mapper';
import { mapPurCompanyToFirma } from '../../commons/mapper/datenmigration/pur-company-firma.mapper';
import { mapPurCustomerToUnternehmer } from '../../commons/mapper/datenmigration/pur-customer-unternehmer.mapper';
import { mapPurEmployeeToMitarbeiter } from '../../commons/mapper/datenmigration/pur-employee-mitarbeiter.mapper';
import {
  DATENMIGRATIONS_BEREICHE,
  IDatenbereichMigrationDokument,
  IDatenmigrationsproblem,
  ISystemmigrationDokument,
  TDatenmigrationsbereich,
  TDatenmigrationsstatus,
  TDatenmigrationsstatusMap,
} from '../../commons/models/domain/datenmigration';
import { IPurBranchEintrag } from '../../commons/models/legacy/pur-branch';
import { IPurCompanyEintrag } from '../../commons/models/legacy/pur-company';
import {
  IPurCustomerDokument,
  IPurCustomerEintrag,
} from '../../commons/models/legacy/pur-customer';
import { IPurEmployeeEintrag } from '../../commons/models/legacy/pur-employee';
import { mapMitarbeiterEintrag } from '../../commons/utils/mitarbeiter/mitarbeiter-dokument';
import { FirestoreDbService } from '../firebase/firestore-db.service';

// ===== Top-Level Helper =====================

const BEKANNTE_DATENBEREICHE = Object.entries(DATENMIGRATIONS_BEREICHE) as [
  TDatenmigrationsbereich,
  string,
][];

@Injectable({ providedIn: 'root' })
export class DatenmigrationService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Legacy-Kunden und bereitet sie für die Auswahl auf.
   *
   * @returns Die nach Anzeigename sortierten Legacy-Kunden mit unveränderten Quelldaten.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadPurCustomers(): Promise<IPurCustomerEintrag[]> {
    const dokumente = await this.firestoreDbService.loadCollection<IPurCustomerDokument>(
      FIRESTORE_COLLECTION_PATHS.purCustomers,
      'networkOnly',
    );

    return dokumente
      .map((dokument) => {
        const displayName = dokument.daten.displayName;
        const anzeigename = typeof displayName === 'string' ? displayName.trim() : '';
        return {
          id: dokument.id,
          anzeigename: anzeigename || dokument.id,
          daten: dokument.daten,
        };
      })
      .sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
  }

  /**
   * Lädt die vorhandenen Statusdokumente eines Legacy-Kunden.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden.
   * @returns Statuswerte der bekannten Datenbereiche; fehlende Einträge gelten als nicht begonnen.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadMigrationsstatus(purCustomerId: string): Promise<TDatenmigrationsstatusMap> {
    const dokumente = await this.firestoreDbService.loadCollection<IDatenbereichMigrationDokument>(
      FIRESTORE_COLLECTION_PATHS.migrationsDatenbereiche(purCustomerId),
      'networkOnly',
    );
    const status: TDatenmigrationsstatusMap = {};

    for (const dokument of dokumente) {
      const eintrag = BEKANNTE_DATENBEREICHE.find(([, id]) => id === dokument.id);
      if (eintrag) status[eintrag[0]] = dokument.daten;
    }

    return status;
  }

  /**
   * Lädt alle Legacy-Firmen genau eines ausgewählten Legacy-Kunden.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden.
   * @returns Legacy-Firmen mit Dokument-ID und unveränderten Quelldaten.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadPurCompanies(purCustomerId: string): Promise<IPurCompanyEintrag[]> {
    const dokumente = await this.firestoreDbService.loadCollection<IPurCompanyEintrag['daten']>(
      FIRESTORE_COLLECTION_PATHS.purCompanies({ purCustomerId }),
      'networkOnly',
    );

    return dokumente.map((dokument) => {
      return { id: dokument.id, daten: dokument.daten };
    });
  }

  /**
   * Lädt alle Legacy-Filialen aller Firmen eines ausgewählten Legacy-Kunden.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden.
   * @returns Legacy-Filialen mit Dokument-ID, übergeordneter Firmen-ID und Quelldaten.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadPurBranches(purCustomerId: string): Promise<IPurBranchEintrag[]> {
    const purCompanies = await this.loadPurCompanies(purCustomerId);
    const filialenJeFirma = await Promise.all(
      purCompanies.map(async (purCompany) => {
        const dokumente = await this.firestoreDbService.loadCollection<IPurBranchEintrag['daten']>(
          FIRESTORE_COLLECTION_PATHS.purBranches({
            purCustomerId,
            purCompanyId: purCompany.id,
          }),
          'networkOnly',
        );
        return dokumente.map((dokument) => {
          return {
            id: dokument.id,
            purCompanyId: purCompany.id,
            daten: dokument.daten,
          };
        });
      }),
    );

    return filialenJeFirma.flat();
  }

  /**
   * Lädt alle Legacy-Mitarbeiter aus allen Filialen eines ausgewählten Legacy-Kunden.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden.
   * @returns Legacy-Mitarbeiter mit Dokument-, Firmen- und Filial-ID sowie Quelldaten.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadPurEmployees(purCustomerId: string): Promise<IPurEmployeeEintrag[]> {
    const purBranches = await this.loadPurBranches(purCustomerId);
    const mitarbeiterJeFiliale = await Promise.all(
      purBranches.map(async (purBranch) => {
        const dokumente = await this.firestoreDbService.loadCollection<
          IPurEmployeeEintrag['daten']
        >(
          FIRESTORE_COLLECTION_PATHS.purEmployees({
            purCustomerId,
            purCompanyId: purBranch.purCompanyId,
            purBranchId: purBranch.id,
          }),
          'networkOnly',
        );
        return dokumente.map((dokument) => {
          return {
            id: dokument.id,
            purCompanyId: purBranch.purCompanyId,
            purBranchId: purBranch.id,
            daten: dokument.daten,
          };
        });
      }),
    );

    return mitarbeiterJeFiliale.flat();
  }

  /**
   * Ermittelt, ob der Ziel-Unternehmer des ausgewählten Legacy-Kunden vorhanden ist.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden und Ziel-Unternehmers.
   * @returns `1`, wenn der Ziel-Unternehmer vorhanden ist, sonst `0`.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadUnternehmerZielDokumente(purCustomerId: string): Promise<number> {
    const unternehmerId = await this.getZielUnternehmerId(purCustomerId);
    if (!unternehmerId) return 0;

    const dokument = await this.firestoreDbService.loadDocument<Record<string, unknown>>(
      FIRESTORE_DOCUMENT_PATHS.unternehmer(unternehmerId),
      'networkOnly',
    );
    return dokument ? 1 : 0;
  }

  /**
   * Ermittelt die aktuelle Anzahl der Firmen im Ziel-Unternehmer.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden und Ziel-Unternehmers.
   * @returns Anzahl aller Firmen in der Ziel-Collection.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFirmenZielDokumente(purCustomerId: string): Promise<number> {
    const unternehmerId = await this.getZielUnternehmerId(purCustomerId);
    if (!unternehmerId) return 0;

    const dokumente = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.firmen(unternehmerId),
      'networkOnly',
    );
    return dokumente.length;
  }

  /**
   * Ermittelt die aktuelle Anzahl aller Filialen unter den Firmen des Ziel-Unternehmers.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden und Ziel-Unternehmers.
   * @returns Anzahl aller Filialen in den Ziel-Collections.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFilialenZielDokumente(purCustomerId: string): Promise<number> {
    const unternehmerId = await this.getZielUnternehmerId(purCustomerId);
    if (!unternehmerId) return 0;

    const firmen = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.firmen(unternehmerId),
      'networkOnly',
    );
    const filialenJeFirma = await Promise.all(
      firmen.map((firma) => {
        return this.firestoreDbService.loadCollection<Record<string, unknown>>(
          FIRESTORE_COLLECTION_PATHS.filialen(unternehmerId, firma.id),
          'networkOnly',
        );
      }),
    );
    return filialenJeFirma.reduce((anzahl, filialen) => anzahl + filialen.length, 0);
  }

  /**
   * Ermittelt die aktuelle Anzahl aller Mitarbeiter unter den Firmen des Ziel-Unternehmers.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden.
   * @returns Anzahl aller Mitarbeiter in den Ziel-Collections.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadMitarbeiterZielDokumente(purCustomerId: string): Promise<number> {
    const unternehmerId = await this.getZielUnternehmerId(purCustomerId);
    if (!unternehmerId) return 0;

    const firmen = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.firmen(unternehmerId),
      'networkOnly',
    );
    const mitarbeiterJeFirma = await Promise.all(
      firmen.map((firma) => {
        return this.firestoreDbService.loadCollection<Record<string, unknown>>(
          FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firma.id),
          'networkOnly',
        );
      }),
    );
    return mitarbeiterJeFirma.reduce((anzahl, mitarbeiter) => anzahl + mitarbeiter.length, 0);
  }

  /**
   * Migriert genau einen ausgewählten Legacy-Kunden zum Unternehmer.
   *
   * @param purCustomer - Ausgewählter Legacy-Kunde einschließlich unveränderter Quelldaten.
   * @returns Ein Promise, das nach dem Speichern des abschließenden Status erfüllt wird.
   * @throws Gibt technische Fehler nach dem bestmöglichen Speichern eines Fehlerstatus weiter.
   */
  async migrateUnternehmer(purCustomer: IPurCustomerEintrag): Promise<void> {
    const quellPfad = FIRESTORE_DOCUMENT_PATHS.purCustomer({
      purCustomerId: purCustomer.id,
    });
    const unternehmerId = await this.ensureSystemmigration(purCustomer.id);
    const zielPfad = FIRESTORE_DOCUMENT_PATHS.unternehmer(unternehmerId);
    await this.saveUnternehmerStatus(purCustomer.id, 'inProgress', {
      migrierteDokumente: 0,
      fehler: 0,
      probleme: [],
      gestartet: true,
    });

    try {
      const vorhandenerUnternehmer = await this.firestoreDbService.loadDocument<
        Record<string, unknown>
      >(zielPfad, 'networkOnly');
      const nummer = await this.getUnternehmerNummer(vorhandenerUnternehmer?.daten);
      const mapping = mapPurCustomerToUnternehmer(purCustomer, nummer);
      if (!mapping.daten) {
        await this.saveUnternehmerStatus(purCustomer.id, 'failed', {
          migrierteDokumente: 0,
          fehler: mapping.probleme.length,
          probleme: mapping.probleme,
        });
        return;
      }

      const zeitstempel = this.firestoreDbService.createServerTimestamp();
      await this.firestoreDbService.updateDocument(zielPfad, {
        ...mapping.daten,
        ...(!vorhandenerUnternehmer ? { erstelltAm: zeitstempel } : {}),
        aktualisiertAm: zeitstempel,
      });
      await this.saveUnternehmerStatus(purCustomer.id, 'completed', {
        migrierteDokumente: 1,
        fehler: 0,
        probleme: [],
        abgeschlossen: true,
      });
    } catch (error: unknown) {
      await this.saveUnternehmerStatus(purCustomer.id, 'failed', {
        migrierteDokumente: 0,
        fehler: 1,
        probleme: [
          {
            typ: 'fehler',
            quellPfad,
            zielPfad,
            ursache: 'Die Unternehmermigration ist technisch fehlgeschlagen.',
          },
        ],
      });
      throw error;
    }
  }

  /**
   * Migriert alle Legacy-Firmen eines ausgewählten Kunden unter dessen Ziel-Unternehmer.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden.
   * @returns Ein Promise, das nach dem Speichern des abschließenden Firmenstatus erfüllt wird.
   * @throws Wenn die Unternehmermigration fehlt oder ein technischer Fehler auftritt.
   */
  async migrateFirmen(purCustomerId: string): Promise<void> {
    const systemmigration = await this.ensureFirmenMigrationMoeglich(purCustomerId);
    const unternehmerId = systemmigration.unternehmerId;
    const quellPfad = FIRESTORE_COLLECTION_PATHS.purCompanies({ purCustomerId });
    let quellDokumente = 0;
    let migrierteDokumente = 0;
    let fehler = 0;
    const probleme: IDatenmigrationsproblem[] = [];

    try {
      const purCompanies = await this.loadPurCompanies(purCustomerId);
      quellDokumente = purCompanies.length;
      const firmenIds = await this.ensureFirmenIds(
        purCustomerId,
        unternehmerId,
        systemmigration.firmenIds,
        purCompanies,
      );

      await this.saveFirmenStatus(purCustomerId, 'inProgress', quellDokumente, {
        migrierteDokumente,
        fehler,
        probleme,
        gestartet: true,
      });

      for (const purCompany of purCompanies) {
        const purCompanyPfad = FIRESTORE_DOCUMENT_PATHS.purCompany({
          purCustomerId,
          purCompanyId: purCompany.id,
        });
        const zielPfad = FIRESTORE_DOCUMENT_PATHS.firma(unternehmerId, firmenIds[purCompany.id]);
        try {
          const vorhandeneFirma = await this.firestoreDbService.loadDocument<
            Record<string, unknown>
          >(zielPfad, 'networkOnly');
          const nummer = await this.getFirmaNummer(
            unternehmerId,
            purCompany.daten.companyNumber,
            vorhandeneFirma?.daten,
          );
          const mapping = mapPurCompanyToFirma(purCustomerId, purCompany, nummer);
          if (!mapping.daten) {
            fehler += mapping.probleme.length;
            probleme.push(...mapping.probleme);
            continue;
          }

          const zeitstempel = this.firestoreDbService.createServerTimestamp();
          await this.firestoreDbService.updateDocument(zielPfad, {
            ...mapping.daten,
            ...(!vorhandeneFirma ? { erstelltAm: zeitstempel } : {}),
            aktualisiertAm: zeitstempel,
          });
          migrierteDokumente += 1;
        } catch {
          fehler += 1;
          probleme.push({
            typ: 'fehler',
            quellPfad: purCompanyPfad,
            zielPfad,
            ursache: 'Das Firmendokument konnte technisch nicht migriert werden.',
          });
        }
      }

      const status: TDatenmigrationsstatus = fehler ? 'failed' : 'completed';
      await this.saveFirmenStatus(purCustomerId, status, quellDokumente, {
        migrierteDokumente,
        fehler,
        probleme,
        abgeschlossen: status === 'completed',
      });
    } catch (error: unknown) {
      fehler += 1;
      probleme.push({
        typ: 'fehler',
        quellPfad,
        ursache: 'Die Firmenmigration ist technisch fehlgeschlagen.',
      });
      await this.saveFirmenStatus(purCustomerId, 'failed', quellDokumente, {
        migrierteDokumente,
        fehler,
        probleme,
      });
      throw error;
    }
  }

  /**
   * Migriert alle Legacy-Filialen eines ausgewählten Kunden in ihre bereits migrierten Firmen.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden.
   * @returns Ein Promise, das nach dem Speichern des abschließenden Filialstatus erfüllt wird.
   * @throws Wenn die Firmenmigration fehlt oder ein technischer Fehler auftritt.
   */
  async migrateFilialen(purCustomerId: string): Promise<void> {
    const systemmigration = await this.ensureFilialenMigrationMoeglich(purCustomerId);
    const unternehmerId = systemmigration.unternehmerId;
    const quellPfad = FIRESTORE_COLLECTION_PATHS.purCompanies({ purCustomerId });
    let quellDokumente = 0;
    let migrierteDokumente = 0;
    let fehler = 0;
    const probleme: IDatenmigrationsproblem[] = [];

    try {
      const purBranches = await this.loadPurBranches(purCustomerId);
      quellDokumente = purBranches.length;
      const filialenIds = await this.ensureFilialenIds(
        purCustomerId,
        unternehmerId,
        systemmigration.firmenIds,
        systemmigration.filialenIds,
        purBranches,
      );

      await this.saveFilialenStatus(purCustomerId, 'inProgress', quellDokumente, {
        migrierteDokumente,
        fehler,
        probleme,
        gestartet: true,
      });

      for (const purBranch of purBranches) {
        const firmaId = systemmigration.firmenIds?.[purBranch.purCompanyId]?.trim();
        if (!firmaId) {
          fehler += 1;
          probleme.push({
            typ: 'fehler',
            quellPfad: FIRESTORE_DOCUMENT_PATHS.purBranch({
              purCustomerId,
              purCompanyId: purBranch.purCompanyId,
              purBranchId: purBranch.id,
            }),
            ursache: 'Für die Legacy-Firma fehlt die gespeicherte Ziel-ID.',
          });
          continue;
        }
        const filialeId = filialenIds[purBranch.purCompanyId]?.[purBranch.id]?.trim();
        if (!filialeId) {
          fehler += 1;
          probleme.push({
            typ: 'fehler',
            quellPfad: FIRESTORE_DOCUMENT_PATHS.purBranch({
              purCustomerId,
              purCompanyId: purBranch.purCompanyId,
              purBranchId: purBranch.id,
            }),
            ursache: 'Für die Legacy-Filiale fehlt die gespeicherte Ziel-ID.',
          });
          continue;
        }
        const zielPfad = FIRESTORE_DOCUMENT_PATHS.filiale({
          unternehmerId,
          firmaId,
          filialeId,
        });
        const purBranchPfad = FIRESTORE_DOCUMENT_PATHS.purBranch({
          purCustomerId,
          purCompanyId: purBranch.purCompanyId,
          purBranchId: purBranch.id,
        });
        try {
          const vorhandeneFiliale = await this.firestoreDbService.loadDocument<
            Record<string, unknown>
          >(zielPfad, 'networkOnly');
          const nummer = await this.getFilialeNummer(
            unternehmerId,
            firmaId,
            purBranch.daten.branchNumber,
            vorhandeneFiliale?.daten,
          );
          const mapping = mapPurBranchToFiliale(purCustomerId, purBranch, nummer);
          if (!mapping.daten) {
            fehler += mapping.probleme.length;
            probleme.push(...mapping.probleme);
            continue;
          }

          const zeitstempel = this.firestoreDbService.createServerTimestamp();
          await this.firestoreDbService.updateDocument(zielPfad, {
            ...mapping.daten,
            ...(!vorhandeneFiliale ? { erstelltAm: zeitstempel } : {}),
            aktualisiertAm: zeitstempel,
          });
          migrierteDokumente += 1;
        } catch {
          fehler += 1;
          probleme.push({
            typ: 'fehler',
            quellPfad: purBranchPfad,
            zielPfad,
            ursache: 'Das Filialdokument konnte technisch nicht migriert werden.',
          });
        }
      }

      const status: TDatenmigrationsstatus = fehler ? 'failed' : 'completed';
      await this.saveFilialenStatus(purCustomerId, status, quellDokumente, {
        migrierteDokumente,
        fehler,
        probleme,
        abgeschlossen: status === 'completed',
      });
    } catch (error: unknown) {
      fehler += 1;
      probleme.push({
        typ: 'fehler',
        quellPfad,
        ursache: 'Die Filialmigration ist technisch fehlgeschlagen.',
      });
      await this.saveFilialenStatus(purCustomerId, 'failed', quellDokumente, {
        migrierteDokumente,
        fehler,
        probleme,
      });
      throw error;
    }
  }

  /**
   * Migriert alle Legacy-Filialmitarbeiter eines ausgewählten Kunden als Firmenmitarbeiter.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden.
   * @returns Ein Promise, das nach dem Speichern des abschließenden Mitarbeiterstatus erfüllt wird.
   * @throws Wenn die Filialmigration fehlt oder ein technischer Fehler auftritt.
   */
  async migrateMitarbeiter(purCustomerId: string): Promise<void> {
    const systemmigration = await this.ensureMitarbeiterMigrationMoeglich(purCustomerId);
    const unternehmerId = systemmigration.unternehmerId;
    const quellPfad = FIRESTORE_COLLECTION_PATHS.purCompanies({ purCustomerId });
    let quellDokumente = 0;
    let migrierteDokumente = 0;
    let fehler = 0;
    const probleme: IDatenmigrationsproblem[] = [];

    try {
      const purEmployees = await this.loadPurEmployees(purCustomerId);
      quellDokumente = purEmployees.length;
      const mitarbeiterIds = await this.ensureMitarbeiterIds(
        purCustomerId,
        unternehmerId,
        systemmigration.firmenIds,
        systemmigration.filialenIds,
        systemmigration.mitarbeiterIds,
        purEmployees,
      );
      const anzahlQuellenJeZielId = Object.values(mitarbeiterIds)
        .flatMap((filialen) => {
          return Object.values(filialen);
        })
        .flatMap((ids) => {
          return Object.values(ids);
        })
        .reduce<Record<string, number>>((anzahlen, mitarbeiterId) => {
          anzahlen[mitarbeiterId] = (anzahlen[mitarbeiterId] ?? 0) + 1;
          return anzahlen;
        }, {});

      await this.saveMitarbeiterStatus(purCustomerId, 'inProgress', quellDokumente, {
        migrierteDokumente,
        fehler,
        probleme,
        gestartet: true,
      });

      for (const purEmployee of purEmployees) {
        const firmaId = systemmigration.firmenIds?.[purEmployee.purCompanyId]?.trim();
        const filialId =
          systemmigration.filialenIds?.[purEmployee.purCompanyId]?.[
            purEmployee.purBranchId
          ]?.trim();
        const mitarbeiterId =
          mitarbeiterIds[purEmployee.purCompanyId]?.[purEmployee.purBranchId]?.[
            purEmployee.id
          ]?.trim();
        const purEmployeePfad = FIRESTORE_DOCUMENT_PATHS.purEmployee({
          purCustomerId,
          purCompanyId: purEmployee.purCompanyId,
          purBranchId: purEmployee.purBranchId,
          purEmployeeId: purEmployee.id,
        });

        if (!firmaId || !filialId || !mitarbeiterId) {
          fehler += 1;
          probleme.push({
            typ: 'fehler',
            quellPfad: purEmployeePfad,
            ursache: 'Für Firma, Filiale oder Mitarbeiter fehlt die gespeicherte Ziel-ID.',
          });
          continue;
        }

        const zielPfad = FIRESTORE_DOCUMENT_PATHS.mitarbeiter(
          unternehmerId,
          firmaId,
          mitarbeiterId,
        );
        try {
          const vorhandenerMitarbeiter = await this.firestoreDbService.loadDocument<
            Record<string, unknown>
          >(zielPfad, 'networkOnly');
          const mapping = mapPurEmployeeToMitarbeiter(purCustomerId, purEmployee, filialId);
          if (!mapping.daten) {
            fehler += mapping.probleme.length;
            probleme.push(...mapping.probleme);
            continue;
          }

          const zeitstempel = this.firestoreDbService.createServerTimestamp();
          if (vorhandenerMitarbeiter && anzahlQuellenJeZielId[mitarbeiterId] > 1) {
            const vorhandenerEintrag = mapMitarbeiterEintrag(
              unternehmerId,
              firmaId,
              vorhandenerMitarbeiter.id,
              vorhandenerMitarbeiter.daten,
            );
            await this.firestoreDbService.updateDocument(zielPfad, {
              filialIds: [
                ...new Set([...vorhandenerEintrag.filialIds, ...mapping.daten.filialIds]),
              ],
              rollen: [...new Set([...vorhandenerEintrag.rollen, ...mapping.daten.rollen])],
              aktualisiertAm: zeitstempel,
            });
            migrierteDokumente += 1;
            continue;
          }
          await this.firestoreDbService.updateDocument(zielPfad, {
            ...mapping.daten,
            ...(!vorhandenerMitarbeiter ? { erstelltAm: zeitstempel } : {}),
            aktualisiertAm: zeitstempel,
          });
          migrierteDokumente += 1;
        } catch {
          fehler += 1;
          probleme.push({
            typ: 'fehler',
            quellPfad: purEmployeePfad,
            zielPfad,
            ursache: 'Das Mitarbeiterdokument konnte technisch nicht migriert werden.',
          });
        }
      }

      const status: TDatenmigrationsstatus = fehler ? 'failed' : 'completed';
      await this.saveMitarbeiterStatus(purCustomerId, status, quellDokumente, {
        migrierteDokumente,
        fehler,
        probleme,
        abgeschlossen: status === 'completed',
      });
    } catch (error: unknown) {
      fehler += 1;
      probleme.push({
        typ: 'fehler',
        quellPfad,
        ursache: 'Die Mitarbeitermigration ist technisch fehlgeschlagen.',
      });
      await this.saveMitarbeiterStatus(purCustomerId, 'failed', quellDokumente, {
        migrierteDokumente,
        fehler,
        probleme,
      });
      throw error;
    }
  }

  // ===== Interne Helfer =======================

  private async getUnternehmerNummer(
    vorhandenerUnternehmer?: Record<string, unknown>,
  ): Promise<number> {
    const vorhandeneNummer = vorhandenerUnternehmer?.['nummer'];
    if (Number.isInteger(vorhandeneNummer) && Number(vorhandeneNummer) > 0) {
      return Number(vorhandeneNummer);
    }

    const unternehmer = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.unternehmer,
      'networkOnly',
    );
    const nummern = unternehmer
      .map((eintrag) => eintrag.daten['nummer'])
      .filter((nummer): nummer is number => Number.isInteger(nummer) && Number(nummer) > 0);

    return Math.max(0, ...nummern) + 1;
  }

  private async getFirmaNummer(
    unternehmerId: string,
    legacyNummer: unknown,
    vorhandeneFirma?: Record<string, unknown>,
  ): Promise<number> {
    if (Number.isInteger(legacyNummer) && Number(legacyNummer) > 0) {
      return Number(legacyNummer);
    }

    const vorhandeneNummer = vorhandeneFirma?.['nummer'];
    if (Number.isInteger(vorhandeneNummer) && Number(vorhandeneNummer) > 0) {
      return Number(vorhandeneNummer);
    }

    const firmen = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.firmen(unternehmerId),
      'networkOnly',
    );
    const nummern = firmen
      .map((eintrag) => eintrag.daten['nummer'])
      .filter((nummer): nummer is number => Number.isInteger(nummer) && Number(nummer) > 0);

    return Math.max(0, ...nummern) + 1;
  }

  private async getFilialeNummer(
    unternehmerId: string,
    firmaId: string,
    legacyNummer: unknown,
    vorhandeneFiliale?: Record<string, unknown>,
  ): Promise<number> {
    if (Number.isInteger(legacyNummer) && Number(legacyNummer) > 0) {
      return Number(legacyNummer);
    }

    const vorhandeneNummer = vorhandeneFiliale?.['nummer'];
    if (Number.isInteger(vorhandeneNummer) && Number(vorhandeneNummer) > 0) {
      return Number(vorhandeneNummer);
    }

    const filialen = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.filialen(unternehmerId, firmaId),
      'networkOnly',
    );
    const nummern = filialen
      .map((eintrag) => eintrag.daten['nummer'])
      .filter((nummer): nummer is number => Number.isInteger(nummer) && Number(nummer) > 0);

    return Math.max(0, ...nummern) + 1;
  }

  private async ensureSystemmigration(purCustomerId: string): Promise<string> {
    const dokumentPfad = FIRESTORE_DOCUMENT_PATHS.systemmigration(purCustomerId);
    const vorhanden = await this.firestoreDbService.loadDocument<ISystemmigrationDokument>(
      dokumentPfad,
      'networkOnly',
    );
    const gespeicherteUnternehmerId = vorhanden?.daten.unternehmerId;
    const unternehmerId =
      typeof gespeicherteUnternehmerId === 'string' && gespeicherteUnternehmerId.trim()
        ? gespeicherteUnternehmerId.trim()
        : this.firestoreDbService.createDocumentId(FIRESTORE_COLLECTION_PATHS.unternehmer);
    const zeitstempel = this.firestoreDbService.createServerTimestamp();

    await this.firestoreDbService.updateDocument(dokumentPfad, {
      purCustomerId,
      unternehmerId,
      ...(!vorhanden ? { erstelltAm: zeitstempel } : {}),
      aktualisiertAm: zeitstempel,
    });

    return unternehmerId;
  }

  private async ensureFirmenMigrationMoeglich(
    purCustomerId: string,
  ): Promise<ISystemmigrationDokument> {
    const systemmigration = await this.firestoreDbService.loadDocument<ISystemmigrationDokument>(
      FIRESTORE_DOCUMENT_PATHS.systemmigration(purCustomerId),
      'networkOnly',
    );
    const unternehmerStatus =
      await this.firestoreDbService.loadDocument<IDatenbereichMigrationDokument>(
        FIRESTORE_DOCUMENT_PATHS.migrationsDatenbereich(
          purCustomerId,
          DATENMIGRATIONS_BEREICHE.unternehmer,
        ),
        'networkOnly',
      );
    const systemmigrationDaten = systemmigration?.daten;
    const unternehmerId = systemmigrationDaten?.unternehmerId?.trim();
    if (
      !systemmigrationDaten ||
      !unternehmerId ||
      unternehmerStatus?.daten.status !== 'completed'
    ) {
      throw new Error('Die Firmenmigration erfordert eine abgeschlossene Unternehmermigration.');
    }
    return systemmigrationDaten;
  }

  private async ensureFilialenMigrationMoeglich(
    purCustomerId: string,
  ): Promise<ISystemmigrationDokument> {
    const systemmigration = await this.firestoreDbService.loadDocument<ISystemmigrationDokument>(
      FIRESTORE_DOCUMENT_PATHS.systemmigration(purCustomerId),
      'networkOnly',
    );
    const firmenStatus = await this.firestoreDbService.loadDocument<IDatenbereichMigrationDokument>(
      FIRESTORE_DOCUMENT_PATHS.migrationsDatenbereich(
        purCustomerId,
        DATENMIGRATIONS_BEREICHE.firmen,
      ),
      'networkOnly',
    );
    const systemmigrationDaten = systemmigration?.daten;
    const unternehmerId = systemmigrationDaten?.unternehmerId?.trim();
    if (!systemmigrationDaten || !unternehmerId || firmenStatus?.daten.status !== 'completed') {
      throw new Error('Die Filialmigration erfordert eine abgeschlossene Firmenmigration.');
    }
    return systemmigrationDaten;
  }

  private async ensureMitarbeiterMigrationMoeglich(
    purCustomerId: string,
  ): Promise<ISystemmigrationDokument> {
    const systemmigration = await this.firestoreDbService.loadDocument<ISystemmigrationDokument>(
      FIRESTORE_DOCUMENT_PATHS.systemmigration(purCustomerId),
      'networkOnly',
    );
    const filialenStatus =
      await this.firestoreDbService.loadDocument<IDatenbereichMigrationDokument>(
        FIRESTORE_DOCUMENT_PATHS.migrationsDatenbereich(
          purCustomerId,
          DATENMIGRATIONS_BEREICHE.filialen,
        ),
        'networkOnly',
      );
    const systemmigrationDaten = systemmigration?.daten;
    const unternehmerId = systemmigrationDaten?.unternehmerId?.trim();
    if (!systemmigrationDaten || !unternehmerId || filialenStatus?.daten.status !== 'completed') {
      throw new Error('Die Mitarbeitermigration erfordert eine abgeschlossene Filialmigration.');
    }
    return systemmigrationDaten;
  }

  private async ensureFirmenIds(
    purCustomerId: string,
    unternehmerId: string,
    gespeicherteFirmenIds: Readonly<Record<string, string>> | undefined,
    purCompanies: readonly IPurCompanyEintrag[],
  ): Promise<Readonly<Record<string, string>>> {
    const firmenIds = { ...gespeicherteFirmenIds };
    let aktualisiert = false;

    for (const purCompany of purCompanies) {
      if (typeof firmenIds[purCompany.id] === 'string' && firmenIds[purCompany.id].trim()) {
        continue;
      }
      firmenIds[purCompany.id] = this.firestoreDbService.createDocumentId(
        FIRESTORE_COLLECTION_PATHS.firmen(unternehmerId),
      );
      aktualisiert = true;
    }

    if (aktualisiert) {
      await this.firestoreDbService.updateDocument(
        FIRESTORE_DOCUMENT_PATHS.systemmigration(purCustomerId),
        {
          firmenIds,
          aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        },
      );
    }
    return firmenIds;
  }

  private async ensureFilialenIds(
    purCustomerId: string,
    unternehmerId: string,
    firmenIds: Readonly<Record<string, string>> | undefined,
    gespeicherteFilialenIds: Readonly<Record<string, Readonly<Record<string, string>>>> | undefined,
    purBranches: readonly IPurBranchEintrag[],
  ): Promise<Readonly<Record<string, Readonly<Record<string, string>>>>> {
    const filialenIds = Object.fromEntries(
      Object.entries(gespeicherteFilialenIds ?? {}).map(([purCompanyId, ids]) => {
        return [purCompanyId, { ...ids }];
      }),
    );
    let aktualisiert = false;

    for (const purBranch of purBranches) {
      const firmaId = firmenIds?.[purBranch.purCompanyId]?.trim();
      if (!firmaId) continue;

      const firmaFilialenIds = filialenIds[purBranch.purCompanyId] ?? {};
      if (
        typeof firmaFilialenIds[purBranch.id] === 'string' &&
        firmaFilialenIds[purBranch.id].trim()
      ) {
        continue;
      }
      filialenIds[purBranch.purCompanyId] = {
        ...firmaFilialenIds,
        [purBranch.id]: this.firestoreDbService.createDocumentId(
          FIRESTORE_COLLECTION_PATHS.filialen(unternehmerId, firmaId),
        ),
      };
      aktualisiert = true;
    }

    if (aktualisiert) {
      await this.firestoreDbService.updateDocument(
        FIRESTORE_DOCUMENT_PATHS.systemmigration(purCustomerId),
        {
          filialenIds,
          aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        },
      );
    }
    return filialenIds;
  }

  private async ensureMitarbeiterIds(
    purCustomerId: string,
    unternehmerId: string,
    firmenIds: Readonly<Record<string, string>> | undefined,
    filialenIds: Readonly<Record<string, Readonly<Record<string, string>>>> | undefined,
    gespeicherteMitarbeiterIds: ISystemmigrationDokument['mitarbeiterIds'],
    purEmployees: readonly IPurEmployeeEintrag[],
  ): Promise<NonNullable<ISystemmigrationDokument['mitarbeiterIds']>> {
    const mitarbeiterIds = Object.fromEntries(
      Object.entries(gespeicherteMitarbeiterIds ?? {}).map(([purCompanyId, filialen]) => {
        return [
          purCompanyId,
          Object.fromEntries(
            Object.entries(filialen).map(([purBranchId, ids]) => {
              return [purBranchId, { ...ids }];
            }),
          ),
        ];
      }),
    );
    let aktualisiert = false;

    for (const purEmployee of purEmployees) {
      const firmaId = firmenIds?.[purEmployee.purCompanyId]?.trim();
      const filialId = filialenIds?.[purEmployee.purCompanyId]?.[purEmployee.purBranchId]?.trim();
      if (!firmaId || !filialId) continue;

      const firmaMitarbeiterIds = mitarbeiterIds[purEmployee.purCompanyId] ?? {};
      const filialMitarbeiterIds = firmaMitarbeiterIds[purEmployee.purBranchId] ?? {};
      if (
        typeof filialMitarbeiterIds[purEmployee.id] === 'string' &&
        filialMitarbeiterIds[purEmployee.id].trim()
      ) {
        continue;
      }
      mitarbeiterIds[purEmployee.purCompanyId] = {
        ...firmaMitarbeiterIds,
        [purEmployee.purBranchId]: {
          ...filialMitarbeiterIds,
          [purEmployee.id]: this.firestoreDbService.createDocumentId(
            FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firmaId),
          ),
        },
      };
      aktualisiert = true;
    }

    if (aktualisiert) {
      await this.firestoreDbService.updateDocument(
        FIRESTORE_DOCUMENT_PATHS.systemmigration(purCustomerId),
        {
          mitarbeiterIds,
          aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        },
      );
    }
    return mitarbeiterIds;
  }

  private async getZielUnternehmerId(purCustomerId: string): Promise<string | null> {
    const systemmigration = await this.firestoreDbService.loadDocument<ISystemmigrationDokument>(
      FIRESTORE_DOCUMENT_PATHS.systemmigration(purCustomerId),
      'networkOnly',
    );
    const unternehmerId = systemmigration?.daten.unternehmerId;
    return typeof unternehmerId === 'string' && unternehmerId.trim() ? unternehmerId.trim() : null;
  }

  private async saveUnternehmerStatus(
    purCustomerId: string,
    status: TDatenmigrationsstatus,
    ergebnis: {
      migrierteDokumente: number;
      fehler: number;
      probleme: IDatenmigrationsproblem[];
      gestartet?: boolean;
      abgeschlossen?: boolean;
    },
  ): Promise<void> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.migrationsDatenbereich(
        purCustomerId,
        DATENMIGRATIONS_BEREICHE.unternehmer,
      ),
      {
        datenbereich: 'unternehmer',
        version: 1,
        status,
        quellDokumente: 1,
        migrierteDokumente: ergebnis.migrierteDokumente,
        fehler: ergebnis.fehler,
        probleme: ergebnis.probleme,
        ...(ergebnis.gestartet ? { gestartetAm: zeitstempel } : {}),
        abgeschlossenAm: ergebnis.abgeschlossen ? zeitstempel : null,
        aktualisiertAm: zeitstempel,
      },
    );
  }

  private async saveFirmenStatus(
    purCustomerId: string,
    status: TDatenmigrationsstatus,
    quellDokumente: number,
    ergebnis: {
      migrierteDokumente: number;
      fehler: number;
      probleme: IDatenmigrationsproblem[];
      gestartet?: boolean;
      abgeschlossen?: boolean;
    },
  ): Promise<void> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.migrationsDatenbereich(
        purCustomerId,
        DATENMIGRATIONS_BEREICHE.firmen,
      ),
      {
        datenbereich: 'firmen',
        version: 1,
        status,
        quellDokumente,
        migrierteDokumente: ergebnis.migrierteDokumente,
        fehler: ergebnis.fehler,
        probleme: ergebnis.probleme,
        ...(ergebnis.gestartet ? { gestartetAm: zeitstempel } : {}),
        abgeschlossenAm: ergebnis.abgeschlossen ? zeitstempel : null,
        aktualisiertAm: zeitstempel,
      },
    );
  }

  private async saveFilialenStatus(
    purCustomerId: string,
    status: TDatenmigrationsstatus,
    quellDokumente: number,
    ergebnis: {
      migrierteDokumente: number;
      fehler: number;
      probleme: IDatenmigrationsproblem[];
      gestartet?: boolean;
      abgeschlossen?: boolean;
    },
  ): Promise<void> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.migrationsDatenbereich(
        purCustomerId,
        DATENMIGRATIONS_BEREICHE.filialen,
      ),
      {
        datenbereich: 'filialen',
        version: 1,
        status,
        quellDokumente,
        migrierteDokumente: ergebnis.migrierteDokumente,
        fehler: ergebnis.fehler,
        probleme: ergebnis.probleme,
        ...(ergebnis.gestartet ? { gestartetAm: zeitstempel } : {}),
        abgeschlossenAm: ergebnis.abgeschlossen ? zeitstempel : null,
        aktualisiertAm: zeitstempel,
      },
    );
  }

  private async saveMitarbeiterStatus(
    purCustomerId: string,
    status: TDatenmigrationsstatus,
    quellDokumente: number,
    ergebnis: {
      migrierteDokumente: number;
      fehler: number;
      probleme: IDatenmigrationsproblem[];
      gestartet?: boolean;
      abgeschlossen?: boolean;
    },
  ): Promise<void> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.migrationsDatenbereich(
        purCustomerId,
        DATENMIGRATIONS_BEREICHE.mitarbeiter,
      ),
      {
        datenbereich: 'mitarbeiter',
        version: 1,
        status,
        quellDokumente,
        migrierteDokumente: ergebnis.migrierteDokumente,
        fehler: ergebnis.fehler,
        probleme: ergebnis.probleme,
        ...(ergebnis.gestartet ? { gestartetAm: zeitstempel } : {}),
        abgeschlossenAm: ergebnis.abgeschlossen ? zeitstempel : null,
        aktualisiertAm: zeitstempel,
      },
    );
  }
}
