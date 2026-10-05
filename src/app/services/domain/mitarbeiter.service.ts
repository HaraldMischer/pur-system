// pur-system/src/app/services/domain/mitarbeiter.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { ISystemmigrationDokument } from '../../commons/models/domain/datenmigration';
import {
  IMitarbeiterAktualisierung,
  IMitarbeiterAnlage,
  IMitarbeiterAnlageErgebnis,
  IMitarbeiterEintrag,
} from '../../commons/models/domain/mitarbeiter';
import { removeMitarbeiterIdZuordnung } from '../../commons/utils/datenmigration/mitarbeiter-id-zuordnung';
import {
  createAnzeigename,
  createMitarbeiterPerson,
  mapMitarbeiterEintrag,
  sortMitarbeiter,
} from '../../commons/utils/mitarbeiter/mitarbeiter-dokument';
import { FirestoreDbService } from '../firebase/firestore-db.service';

@Injectable({ providedIn: 'root' })
export class MitarbeiterService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Mitarbeiter einer Firma und bildet sie als sortierte Domäneneinträge ab.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialId - Optionale Filial-ID zur Begrenzung eines Filialkontos.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Die nach Nachname und Vorname sortierten Mitarbeiter.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    filialId?: string,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IMitarbeiterEintrag[]> {
    const collectionPath = FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firmaId);
    const dokumente = filialId
      ? await this.firestoreDbService.loadCollectionByArrayValue<Record<string, unknown>>(
          collectionPath,
          'filialIds',
          filialId,
          strategie,
        )
      : await this.firestoreDbService.loadCollection<Record<string, unknown>>(
          collectionPath,
          strategie,
        );

    return sortMitarbeiter(
      dokumente.map((dokument) => {
        return mapMitarbeiterEintrag(unternehmerId, firmaId, dokument.id, dokument.daten);
      }),
    );
  }

  /**
   * Lädt die eindeutige Mitarbeitermenge mehrerer Filialen einer Firma.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialIds - Filial-IDs, denen mindestens eine Mitarbeiterzuordnung entsprechen muss.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Die nach Nachname und Vorname sortierten Mitarbeiter ohne Mehrfachtreffer.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadMitarbeiterNachFilialen(
    unternehmerId: string,
    firmaId: string,
    filialIds: readonly string[],
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IMitarbeiterEintrag[]> {
    const eindeutigeFilialIds = [...new Set(filialIds)];
    if (eindeutigeFilialIds.length === 0) {
      return [];
    }

    const dokumente = await this.firestoreDbService.loadCollectionByAnyArrayValue<
      Record<string, unknown>
    >(
      FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firmaId),
      'filialIds',
      eindeutigeFilialIds,
      strategie,
    );

    return sortMitarbeiter(
      dokumente.map((dokument) => {
        return mapMitarbeiterEintrag(unternehmerId, firmaId, dokument.id, dokument.daten);
      }),
    );
  }

  /**
   * Lädt einen Mitarbeiter gezielt über seine Dokument-ID.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param mitarbeiterId - Die Dokument-ID des Mitarbeiters.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Der Mitarbeiter oder `null`, wenn das Dokument nicht existiert.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadMitarbeiterEintrag(
    unternehmerId: string,
    firmaId: string,
    mitarbeiterId: string,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IMitarbeiterEintrag | null> {
    const dokument = await this.firestoreDbService.loadDocument<Record<string, unknown>>(
      FIRESTORE_DOCUMENT_PATHS.mitarbeiter(unternehmerId, firmaId, mitarbeiterId),
      strategie,
    );

    return dokument
      ? mapMitarbeiterEintrag(unternehmerId, firmaId, dokument.id, dokument.daten)
      : null;
  }

  /**
   * Legt einen aktiven Mitarbeiter unter einer Firma an.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param anlage - Personen-, Rollen- und Filialdaten des neuen Mitarbeiters.
   * @returns Das Anlageergebnis mit der erzeugten Dokument-ID.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async createMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    anlage: IMitarbeiterAnlage,
  ): Promise<IMitarbeiterAnlageErgebnis> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const id = await this.firestoreDbService.createDocument(
      FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firmaId),
      {
        ...anlage,
        person: createMitarbeiterPerson(anlage.person),
        anzeigename: createAnzeigename(anlage.person),
        aktiv: true,
        erstelltAm: zeitstempel,
        aktualisiertAm: zeitstempel,
      },
    );

    return { id };
  }

  /**
   * Aktualisiert die bearbeitbaren Daten eines Mitarbeiters.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param mitarbeiterId - Die Dokument-ID des Mitarbeiters.
   * @param aktualisierung - Die bearbeitbaren Personen-, Rollen-, Filial- und Statusdaten.
   * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async updateMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    mitarbeiterId: string,
    aktualisierung: IMitarbeiterAktualisierung,
  ): Promise<void> {
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.mitarbeiter(unternehmerId, firmaId, mitarbeiterId),
      {
        ...aktualisierung,
        person: createMitarbeiterPerson(aktualisierung.person),
        anzeigename: createAnzeigename(aktualisierung.person),
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
      },
    );
  }

  /**
   * Löscht einen nicht mit einem Benutzerkonto verknüpften Mitarbeiter und seine Migrationszuordnungen.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param mitarbeiterId - Die Dokument-ID des Mitarbeiters.
   * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async deleteMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    mitarbeiterId: string,
  ): Promise<void> {
    const systemmigrationen =
      await this.firestoreDbService.loadCollection<ISystemmigrationDokument>(
        FIRESTORE_COLLECTION_PATHS.systemMigrationen,
        'networkOnly',
      );
    const zuordnungsUpdates = systemmigrationen.flatMap((dokument) => {
      if (dokument.daten.unternehmerId !== unternehmerId) return [];
      const mitarbeiterIds = removeMitarbeiterIdZuordnung(dokument.daten, firmaId, mitarbeiterId);
      return mitarbeiterIds ? [{ purCustomerId: dokument.id, mitarbeiterIds }] : [];
    });

    await this.firestoreDbService.deleteDocument(
      FIRESTORE_DOCUMENT_PATHS.mitarbeiter(unternehmerId, firmaId, mitarbeiterId),
    );
    for (const update of zuordnungsUpdates) {
      await this.firestoreDbService.replaceDocumentFields(
        FIRESTORE_DOCUMENT_PATHS.systemmigration(update.purCustomerId),
        {
          mitarbeiterIds: update.mitarbeiterIds,
          aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        },
      );
    }
  }
}
