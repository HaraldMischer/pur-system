// pur-system/src/app/services/domain/unternehmer.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import {
  IUnternehmerAnlage,
  IUnternehmerAnlageErgebnis,
  IUnternehmerEintrag,
} from '../../commons/models/domain/unternehmer';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { StrukturVerwaltungService } from '../firebase/struktur-verwaltung.service';

// ===== Top-Level Helper =====================

function mapUnternehmerEintrag(id: string, daten: Record<string, unknown>): IUnternehmerEintrag {
  const anzeigename = daten['anzeigename'];
  const nummer = daten['nummer'];

  return {
    id,
    anzeigename: typeof anzeigename === 'string' && anzeigename.trim() ? anzeigename.trim() : id,
    nummer: Number.isInteger(nummer) && Number(nummer) > 0 ? Number(nummer) : 0,
  };
}

@Injectable({ providedIn: 'root' })
export class UnternehmerService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);
  private readonly strukturVerwaltungService = inject(StrukturVerwaltungService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Unternehmer und bildet sie als sortierte Domäneneinträge ab.
   *
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Die nach Anzeigename sortierten Unternehmer.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadUnternehmer(
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IUnternehmerEintrag[]> {
    const dokumente = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.unternehmer,
      strategie,
    );

    return dokumente
      .map((dokument) => mapUnternehmerEintrag(dokument.id, dokument.daten))
      .sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
  }

  /**
   * Lädt einen Unternehmer gezielt über seine Dokument-ID.
   *
   * @param unternehmerId - Die Dokument-ID des Unternehmers.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Der kompakte Unternehmereintrag oder `null`, wenn das Dokument nicht existiert.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadUnternehmerEintrag(
    unternehmerId: string,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IUnternehmerEintrag | null> {
    const dokument = await this.firestoreDbService.loadDocument<Record<string, unknown>>(
      FIRESTORE_DOCUMENT_PATHS.unternehmer(unternehmerId),
      strategie,
    );

    return dokument ? mapUnternehmerEintrag(dokument.id, dokument.daten) : null;
  }

  /**
   * Legt einen Unternehmer mit der übergebenen fortlaufenden Nummer an.
   *
   * @param anlage - Die Person- und Anzeigedaten des neuen Unternehmers.
   * @param nummer - Die für den Unternehmer ermittelte fortlaufende Nummer.
   * @returns Das Anlageergebnis mit Dokument-ID, Nummer und Anzeigename.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async createUnternehmer(
    anlage: IUnternehmerAnlage,
    nummer: number,
  ): Promise<IUnternehmerAnlageErgebnis> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const id = await this.firestoreDbService.createDocument(
      FIRESTORE_COLLECTION_PATHS.unternehmer,
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
   * Löscht einen unreferenzierten Unternehmer einschließlich seiner untergeordneten Daten.
   *
   * @param unternehmerId - Die Dokument-ID des zu löschenden Unternehmers.
   * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
   * @throws Gibt Fehler der geschützten Strukturlöschung weiter.
   */
  async deleteUnternehmer(unternehmerId: string): Promise<void> {
    await this.strukturVerwaltungService.deleteStruktureintrag({
      typ: 'unternehmer',
      unternehmerId,
    });
  }
}
