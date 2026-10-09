// pur-system/src/app/services/domain/schichtvorlage.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  ISchichtvorlageAktualisierung,
  ISchichtvorlageAnlage,
  ISchichtvorlageDokument,
  ISchichtvorlageEintrag,
} from '../../commons/models/domain/schichtvorlage';
import { FirestoreDbService } from '../firebase/firestore-db.service';

// ===== Top-Level Helper =====================

function mapSchichtvorlage(
  pfad: IFilialPfad,
  id: string,
  dokument: ISchichtvorlageDokument,
): ISchichtvorlageEintrag {
  return { ...dokument, ...pfad, id };
}

function normalizeSchichtvorlageAnlage(anlage: ISchichtvorlageAnlage): ISchichtvorlageAnlage {
  const standardpauseMinuten = anlage.standardpauseMinuten;
  return {
    bezeichnung: anlage.bezeichnung.trim(),
    beginnLokalzeit: anlage.beginnLokalzeit,
    endeLokalzeit: anlage.endeLokalzeit,
    endetAmFolgetag: anlage.endetAmFolgetag,
    ...(standardpauseMinuten === undefined ? {} : { standardpauseMinuten }),
  };
}

function sortSchichtvorlagen(a: ISchichtvorlageEintrag, b: ISchichtvorlageEintrag): number {
  return (
    a.beginnLokalzeit.localeCompare(b.beginnLokalzeit) ||
    a.bezeichnung.localeCompare(b.bezeichnung, 'de')
  );
}

@Injectable({ providedIn: 'root' })
export class SchichtvorlageService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle aktiven und inaktiven Schichtvorlagen einer Filiale.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Nach Lokalzeit und Bezeichnung sortierte Schichtvorlagen.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadSchichtvorlagen(
    pfad: IFilialPfad,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
  ): Promise<ISchichtvorlageEintrag[]> {
    const dokumente = await this.firestoreDbService.loadCollection<ISchichtvorlageDokument>(
      FIRESTORE_COLLECTION_PATHS.schichtvorlagen(pfad),
      strategie,
    );

    return dokumente
      .map((dokument) => {
        return mapSchichtvorlage(pfad, dokument.id, dokument.daten);
      })
      .sort(sortSchichtvorlagen);
  }

  /**
   * Legt eine aktive Schichtvorlage in einer Filiale an.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param anlage - Bezeichnung, Lokalzeiten, Folgetagsangabe und optionale Standardpause.
   * @param benutzerUid - UID des anlegenden Benutzers.
   * @returns Der lokal abbildbare Eintrag der neuen Schichtvorlage.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async createSchichtvorlage(
    pfad: IFilialPfad,
    anlage: ISchichtvorlageAnlage,
    benutzerUid: string,
  ): Promise<ISchichtvorlageEintrag> {
    const normalisierteAnlage = normalizeSchichtvorlageAnlage(anlage);
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const id = await this.firestoreDbService.createDocument(
      FIRESTORE_COLLECTION_PATHS.schichtvorlagen(pfad),
      {
        ...normalisierteAnlage,
        aktiv: true,
        erstelltAm: zeitstempel,
        erstelltVonUid: benutzerUid,
        aktualisiertAm: zeitstempel,
        aktualisiertVonUid: benutzerUid,
      },
    );

    return {
      ...normalisierteAnlage,
      ...pfad,
      id,
      aktiv: true,
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
  }

  /**
   * Aktualisiert die fachlichen Daten und den Aktivstatus einer Schichtvorlage.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param schichtvorlageId - Dokument-ID der Schichtvorlage.
   * @param aktualisierung - Vollständige bearbeitbare Vorlagendaten.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async updateSchichtvorlage(
    pfad: IFilialPfad,
    schichtvorlageId: string,
    aktualisierung: ISchichtvorlageAktualisierung,
    benutzerUid: string,
  ): Promise<void> {
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.schichtvorlage({ ...pfad, schichtvorlageId }),
      {
        ...normalizeSchichtvorlageAnlage(aktualisierung),
        standardpauseMinuten: aktualisierung.standardpauseMinuten ?? 0,
        aktiv: aktualisierung.aktiv,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        aktualisiertVonUid: benutzerUid,
      },
    );
  }

  /**
   * Deaktiviert eine Schichtvorlage, ohne sie physisch zu löschen.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param schichtvorlageId - Dokument-ID der Schichtvorlage.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async deactivateSchichtvorlage(
    pfad: IFilialPfad,
    schichtvorlageId: string,
    benutzerUid: string,
  ): Promise<void> {
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.schichtvorlage({ ...pfad, schichtvorlageId }),
      {
        aktiv: false,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        aktualisiertVonUid: benutzerUid,
      },
    );
  }
}
