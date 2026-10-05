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
import {
  deleteMitarbeiterIdZuordnung,
  replaceMitarbeiterIdZuordnung,
} from '../../commons/utils/datenmigration/mitarbeiter-id-zuordnung';
import {
  createAnzeigename,
  createMitarbeiterPerson,
  mapMitarbeiterEintrag,
  sortMitarbeiter,
} from '../../commons/utils/mitarbeiter/mitarbeiter-dokument';
import { FirestoreDbService, TFirestoreBatchOperation } from '../firebase/firestore-db.service';

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
   * @returns Ein Promise, das nach der atomaren Löschung abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async deleteMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    mitarbeiterId: string,
  ): Promise<void> {
    const dokumentPfad = FIRESTORE_DOCUMENT_PATHS.mitarbeiter(
      unternehmerId,
      firmaId,
      mitarbeiterId,
    );
    const [dokument, systemmigrationen] = await Promise.all([
      this.firestoreDbService.loadDocument<Record<string, unknown>>(dokumentPfad, 'networkOnly'),
      this.firestoreDbService.loadCollection<ISystemmigrationDokument>(
        FIRESTORE_COLLECTION_PATHS.systemMigrationen,
        'networkOnly',
      ),
    ]);
    if (!dokument) {
      throw new Error('Der Mitarbeiter wurde nicht gefunden.');
    }
    if (typeof dokument.daten['benutzerUid'] === 'string') {
      throw new Error(
        'Ein mit einem Benutzerkonto verknüpfter Mitarbeiter kann nicht gelöscht werden.',
      );
    }

    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const operationen: TFirestoreBatchOperation[] = [{ documentPath: dokumentPfad, delete: true }];
    for (const systemmigration of systemmigrationen) {
      if (systemmigration.daten.unternehmerId !== unternehmerId) continue;
      const mitarbeiterIds = deleteMitarbeiterIdZuordnung(
        systemmigration.daten,
        firmaId,
        mitarbeiterId,
      );
      if (!mitarbeiterIds) continue;
      operationen.push({
        documentPath: FIRESTORE_DOCUMENT_PATHS.systemmigration(systemmigration.id),
        daten: { mitarbeiterIds, aktualisiertAm: zeitstempel },
        replaceFields: true,
      });
    }

    await this.firestoreDbService.updateDocumentsAtomically(operationen);
  }

  /**
   * Führt einen doppelten Mitarbeiter in einen bestehenden Zielmitarbeiter derselben Firma über.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param quellMitarbeiterId - Mitarbeiter-ID des zu entfernenden Duplikats.
   * @param zielMitarbeiterId - Mitarbeiter-ID des bestehen bleibenden Mitarbeiters.
   * @returns Ein Promise, das nach der atomaren Zusammenführung abgeschlossen ist.
   * @throws Wenn Mitarbeiter fehlen, unzulässig verknüpft sind oder der Schreibvorgang fehlschlägt.
   */
  async mergeMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    quellMitarbeiterId: string,
    zielMitarbeiterId: string,
  ): Promise<void> {
    if (quellMitarbeiterId === zielMitarbeiterId) {
      throw new Error('Quell- und Zielmitarbeiter müssen unterschiedlich sein.');
    }

    const quellPfad = FIRESTORE_DOCUMENT_PATHS.mitarbeiter(
      unternehmerId,
      firmaId,
      quellMitarbeiterId,
    );
    const zielPfad = FIRESTORE_DOCUMENT_PATHS.mitarbeiter(
      unternehmerId,
      firmaId,
      zielMitarbeiterId,
    );
    const [quelle, ziel, systemmigrationen] = await Promise.all([
      this.firestoreDbService.loadDocument<Record<string, unknown>>(quellPfad, 'networkOnly'),
      this.firestoreDbService.loadDocument<Record<string, unknown>>(zielPfad, 'networkOnly'),
      this.firestoreDbService.loadCollection<ISystemmigrationDokument>(
        FIRESTORE_COLLECTION_PATHS.systemMigrationen,
        'networkOnly',
      ),
    ]);
    if (!quelle || !ziel) {
      throw new Error('Quell- oder Zielmitarbeiter wurde nicht gefunden.');
    }
    if (typeof quelle.daten['benutzerUid'] === 'string') {
      throw new Error(
        'Ein mit einem Benutzerkonto verknüpfter Mitarbeiter kann nicht zusammengeführt werden.',
      );
    }
    const quellEintrag = mapMitarbeiterEintrag(unternehmerId, firmaId, quelle.id, quelle.daten);
    const zielEintrag = mapMitarbeiterEintrag(unternehmerId, firmaId, ziel.id, ziel.daten);
    const filialIds = [...new Set([...zielEintrag.filialIds, ...quellEintrag.filialIds])];
    const rollen = [...new Set([...zielEintrag.rollen, ...quellEintrag.rollen])];
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: zielPfad,
        daten: { filialIds, rollen, aktualisiertAm: zeitstempel },
      },
      {
        documentPath: quellPfad,
        delete: true,
      },
    ];

    for (const dokument of systemmigrationen) {
      if (dokument.daten.unternehmerId !== unternehmerId) continue;
      const mitarbeiterIds = replaceMitarbeiterIdZuordnung(
        dokument.daten,
        firmaId,
        quellMitarbeiterId,
        zielMitarbeiterId,
      );
      if (!mitarbeiterIds) continue;
      operationen.push({
        documentPath: FIRESTORE_DOCUMENT_PATHS.systemmigration(dokument.id),
        daten: { mitarbeiterIds, aktualisiertAm: zeitstempel },
        replaceFields: true,
      });
    }

    await this.firestoreDbService.updateDocumentsAtomically(operationen);
  }
}
