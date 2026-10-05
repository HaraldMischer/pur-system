// pur-system/src/app/services/domain/firma.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import { mapFirmaEintrag } from '../../commons/mapper/domain/firma-dokument.mapper';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  IFirmaAnlage,
  IFirmaAnlageErgebnis,
  IFirmaAktualisierung,
  IFirmaEintrag,
} from '../../commons/models/domain/firma';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { StrukturVerwaltungService } from '../firebase/struktur-verwaltung.service';

@Injectable({ providedIn: 'root' })
export class FirmaService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);
  private readonly strukturVerwaltungService = inject(StrukturVerwaltungService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Firmen eines Unternehmers und bildet sie als sortierte Domäneneinträge ab.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Die nach Anzeigename sortierten Firmen.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFirmen(
    unternehmerId: string,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IFirmaEintrag[]> {
    const dokumente = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.firmen(unternehmerId),
      strategie,
    );

    return dokumente
      .map((dokument) => mapFirmaEintrag(dokument.id, dokument.daten))
      .sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
  }

  /**
   * Lädt eine Firma gezielt über ihren vollständigen Dokumentpfad.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der Firma.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Der kompakte Firmeneintrag oder `null`, wenn das Dokument nicht existiert.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFirmaEintrag(
    unternehmerId: string,
    firmaId: string,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IFirmaEintrag | null> {
    const dokument = await this.firestoreDbService.loadDocument<Record<string, unknown>>(
      FIRESTORE_DOCUMENT_PATHS.firma(unternehmerId, firmaId),
      strategie,
    );

    return dokument ? mapFirmaEintrag(dokument.id, dokument.daten) : null;
  }

  /**
   * Legt eine Firma mit der übergebenen fortlaufenden Nummer unter einem Unternehmer an.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param anlage - Die Anzeige-, Adress- und Kontaktdaten der neuen Firma.
   * @param nummer - Die für die Firma ermittelte fortlaufende Nummer.
   * @returns Das Anlageergebnis mit Dokument-ID, Nummer und Anzeigename.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async createFirma(
    unternehmerId: string,
    anlage: IFirmaAnlage,
    nummer: number,
  ): Promise<IFirmaAnlageErgebnis> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const id = await this.firestoreDbService.createDocument(
      FIRESTORE_COLLECTION_PATHS.firmen(unternehmerId),
      {
        ...anlage,
        nummer,
        aktiv: true,
        erstelltAm: zeitstempel,
        aktualisiertAm: zeitstempel,
      },
    );

    return {
      id,
      nummer,
      anzeigename: anlage.anzeigename,
    };
  }

  /**
   * Aktualisiert die bearbeitbaren Stammdaten einer Firma.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der zu aktualisierenden Firma.
   * @param aktualisierung - Die bearbeitbaren Anzeige-, Adress- und Kontaktdaten.
   * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async updateFirma(
    unternehmerId: string,
    firmaId: string,
    aktualisierung: IFirmaAktualisierung,
  ): Promise<void> {
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.firma(unternehmerId, firmaId),
      {
        ...aktualisierung,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
      },
    );
  }

  /**
   * Löscht eine unreferenzierte Firma einschließlich ihrer untergeordneten Daten.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der zu löschenden Firma.
   * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
   * @throws Gibt Fehler der geschützten Strukturlöschung weiter.
   */
  async deleteFirma(unternehmerId: string, firmaId: string): Promise<void> {
    await this.strukturVerwaltungService.deleteStruktureintrag({
      typ: 'firma',
      unternehmerId,
      firmaId,
    });
  }
}
