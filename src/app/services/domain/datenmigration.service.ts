// pur-system/src/app/services/domain/datenmigration.service.ts

import { Injectable, inject } from '@angular/core';

import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import {
  entsprichtUnternehmerMigration,
  mapPurCustomerToUnternehmer,
} from '../../commons/mapper/datenmigration/pur-customer-unternehmer.mapper';
import {
  DATENMIGRATIONS_BEREICHE,
  IDatenbereichMigrationDokument,
  IDatenmigrationsproblem,
  ISystemmigrationDokument,
  TDatenmigrationsbereich,
  TDatenmigrationsstatus,
  TDatenmigrationsstatusMap,
} from '../../commons/models/domain/datenmigration';
import {
  IPurCustomerDokument,
  IPurCustomerEintrag,
} from '../../commons/models/legacy/pur-customer';
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
   * Migriert genau einen ausgewählten Legacy-Kunden zum Unternehmer.
   *
   * @param purCustomer - Ausgewählter Legacy-Kunde einschließlich unveränderter Quelldaten.
   * @returns Ein Promise, das nach dem Speichern des abschließenden Status erfüllt wird.
   * @throws Gibt technische Fehler nach dem bestmöglichen Speichern eines Fehlerstatus weiter.
   */
  async migrateUnternehmer(purCustomer: IPurCustomerEintrag): Promise<void> {
    const quellPfad = FIRESTORE_DOCUMENT_PATHS.purCustomer(purCustomer.id);
    const unternehmerId = await this.ensureSystemmigration(purCustomer.id);
    const zielPfad = FIRESTORE_DOCUMENT_PATHS.unternehmer(unternehmerId);
    await this.saveUnternehmerStatus(purCustomer.id, 'inProgress', {
      migrierteDokumente: 0,
      bereitsMigrierteDokumente: 0,
      konflikte: 0,
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
          bereitsMigrierteDokumente: 0,
          konflikte: 0,
          fehler: mapping.probleme.length,
          probleme: mapping.probleme,
        });
        return;
      }

      if (vorhandenerUnternehmer) {
        if (entsprichtUnternehmerMigration(vorhandenerUnternehmer.daten, mapping.daten)) {
          await this.saveUnternehmerStatus(purCustomer.id, 'completed', {
            migrierteDokumente: 0,
            bereitsMigrierteDokumente: 1,
            konflikte: 0,
            fehler: 0,
            probleme: [],
            abgeschlossen: true,
          });
          return;
        }

        await this.saveUnternehmerStatus(purCustomer.id, 'conflict', {
          migrierteDokumente: 0,
          bereitsMigrierteDokumente: 0,
          konflikte: 1,
          fehler: 0,
          probleme: [
            {
              typ: 'konflikt',
              quellPfad,
              zielPfad,
              ursache: 'Der vorhandene Unternehmer weicht vom Migrationsergebnis ab.',
            },
          ],
        });
        return;
      }

      const zeitstempel = this.firestoreDbService.createServerTimestamp();
      await this.firestoreDbService.updateDocument(zielPfad, {
        ...mapping.daten,
        erstelltAm: zeitstempel,
        aktualisiertAm: zeitstempel,
      });
      await this.saveUnternehmerStatus(purCustomer.id, 'completed', {
        migrierteDokumente: 1,
        bereitsMigrierteDokumente: 0,
        konflikte: 0,
        fehler: 0,
        probleme: [],
        abgeschlossen: true,
      });
    } catch (error: unknown) {
      await this.saveUnternehmerStatus(purCustomer.id, 'failed', {
        migrierteDokumente: 0,
        bereitsMigrierteDokumente: 0,
        konflikte: 0,
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

  private async saveUnternehmerStatus(
    purCustomerId: string,
    status: TDatenmigrationsstatus,
    ergebnis: {
      migrierteDokumente: number;
      bereitsMigrierteDokumente: number;
      konflikte: number;
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
        bereitsMigrierteDokumente: ergebnis.bereitsMigrierteDokumente,
        konflikte: ergebnis.konflikte,
        fehler: ergebnis.fehler,
        probleme: ergebnis.probleme,
        ...(ergebnis.gestartet ? { gestartetAm: zeitstempel } : {}),
        abgeschlossenAm: ergebnis.abgeschlossen ? zeitstempel : null,
        aktualisiertAm: zeitstempel,
      },
    );
  }
}
