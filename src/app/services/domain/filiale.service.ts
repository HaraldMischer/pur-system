// pur-system/src/app/services/domain/filiale.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import { mapFilialeEintrag } from '../../commons/mapper/domain/filiale-dokument.mapper';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  IFilialeAnlage,
  IFilialeAnlageErgebnis,
  IFilialeAktualisierung,
  IFilialeEintrag,
} from '../../commons/models/domain/filiale';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { StrukturVerwaltungService } from '../firebase/struktur-verwaltung.service';

@Injectable({ providedIn: 'root' })
export class FilialeService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);
  private readonly strukturVerwaltungService = inject(StrukturVerwaltungService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Filialen einer Firma und bildet sie als sortierte Domäneneinträge ab.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Die nach Anzeigename sortierten Filialen.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFilialen(
    unternehmerId: string,
    firmaId: string,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IFilialeEintrag[]> {
    const dokumente = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.filialen(unternehmerId, firmaId),
      strategie,
    );

    return dokumente
      .map((dokument) => mapFilialeEintrag(dokument.id, dokument.daten))
      .sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
  }

  /**
   * Lädt eine Filiale gezielt über ihren vollständigen Dokumentpfad.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialeId - Die Dokument-ID der Filiale.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Der kompakte Filialeintrag oder `null`, wenn das Dokument nicht existiert.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFilialeEintrag(
    unternehmerId: string,
    firmaId: string,
    filialeId: string,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IFilialeEintrag | null> {
    const dokument = await this.firestoreDbService.loadDocument<Record<string, unknown>>(
      FIRESTORE_DOCUMENT_PATHS.filiale(unternehmerId, firmaId, filialeId),
      strategie,
    );

    return dokument ? mapFilialeEintrag(dokument.id, dokument.daten) : null;
  }

  /**
   * Legt eine Filiale mit der übergebenen fortlaufenden Nummer unter einer Firma an.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param anlage - Die Anzeige-, Namens-, Adress- und Kontaktdaten der neuen Filiale.
   * @param nummer - Die für die Filiale ermittelte fortlaufende Nummer.
   * @returns Das Anlageergebnis mit Dokument-ID, Nummer und Anzeigename.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async createFiliale(
    unternehmerId: string,
    firmaId: string,
    anlage: IFilialeAnlage,
    nummer: number,
  ): Promise<IFilialeAnlageErgebnis> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const id = await this.firestoreDbService.createDocument(
      FIRESTORE_COLLECTION_PATHS.filialen(unternehmerId, firmaId),
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
   * Aktualisiert die bearbeitbaren Stammdaten einer Filiale.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialeId - Die Dokument-ID der zu aktualisierenden Filiale.
   * @param aktualisierung - Die bearbeitbaren Anzeige-, Adress- und Kontaktdaten.
   * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async updateFiliale(
    unternehmerId: string,
    firmaId: string,
    filialeId: string,
    aktualisierung: IFilialeAktualisierung,
  ): Promise<void> {
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.filiale(unternehmerId, firmaId, filialeId),
      {
        ...aktualisierung,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
      },
    );
  }

  /**
   * Löscht eine unreferenzierte Filiale einschließlich ihrer untergeordneten Daten.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialId - Die Dokument-ID der zu löschenden Filiale.
   * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
   * @throws Gibt Fehler der geschützten Strukturlöschung weiter.
   */
  async deleteFiliale(unternehmerId: string, firmaId: string, filialId: string): Promise<void> {
    await this.strukturVerwaltungService.deleteStruktureintrag({
      typ: 'filiale',
      unternehmerId,
      firmaId,
      filialId,
    });
  }
}
